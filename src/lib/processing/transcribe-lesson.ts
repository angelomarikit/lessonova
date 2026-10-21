import {
  DEEPINFRA_TEST_LIMITS,
  isDeepInfraConfigured,
  isDeepInfraTestMode,
} from "@/lib/deepinfra/config";
import { isDeepgramConfigured } from "@/lib/deepgram/config";
import { getTranscriptionSettings } from "@/lib/transcription/get-transcription-settings";
import {
  isEligibleForAutomaticFallback,
  TranscriptionError,
} from "@/lib/transcription/errors";
import {
  isProviderConfigured,
  resolveProviderChain,
  runProviderTranscription,
  type TranscriptionRequestMode,
} from "@/lib/transcription/provider-router";
import type { RecordingAssetKind, TranscriptionProviderId } from "@/lib/transcription/types";
import { getAiAnalysisSettings } from "@/lib/anthropic/get-ai-analysis-settings";
import { isAnthropicConfigured } from "@/lib/anthropic/config";
import { resolveAutomaticAnalysisEnabled } from "@/lib/anthropic/resolve-automatic-analysis";
import { generateLessonAiReport } from "@/lib/processing/analyze-lesson-report";
import { createServiceClient } from "@/lib/supabase/service";

function speakerLabelForSource(
  kind: RecordingAssetKind,
  diarizedSpeaker: number | null | undefined,
): string {
  const base =
    kind === "teacher_microphone"
      ? "Teacher"
      : "Classroom audio (student may be included)";
  if (diarizedSpeaker == null) {
    return base;
  }
  return `${base} · unassigned speaker ${diarizedSpeaker + 1}`;
}

