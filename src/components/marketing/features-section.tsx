import {
  BarChart3,
  BookMarked,
  Building2,
  FileText,
  History,
  Languages,
  Mic2,
  NotebookPen,
  Sparkles,
  Split,
  Volume2,
  Wand2,
} from "lucide-react";

const features = [
  {
    title: "AI Lesson Recording",
    description: "Capture lesson audio with consent-aware workflows built for online tutors.",
    icon: Mic2,
  },
  {
    title: "Smart Audio Transcription",
    description: "Turn recordings into timestamped transcripts using DeepInfra with Deepgram fallback.",
    icon: Sparkles,
  },
  {
    title: "Teacher and Student Speaker Separation",
    description: "Preserve source identity when your browser capture setup supports it.",
    icon: Split,
  },
  {
    title: "Grammar Correction",
    description: "Highlight student mistakes with evidence-backed corrections and explanations.",
    icon: Wand2,
  },
  {
    title: "Vocabulary Analysis",
    description: "Extract words, definitions, and practice ideas from real lesson dialogue.",
    icon: Languages,
  },
  {
    title: "Pronunciation Feedback",
    description: "Surface pronunciation notes only when audio evidence supports them.",
    icon: Volume2,
  },
  {
    title: "AI Lesson Summary",
    description: "Generate concise lesson summaries grounded in transcript content.",
    icon: NotebookPen,
  },
  {
    title: "Personalized Homework",
    description: "Create grammar, vocabulary, and conversation practice tailored to each student.",
    icon: BookMarked,
  },
  {
    title: "Student Progress Tracking",
    description: "Track lessons, recurring errors, and learning trends over time.",
    icon: BarChart3,
  },
  {
    title: "Student Learning History",
    description: "Review prior lessons, feedback, and teacher notes in one profile.",
    icon: History,
  },
  {
    title: "Branded PDF Reports",
    description: "Share polished Lessonova reports with students and schools.",
    icon: FileText,
  },
  {
    title: "School Management",
    description: "Support multi-teacher organizations with shared usage and permissions.",
    icon: Building2,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need after every ESL lesson
          </h2>
          <p className="mt-4 text-muted-foreground">
            Built for Filipino online teachers and language schools. Capabilities roll out by
            development phase — recording, AI analysis, reports, and billing are implemented in
            staged releases.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-primary/30 hover:shadow-soft"
            >
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
