export type BrowserSupportLevel = "recommended" | "limited" | "unsupported" | "unknown";

export interface BrowserCapabilityReport {
  supportLevel: BrowserSupportLevel;
  label: string;
  userAgent: string;
  isMobile: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasDisplayMedia: boolean;
  warnings: string[];
}

export function detectBrowserCapabilities(): BrowserCapabilityReport {
  if (typeof window === "undefined") {
    return {
      supportLevel: "unknown",
      label: "Unknown",
      userAgent: "",
      isMobile: false,
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasDisplayMedia: false,
      warnings: [],
    };
  }

  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const hasMediaDevices = Boolean(navigator.mediaDevices);
  const hasGetUserMedia = Boolean(navigator.mediaDevices?.getUserMedia);
  const hasDisplayMedia = Boolean(navigator.mediaDevices?.getDisplayMedia);

  const warnings: string[] = [];

  if (isMobile) {
    warnings.push(
      "Mobile browsers often cannot share classroom tab audio. Use desktop Chrome or Edge when possible.",
    );
  }

  if (!hasGetUserMedia) {
    warnings.push("Microphone capture is not available in this browser.");
  }

  if (!hasDisplayMedia) {
    warnings.push("Classroom tab audio sharing is not available in this browser.");
  }

  const isChromium = /Chrome|Edg|Chromium/i.test(userAgent) && !/Firefox/i.test(userAgent);
  const isFirefox = /Firefox/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|Edg/i.test(userAgent);

  let supportLevel: BrowserSupportLevel = "unknown";
  let label = "Unknown browser";

  if (isChromium && !isMobile) {
    supportLevel = "recommended";
    label = /Edg/i.test(userAgent) ? "Microsoft Edge (desktop)" : "Chromium browser (desktop)";
  } else if (isChromium && isMobile) {
    supportLevel = "limited";
    label = "Chromium mobile browser";
  } else if (isFirefox) {
    supportLevel = "limited";
    label = "Firefox";
    warnings.push("Firefox tab audio behavior varies. Validate capture before relying on it.");
  } else if (isSafari) {
    supportLevel = "limited";
    label = "Safari";
    warnings.push("Safari tab audio capture is limited. Test your classroom setup first.");
  } else {
    supportLevel = "unsupported";
    label = "Unrecognized browser";
    warnings.push("Use the latest desktop Chrome or Edge for the most reliable tab audio capture.");
  }

  return {
    supportLevel,
    label,
    userAgent,
    isMobile,
    hasMediaDevices,
    hasGetUserMedia,
    hasDisplayMedia,
    warnings,
  };
}
