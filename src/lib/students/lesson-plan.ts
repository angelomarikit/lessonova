import { z } from "zod";

export const lessonPlanSuggestionSchema = z.object({
  sessions: z
    .array(
      z.object({
        title: z.string(),
        focus: z.string(),
        plan: z.string(),
      }),
    )
    .min(1)
    .max(6),
});

export type LessonPlanItem = {
  id: string;
  position: number;
  scheduledFor: string | null;
  title: string;
  focus: string;
  plan: string;
  source: "manual" | "ai";
};