export async function transcribeLessonRecording(options: {
  lessonId: string;
  teacherId: string;
  source?: RecordingAssetKind;
  force?: boolean;
  provider?: TranscriptionRequestMode;
  allowFallback?: boolean;
}) {
  const source = options.source ?? "teacher_microphone";
  const settings = await getTranscriptionSettings();
  const allowFallback = Boolean(options.allowFallback);

  const providerChain = resolveProviderChain({
    settings,
    requestedProvider: options.provider,
    allowFallback,
  });

  if (providerChain.length === 0) {
    return {
      ok: false as const,
      code: "provider_not_specified",
      message:
        "Transcription is set to manual provider selection. Choose DeepInfra or Deepgram for this request.",
    };
  }

  if (!providerChain.some((provider) => isProviderConfigured(provider))) {
    return {
      ok: false as const,
      code: "missing_api_key",
      message:
        "No transcription provider is configured. Add DEEPINFRA_API_KEY and/or DEEPGRAM_API_KEY on the server.",
    };
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false as const,
      code: "missing_service_role",
      message: "SUPABASE_SERVICE_ROLE_KEY is required for secure transcription downloads.",
    };
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select(
      "id, teacher_id, student_id, status, recording_duration_seconds, transcription_provider",
    )
    .eq("id", options.lessonId)
    .eq("teacher_id", options.teacherId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return { ok: false as const, code: "lesson_not_found", message: "Lesson not found." };
  }

  const { data: completedJobs } = await supabase
    .from("processing_jobs")
    .select("id, status, metadata")
    .eq("lesson_id", options.lessonId)
    .eq("status", "completed");

  const existingSuccess = (completedJobs ?? []).find((job) => {
    const metadata =
      typeof job.metadata === "object" && job.metadata !== null
        ? (job.metadata as Record<string, unknown>)
        : {};
    return metadata.source === source;
  });

  if (isDeepInfraTestMode() && existingSuccess && !options.force) {
    return {
      ok: false as const,
      code: "test_mode_already_transcribed",
      message:
        "Test mode allows one successful transcription per source. Open the lesson to view the saved transcript.",
    };
  }

  const { data: asset, error: assetError } = await supabase
    .from("recording_assets")
    .select("id, kind, storage_bucket, storage_path, mime_type, byte_size, duration_ms")
    .eq("lesson_id", options.lessonId)
    .eq("kind", source)
    .maybeSingle();

  if (assetError || !asset) {
    return {
      ok: false as const,
      code: "recording_missing",
      message:
        source === "teacher_microphone"
          ? "Teacher microphone recording was not found for this lesson."
          : "Classroom tab recording was not found for this lesson.",
    };
  }

  if (isDeepInfraTestMode()) {
    const durationSeconds =
      asset.duration_ms != null
        ? Math.round(asset.duration_ms / 1000)
        : lesson.recording_duration_seconds;
    if (durationSeconds != null && durationSeconds > DEEPINFRA_TEST_LIMITS.maxDurationSeconds) {
      return {
        ok: false as const,
        code: "test_mode_duration_limit",
        message: `Test mode allows recordings up to ${DEEPINFRA_TEST_LIMITS.maxDurationSeconds} seconds.`,
      };
    }
    if (asset.byte_size != null && asset.byte_size > DEEPINFRA_TEST_LIMITS.maxFileBytes) {
      return {
        ok: false as const,
        code: "test_mode_size_limit",
        message: "Test mode allows audio files up to 10 MB.",
      };
    }
  }

  const { data: runningJob } = await supabase
    .from("processing_jobs")
    .select("id")
    .eq("lesson_id", options.lessonId)
    .eq("status", "running")
    .maybeSingle();

  if (runningJob) {
    return {
      ok: false as const,
      code: "already_running",
      message: "A transcription job is already running for this lesson.",
    };
  }

  const startedAt = Date.now();
  const initialProvider = providerChain[0];

  const { data: job, error: jobInsertError } = await supabase
    .from("processing_jobs")
    .insert({
      lesson_id: options.lessonId,
      teacher_id: options.teacherId,
      status: "running",
      transcription_provider: initialProvider,
      fallback_used: false,
      metadata: {
        source,
        providerChain,
        allowFallback,
        testMode: isDeepInfraTestMode(),
      },
    })
    .select("id")
    .single();

  if (jobInsertError || !job) {
    return {
      ok: false as const,
      code: "job_create_failed",
      message: jobInsertError?.message ?? "Could not create processing job.",
    };
  }

  await supabase
    .from("lessons")
    .update({
      status: "transcribing",
      error_message: null,
      transcription_provider: initialProvider,
    })
    .eq("id", options.lessonId);

  const { data: file, error: downloadError } = await supabase.storage
    .from(asset.storage_bucket)
    .download(asset.storage_path);

  if (downloadError || !file) {
    const message = downloadError?.message ?? "Could not download lesson audio.";
    await failJob(supabase, options.lessonId, job.id, message);
    return { ok: false as const, code: "download_failed", message };
  }

  const audioBuffer = Buffer.from(await file.arrayBuffer());
  const filename = asset.storage_path.split("/").pop() ?? "lesson-audio.webm";
  const mimeType = asset.mime_type ?? file.type ?? "audio/webm";

  if (isDeepInfraTestMode() && audioBuffer.byteLength > DEEPINFRA_TEST_LIMITS.maxFileBytes) {
    const message = "Test mode allows audio files up to 10 MB.";
    await failJob(supabase, options.lessonId, job.id, message);
    return { ok: false as const, code: "test_mode_size_limit", message };
  }

  let lastError: TranscriptionError | null = null;
  let fallbackUsed = false;
  let successResult: Awaited<ReturnType<typeof runProviderTranscription>> | null = null;
  let successProvider: TranscriptionProviderId | null = null;

  for (let index = 0; index < providerChain.length; index += 1) {
    const provider = providerChain[index];
    if (!isProviderConfigured(provider)) {
      lastError = new TranscriptionError(
        provider === "deepinfra"
          ? "DEEPINFRA_API_KEY is not configured on the server."
          : "DEEPGRAM_API_KEY is not configured on the server.",
        {
          code: "missing_api_key",
          status: 503,
          provider,
        },
      );
      continue;
    }

    if (index > 0) {
      fallbackUsed = true;
      await supabase
        .from("processing_jobs")
        .update({
          fallback_used: true,
          transcription_provider: provider,
        })
        .eq("id", job.id);
    }

    try {
      successResult = await runProviderTranscription({
        provider,
        audio: audioBuffer,
        filename,
        mimeType,
        source,
        settings,
      });
      successProvider = provider;
      break;
    } catch (error) {
      const transcriptionError =
        error instanceof TranscriptionError
          ? error
          : new TranscriptionError(
              error instanceof Error ? error.message : "Transcription failed.",
              {
                code: "transcription_failed",
                status: 502,
                provider,
              },
            );
      lastError = transcriptionError;

      await supabase.from("transcription_usage_logs").insert({
        lesson_id: options.lessonId,
        teacher_id: options.teacherId,
        processing_job_id: job.id,
        provider,
        model:
          provider === "deepinfra"
            ? settings.defaultDeepinfraModel
            : settings.defaultDeepgramModel,
        source,
        success: false,
        audio_duration_ms: asset.duration_ms,
        processing_duration_ms: Date.now() - startedAt,
        error_message: transcriptionError.message,
        metadata: {
          code: transcriptionError.code,
          fallbackAttempt: index > 0,
          testMode: isDeepInfraTestMode(),
        },
      });

      const hasNext = index < providerChain.length - 1;
      if (!hasNext || !isEligibleForAutomaticFallback(transcriptionError)) {
        break;
      }
    }
  }

  if (!successResult || !successProvider) {
    const message = lastError?.message ?? "Transcription failed.";
    await failJob(supabase, options.lessonId, job.id, message);
    return {
      ok: false as const,
      code: lastError?.code ?? "transcription_failed",
      message,
      provider: lastError?.provider,
      canRetryWithDeepgram:
        lastError?.provider === "deepinfra" &&
        isDeepgramConfigured() &&
        !fallbackUsed,
      canRetryWithDeepInfra:
        lastError?.provider === "deepgram" && isDeepInfraConfigured(),
    };
  }

  await supabase
    .from("transcript_segments")
    .delete()
    .eq("lesson_id", options.lessonId)
    .eq("source", source);

  const segmentRows =
    successResult.segments.length > 0
      ? successResult.segments.map((segment) => ({
          lesson_id: options.lessonId,
          source,
          speaker_label: speakerLabelForSource(source, segment.diarizedSpeaker),
          started_at_ms: Math.round(segment.start * 1000),
          ended_at_ms: Math.round(segment.end * 1000),
          text: segment.text,
          confidence: segment.confidence ?? null,
        }))
      : [
          {
            lesson_id: options.lessonId,
            source,
            speaker_label: speakerLabelForSource(source, null),
            started_at_ms: 0,
            ended_at_ms: null as number | null,
            text: successResult.text,
            confidence: null as number | null,
          },
        ];

  const { error: segmentError } = await supabase.from("transcript_segments").insert(segmentRows);
  if (segmentError) {
    await failJob(supabase, options.lessonId, job.id, segmentError.message);
    return {
      ok: false as const,
      code: "transcription_failed",
      message: segmentError.message,
    };
  }

  const processingDurationMs = Date.now() - startedAt;
  const audioMinutes =
    (asset.duration_ms ?? (lesson.recording_duration_seconds ?? 0) * 1000) / 60000;

  await supabase
    .from("processing_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      error_message: null,
      transcription_provider: successProvider,
      fallback_used: fallbackUsed,
      metadata: {
        source,
        model: successResult.model,
        provider: successProvider,
        fallbackUsed,
        testMode: isDeepInfraTestMode(),
        language: successResult.language,
        requestId: successResult.requestId,
        estimatedCostUsd: successResult.estimatedCostUsd,
        inferenceRuntimeMs: successResult.inferenceRuntimeMs,
        transcriptPreview: successResult.text.slice(0, 500),
        providerMetadata: successResult.metadata ?? {},
      },
    })
    .eq("id", job.id);

  await supabase
    .from("lessons")
    .update({
      status: "ready_for_review",
      transcription_provider: successProvider,
      transcription_model: successResult.model,
      detected_language: successResult.language,
      processing_duration_ms: processingDurationMs,
      transcription_cost_estimate: successResult.estimatedCostUsd,
      error_message: null,
      completed_at: null,
    })
    .eq("id", options.lessonId);

  await supabase.from("transcription_usage_logs").insert({
    lesson_id: options.lessonId,
    teacher_id: options.teacherId,
    processing_job_id: job.id,
    provider: successProvider,
    model: successResult.model,
    source,
    success: true,
    audio_duration_ms: asset.duration_ms,
    audio_minutes: audioMinutes,
    processing_duration_ms: processingDurationMs,
    estimated_cost_usd: successResult.estimatedCostUsd,
    metadata: {
      language: successResult.language,
      requestId: successResult.requestId,
      fallbackUsed,
      testMode: isDeepInfraTestMode(),
      providerMetadata: successResult.metadata ?? {},
    },
  });

  let analysis:
    | Awaited<ReturnType<typeof generateLessonAiReport>>
    | undefined;

  const aiSettings = await getAiAnalysisSettings();
  if (resolveAutomaticAnalysisEnabled(aiSettings) && isAnthropicConfigured()) {
    analysis = await generateLessonAiReport({
      lessonId: options.lessonId,
      teacherId: options.teacherId,
      confirmTestCost: true,
      automaticAfterTranscription: true,
      forceRegenerate: true,
    });
  }

  return {
    ok: true as const,
    lessonId: options.lessonId,
    jobId: job.id,
    language: successResult.language,
    segmentCount: segmentRows.length,
    transcriptText: successResult.text,
    source,
    provider: successProvider,
    fallbackUsed,
    processingDurationMs,
    estimatedCostUsd: successResult.estimatedCostUsd,
    analysis,
  };
}

async function failJob(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  lessonId: string,
  jobId: string,
  message: string,
) {
  await supabase
    .from("processing_jobs")
    .update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  await supabase
    .from("lessons")
    .update({
      status: "failed",
      error_message: message,
    })
    .eq("id", lessonId);
}
