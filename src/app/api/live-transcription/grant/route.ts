import { NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";

import { isDeepgramConfigured, getDeepgramApiKey } from "@/lib/deepgram/config";
import {
  getLiveTranscriptionSettings,
  resolveClassroomLiveTranscriptionEnabled,
  resolveLiveTranscriptionEnabled,
} from "@/lib/live-transcription/get-live-transcription-settings";
import { resolveLiveTranscriptionRelayWebSocketUrl } from "@/lib/live-transcription/resolve-live-relay-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a short-lived Deepgram access token for browser WebSocket live STT.
 * Long-lived DEEPGRAM_API_KEY never leaves the server.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.LIVE_TRANSCRIPTION_ENABLED === "false") {
    return NextResponse.json(
      {
        error:
          "Live transcription is disabled. Remove LIVE_TRANSCRIPTION_ENABLED=false or turn it on in admin settings.",
      },
      { status: 403 },
    );
  }

  if (!isDeepgramConfigured()) {
    return NextResponse.json(
      {
        error:
          "Deepgram is not configured. Add DEEPGRAM_API_KEY to your server environment (e.g. Vercel → Settings → Environment Variables), then redeploy.",
      },
      { status: 503 },
    );
  }

  const settings = await getLiveTranscriptionSettings();
  if (!resolveLiveTranscriptionEnabled(settings)) {
    return NextResponse.json(
      {
        error:
          "Live transcription is off in platform settings. Set LIVE_TRANSCRIPTION_ENABLED=true on the server or enable it in Admin → Live transcription.",
      },
      { status: 403 },
    );
  }

  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram API key is missing." }, { status: 503 });
  }

  const client = new DeepgramClient({ apiKey });
  const preferredTtl = Math.min(
    Math.max(Number(process.env.DEEPGRAM_LIVE_TOKEN_TTL_SECONDS ?? "3600"), 60),
    3600,
  );

  let tokenResponse;
  try {
    tokenResponse = await client.auth.v1.tokens.grant({ ttl_seconds: preferredTtl });
  } catch {
    try {
      tokenResponse = await client.auth.v1.tokens.grant({ ttl_seconds: 300 });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not grant a Deepgram live token.";
      return NextResponse.json(
        { error: `Deepgram token grant failed. Check DEEPGRAM_API_KEY. ${message}` },
        { status: 502 },
      );
    }
  }

  if (!tokenResponse.access_token) {
    return NextResponse.json({ error: "Deepgram returned an empty access token." }, { status: 502 });
  }

  const authProtocolEnv = process.env.DEEPGRAM_LIVE_AUTH_PROTOCOL?.trim().toLowerCase();
  const authProtocol =
    authProtocolEnv === "token" || authProtocolEnv === "bearer" ? authProtocolEnv : "bearer";

  const relayWebSocketUrl = resolveLiveTranscriptionRelayWebSocketUrl();

  return NextResponse.json({
    accessToken: tokenResponse.access_token,
    expiresIn: tokenResponse.expires_in,
    model: settings.streamingModel,
    provider: settings.streamingProvider,
    authProtocol,
    relayWebSocketUrl,
    liveCorrectionsEnabled: settings.liveCorrectionsEnabled,
    classroomLiveEnabled: resolveClassroomLiveTranscriptionEnabled(),
  });
}
