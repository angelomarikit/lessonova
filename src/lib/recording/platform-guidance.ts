import type { TeachingPlatformId } from "@/lib/recording/platforms";

export interface PlatformGuideStep {
  title: string;
  steps: string[];
  notes?: string[];
}

export const PLATFORM_GUIDANCE: Record<TeachingPlatformId, PlatformGuideStep> = {
  google_meet: {
    title: "Google Meet (browser)",
    steps: [
      "Open your Google Meet lesson in a supported desktop browser.",
      "Open Lessonova in another tab and select your student.",
      "Confirm recording consent and allow microphone access.",
      "Share the Google Meet tab and enable audio when the browser prompts you.",
      "Verify teacher microphone and classroom tab audio before you start recording.",
    ],
  },
  zoom_web: {
    title: "Zoom Web",
    steps: [
      "Join the meeting in your browser (Zoom Web), not the desktop app.",
      "Keep the active meeting tab open while you record in Lessonova.",
      "Share that meeting tab with audio when prompted.",
      "Confirm both audio sources in Lessonova before recording.",
    ],
    notes: [
      "Tab audio capture does not reliably include audio from the Zoom desktop application.",
    ],
  },
  microsoft_teams_web: {
    title: "Microsoft Teams Web",
    steps: [
      "Open Teams in your browser and join the meeting there.",
      "Select the active Teams meeting tab when Lessonova requests tab sharing.",
      "Enable tab audio sharing if the browser offers it.",
      "Verify microphone and classroom audio activity indicators.",
    ],
  },
  preply: {
    title: "Preply classroom (browser)",
    steps: [
      "Open the Preply browser classroom in a separate tab.",
      "Select that classroom tab when Lessonova requests sharing.",
      "Enable audio sharing if your browser supports it for that tab.",
      "Confirm both audio sources before recording.",
    ],
    notes: [
      "Preply browser audio behavior can vary by device and browser settings. This is guidance, not an official integration.",
    ],
  },
  italki: {
    title: "italki classroom (browser)",
    steps: [
      "Open the italki browser classroom tab.",
      "Share the classroom tab with audio when prompted.",
      "Verify microphone and tab audio activity before recording.",
    ],
    notes: ["Not an official italki integration. Test your setup before live lessons."],
  },
  cambly: {
    title: "Cambly (browser)",
    steps: [
      "Open the Cambly browser session tab.",
      "Share that tab with audio when Lessonova requests capture.",
      "Verify both audio sources before recording.",
    ],
    notes: ["Not an official Cambly integration. Availability depends on browser capture support."],
  },
  other_browser_call: {
    title: "Other browser call",
    steps: [
      "Open your classroom or call in a browser tab.",
      "Select that tab when prompted and enable audio sharing if available.",
      "Verify that an audio track was detected before recording.",
    ],
  },
};
