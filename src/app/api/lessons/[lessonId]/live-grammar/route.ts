import { NextResponse } from "next/server";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import {
  estimateClaudeCostUsd,
  getAnthropicApiKey,
  getAnthropicModel,
  isAnthropicConfigured,
} from "@/lib/anthropic/config";
import { getLiveTranscriptionSettings } from "@/lib/live-transcription/get-live-transcription-settings";
import { createClient } from "@/lib/supabase/server";

const liveGrammarSchema = z.object({
  corrections: z.array(
    z.object({
      utteranceKey: z.string(),
      originalText: z.string(),
      suggestedText: z.string(),
      explanation: z.string(),
      hasIssue: z.boolean(),
    }),
  ),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getLiveTranscriptionSettings();
  if (!settings.liveCorrectionsEnabled) {
    return NextResponse.json({ error: "Live corrections disabled." }, { status: 403 });
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json({ error: "Anthropic not configured." }, { status: 503 });
  }

  const body = (await request.json()) as {
    utterances?: { key: string; text: string }[];
  };
  const utterances = (body.utterances ?? []).filter((u) => u.text.trim().length >= 4);
  if (utterances.length === 0) {
    return NextResponse.json({ ok: true, corrections: [] });
  }

  const { count: priorRequests, error: countError } = await supabase
    .from("lesson_live_grammar_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  if (
    !countError &&
    (priorRequests ?? 0) >= settings.maxLiveCorrectionRequestsPerLesson
  ) {
    return NextResponse.json({ error: "Live correction limit reached for this lesson." }, { status: 429 });
  }

  const model = getAnthropicModel();
  const client = new Anthropic({ apiKey: getAnthropicApiKey() });

  try {
    const message = await client.messages.parse({
      model,
      max_tokens: 800,
      system:
        "You correct ESL student grammar for a live lesson chat (General American English). The text is only the student. If the line has a grammar mistake (wrong tense, missing words, word order, articles), set hasIssue=true, copy originalText exactly, and put the corrected sentence in suggestedText. Example: original \"i go yesterday to the mall\" → suggested \"I went to the mall yesterday\". Keep stutters and fillers in originalText. If the line is already grammatical, set hasIssue=false. One short explanation.",
      messages: [
        {
          role: "user",
          content: `Student utterances (JSON):\n${JSON.stringify(utterances)}\nReturn corrections for student lines only.`,
        },
      ],
      output_config: { format: zodOutputFormat(liveGrammarSchema) },
    });

    const parsed = message.parsed_output;
    if (!parsed) {
      return NextResponse.json({ error: "Malformed AI response." }, { status: 502 });
    }

    const valid = liveGrammarSchema.safeParse(parsed);
    if (!valid.success) {
      return NextResponse.json({ error: "Schema validation failed." }, { status: 502 });
    }

    const corrections = valid.data.corrections.filter((c) => c.hasIssue && c.suggestedText.trim());
    const cost = estimateClaudeCostUsd(message.usage.input_tokens, message.usage.output_tokens);

    if (corrections.length > 0) {
      await supabase.from("lesson_live_grammar_suggestions").insert(
        corrections.map((item) => ({
          lesson_id: lessonId,
          teacher_id: user.id,
          utterance_segment_key: item.utteranceKey,
          original_text: item.originalText,
          suggested_text: item.suggestedText,
          explanation: item.explanation,
          model,
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          estimated_cost_usd: cost,
        })),
      );
    }

    return NextResponse.json({
      ok: true,
      corrections: corrections.map((item) => ({
        segmentKey: item.utteranceKey,
        originalText: item.originalText,
        suggestedText: item.suggestedText,
        explanation: item.explanation,
      })),
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      estimatedCostUsd: cost,
    });
  } catch (error) {
    const messageText =
      error instanceof APIError ? error.message : error instanceof Error ? error.message : "Live grammar failed.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
