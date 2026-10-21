export type CompatibilityTestStatus =
  | "tested_and_working"
  | "partially_supported"
  | "not_supported"
  | "not_yet_tested";

export type TeachingPlatformId =
  | "google_meet"
  | "zoom_web"
  | "microsoft_teams_web"
  | "preply"
  | "italki"
  | "cambly"
  | "other_browser_call";

export interface TeachingPlatform {
  id: TeachingPlatformId;
  name: string;
  shortLabel: string;
  testStatus: CompatibilityTestStatus;
}

export const TEACHING_PLATFORMS: TeachingPlatform[] = [
  { id: "google_meet", name: "Google Meet", shortLabel: "Meet", testStatus: "not_yet_tested" },
  { id: "zoom_web", name: "Zoom Web", shortLabel: "Zoom Web", testStatus: "not_yet_tested" },
  {
    id: "microsoft_teams_web",
    name: "Microsoft Teams Web",
    shortLabel: "Teams Web",
    testStatus: "not_yet_tested",
  },
  { id: "preply", name: "Preply", shortLabel: "Preply", testStatus: "not_yet_tested" },
  { id: "italki", name: "italki", shortLabel: "italki", testStatus: "not_yet_tested" },
  { id: "cambly", name: "Cambly", shortLabel: "Cambly", testStatus: "not_yet_tested" },
  {
    id: "other_browser_call",
    name: "Other Browser Calls",
    shortLabel: "Browser Call",
    testStatus: "not_yet_tested",
  },
];

export function getPlatformById(id: TeachingPlatformId): TeachingPlatform {
  return TEACHING_PLATFORMS.find((platform) => platform.id === id) ?? TEACHING_PLATFORMS[6]!;
}

export function formatTestStatus(status: CompatibilityTestStatus): string {
  switch (status) {
    case "tested_and_working":
      return "Tested and Working";
    case "partially_supported":
      return "Partially Supported";
    case "not_supported":
      return "Not Supported";
    default:
      return "Not Yet Tested";
  }
}
