/**
 * Dev-only WebSocket relay so the browser avoids Deepgram JWT subprotocol auth
 * (Chrome often rejects the handshake). The relay uses DEEPGRAM_API_KEY on Node.
 */
export function resolveLiveTranscriptionRelayWebSocketUrl(): string | undefined {
  if (process.env.DEEPGRAM_LIVE_BROWSER_RELAY === "false") {
    return undefined;
  }
  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }
  if (process.env.DEEPGRAM_LIVE_BROWSER_RELAY_URL?.trim()) {
    return process.env.DEEPGRAM_LIVE_BROWSER_RELAY_URL.trim();
  }
  const port = process.env.DEEPGRAM_LIVE_RELAY_PORT?.trim() || "3001";
  return `ws://127.0.0.1:${port}/listen`;
}
