import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveProviderChain } from "@/lib/transcription/provider-router";
import { DEFAULT_TRANSCRIPTION_SETTINGS } from "@/lib/transcription/types";

describe("resolveProviderChain", () => {
  it("uses deepinfra only when fallback disabled", () => {
    const chain = resolveProviderChain({
      settings: DEFAULT_TRANSCRIPTION_SETTINGS,
      allowFallback: false,
    });
    assert.deepEqual(chain, ["deepinfra"]);
  });

  it("adds deepgram when auto fallback enabled", () => {
    const chain = resolveProviderChain({
      settings: { ...DEFAULT_TRANSCRIPTION_SETTINGS, autoFallbackEnabled: true },
      allowFallback: true,
    });
    assert.deepEqual(chain, ["deepinfra", "deepgram"]);
  });
});
