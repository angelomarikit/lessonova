import type { LessonAiReport } from "@/lib/anthropic/lesson-report-schema";
import { googlePronunciationSearchUrl } from "@/lib/lessons/google-pronunciation-url";

export type ReviewVocabularyItem = {
  term: string;
  meaning: string;
  example: string;
};

export type ReviewGrammarItem = {
  original: string;
  corrected: string;
  why: string;
};

export type ReviewPronunciationItem = {
  wordOrPhrase: string;
  studentQuote: string;
  americanTarget: string;
  issue: string;
  practiceTip: string;
  googlePronunciationUrl: string;
};

export type ReviewFluencyItem = {
  note: string;
  evidenceQuote: string;
};

export type LessonReviewViewModel = {
  vocabulary: ReviewVocabularyItem[];
  grammar: ReviewGrammarItem[];
  pronunciation: ReviewPronunciationItem[];
  fluencyNotes: ReviewFluencyItem[];
  wentWell: string[];
  areasToImprove: string[];
  homework: string;
  additionalInformation: string;
  speakingStudentPercent: number | null;
  speakingTutorPercent: number | null;
  observedLevel: string | null;
  focusAreas: string[];
  whereLessonEnded: string;
  nextLessonSuggestions: string[];
  prepNotes: string;
};

function focusAreaLabels(report: LessonAiReport): string[] {
  const fromLesson = (report.lessonFocusAreas ?? []).map(
    (item) => `${capitalizeArea(item.area)}: ${item.summary}`,
  );
  if (fromLesson.length > 0) {
    return fromLesson;
  }
  return report.nextLessonRecommendations.reviewPriorities;
}

function capitalizeArea(area: string) {
  return area.charAt(0).toUpperCase() + area.slice(1);
}

export function reviewViewFromReport(report: LessonAiReport | null): LessonReviewViewModel | null {
  if (!report) {
    return null;
  }

  const homeworkParts = [
    ...report.homework.grammarExercises.map((item) => `Grammar: ${item}`),
    ...report.homework.vocabularyExercises.map((item) => `Vocabulary: ${item}`),
    ...report.homework.speakingPracticeQuestions.map((item) => `Speaking: ${item}`),
  ];

  const fluencyFromReport = report.speechFluencyNotes ?? [];
  const fluencyFromImprovement = report.areasForImprovement
    .filter((item) => /fluency|stutter|filler|pause|repetition/i.test(item.issue))
    .map((item) => ({
      note: item.recommendation || item.issue,
      evidenceQuote: item.evidence?.trim() || item.issue,
    }));

  const fluencyNotes = [
    ...fluencyFromReport,
    ...fluencyFromImprovement.filter(
      (item) => !fluencyFromReport.some((existing) => existing.note === item.note),
    ),
  ];

  return {
    vocabulary: report.vocabulary.map((item) => ({
      term: item.term,
      meaning: item.meaning,
      example: item.exampleSentence,
    })),
    grammar: report.grammarCorrections.map((item) => ({
      original: item.originalStudentSentence,
      corrected: item.correctedSentence,
      why: item.explanation,
    })),
    pronunciation: (report.pronunciationFeedback ?? []).map((item) => ({
      wordOrPhrase: item.wordOrPhrase,
      studentQuote: item.studentQuote,
      americanTarget: item.americanTargetPronunciation,
      issue: item.issue,
      practiceTip: item.practiceTip,
      googlePronunciationUrl: googlePronunciationSearchUrl(item.wordOrPhrase),
    })),
    fluencyNotes,
    wentWell: report.studentStrengths,
    areasToImprove: report.areasForImprovement.map(
      (item) => item.recommendation || item.issue,
    ),
    homework: homeworkParts.join("\n\n"),
    additionalInformation: report.lessonSummary.studentFacingSummary,
    speakingStudentPercent: null,
    speakingTutorPercent: null,
    observedLevel: null,
    focusAreas: focusAreaLabels(report),
    whereLessonEnded:
      report.lessonSummary.keyActivities.join(" ") || report.lessonSummary.topics.join(", "),
    nextLessonSuggestions: [
      report.nextLessonRecommendations.suggestedTopic,
      ...report.nextLessonRecommendations.teacherRecommendations,
    ].filter(Boolean),
    prepNotes: report.privateTeacherNotes.join("\n\n"),
  };
}

export function resolveReviewViewModel(report: LessonAiReport | null): LessonReviewViewModel {
  const fromReport = reviewViewFromReport(report);
  if (fromReport) {
    return fromReport;
  }
  return {
    vocabulary: [],
    grammar: [],
    pronunciation: [],
    fluencyNotes: [],
    wentWell: [],
    areasToImprove: [],
    homework: "",
    additionalInformation: "",
    speakingStudentPercent: null,
    speakingTutorPercent: null,
    observedLevel: null,
    focusAreas: [],
    whereLessonEnded: "",
    nextLessonSuggestions: [],
    prepNotes: "",
  };
}
