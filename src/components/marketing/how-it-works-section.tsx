const steps = [
  {
    step: "1",
    title: "Select Your Student",
    description: "Choose an existing student or create a new profile before you start recording.",
  },
  {
    step: "2",
    title: "Record Your Lesson",
    description:
      "Record microphone and supported browser lesson audio, or upload a recording file.",
  },
  {
    step: "3",
    title: "Analyze with AI",
    description: "Generate a transcript and detailed lesson feedback grounded in the dialogue.",
  },
  {
    step: "4",
    title: "Review and Share",
    description: "Edit, approve, download, and email lesson reports to your student.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-muted py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            From live lesson to actionable feedback
          </h2>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
