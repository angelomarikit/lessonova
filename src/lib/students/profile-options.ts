export const ENGLISH_LEVEL_OPTIONS = [
  { value: "", label: "Not sure yet" },
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
] as const;

export const LEARNING_GOAL_OPTIONS = [
  { value: "", label: "Select a goal" },
  { value: "conversational", label: "Conversational" },
  { value: "business_english", label: "Business English" },
  { value: "exam_preparation", label: "Exam preparation" },
  { value: "pronunciation", label: "Pronunciation & accent" },
  { value: "kids_english", label: "Kids / young learners" },
  { value: "academic_english", label: "Academic English" },
  { value: "travel_english", label: "Travel English" },
  { value: "other", label: "Other" },
] as const;

export function formatLearningGoal(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const match = LEARNING_GOAL_OPTIONS.find((option) => option.value === value);
  if (match && match.value) {
    return match.label;
  }
  return value.replaceAll("_", " ");
}

export function formatEnglishLevel(value: string | null | undefined) {
  if (!value) {
    return "Determining level";
  }
  const match = ENGLISH_LEVEL_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

export type StudentProfileInput = {
  display_name: string;
  email: string;
  english_level: string;
  learning_objectives: string;
  native_language: string;
  target_exam: string;
  interests: string;
  areas_to_improve: string;
  notes: string;
  hourly_rate: string;
};

export const emptyStudentProfileInput: StudentProfileInput = {
  display_name: "",
  email: "",
  english_level: "",
  learning_objectives: "",
  native_language: "",
  target_exam: "",
  interests: "",
  areas_to_improve: "",
  notes: "",
  hourly_rate: "",
};

export function buildStudentInsertRow(
  teacherId: string,
  input: StudentProfileInput,
): Record<string, unknown> {
  const hourly =
    input.hourly_rate.trim() === "" ? null : Number.parseFloat(input.hourly_rate.replace(/,/g, ""));

  return {
    teacher_id: teacherId,
    display_name: input.display_name.trim(),
    email: input.email.trim() || null,
    english_level: input.english_level.trim() || null,
    learning_objectives: input.learning_objectives.trim() || null,
    native_language: input.native_language.trim() || null,
    target_exam: input.target_exam.trim() || null,
    interests: input.interests.trim() || null,
    areas_to_improve: input.areas_to_improve.trim() || null,
    notes: input.notes.trim() || null,
    hourly_rate: hourly != null && !Number.isNaN(hourly) ? hourly : null,
  };
}
