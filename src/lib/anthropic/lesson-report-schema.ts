import { z } from "zod";

export const lessonReportSchema = z.object({
  lessonSummary: z.object({
    topics: z.array(z.string()),
    learningObjectivesObserved: z.array(z.string()),
    keyActivities: z.array(z.string()),
    studentFacingSummary: z.string(),
  }),
  grammarCorrections: z.array(
    z.object({
      originalStudentSentence: z.string(),
      correctedSentence: z.string(),
      explanation: z.string(),
      grammarCategory: z.string(),
      timestampMs: z.number().nullable().optional(),
    }),
  ),
  pronunciationFeedback: z
    .array(
      z.object({
        wordOrPhrase: z.string(),
        studentQuote: z.string(),
        americanTargetPronunciation: z.string(),
        issue: z.string(),
        practiceTip: z.string(),
      }),
    )
    .default([]),
  speechFluencyNotes: z
    .array(
      z.object({
        note: z.string(),
        evidenceQuote: z.string(),
      }),
    )
    .default([]),
  lessonFocusAreas: z
    .array(
      z.object({
        area: z.enum([
          "grammar",
          "pronunciation",
          "vocabulary",
          "fluency",
          "listening",
          "speaking",
          "other",
        ]),
        summary: z.string(),
        evidenceQuote: z.string().optional(),
      }),
    )
    .default([]),
  vocabulary: z.array(
    z.object({
      term: z.string(),
      meaning: z.string(),
      exampleSentence: z.string(),
      practiceSuggestion: z.string(),
    }),
  ),
  studentStrengths: z.array(z.string()),
  areasForImprovement: z.array(
    z.object({
      issue: z.string(),
      evidence: z.string().optional(),
      recommendation: z.string(),
    }),
  ),
  homework: z.object({
    grammarExercises: z.array(z.string()),
    vocabularyExercises: z.array(z.string()),
    speakingPracticeQuestions: z.array(z.string()),
  }),
  nextLessonRecommendations: z.object({
    suggestedTopic: z.string(),
    reviewPriorities: z.array(z.string()),
    teacherRecommendations: z.array(z.string()),
  }),
  privateTeacherNotes: z.array(z.string()),
});

export type LessonAiReport = z.infer<typeof lessonReportSchema>;

export function stripPrivateTeacherNotes(report: LessonAiReport): Omit<
  LessonAiReport,
  "privateTeacherNotes"
> {
  const { privateTeacherNotes: _private, ...studentFacing } = report;
  return studentFacing;
}
