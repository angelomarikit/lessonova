"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What is Lessonova?",
    a: "Lessonova is an AI-powered ESL teaching assistant that helps online teachers record lessons, transcribe conversations, analyze grammar and vocabulary, and generate lesson reports.",
  },
  {
    q: "Who can use Lessonova?",
    a: "Individual tutors, school owners, school administrators, and assigned school teachers can use Lessonova based on their account role.",
  },
  {
    q: "How does lesson recording work?",
    a: "Teachers select a student, confirm recording consent, enable microphone access, and optionally capture supported browser-tab audio. Uploaded recordings are also supported as a fallback.",
  },
  {
    q: "Can I use it with Google Meet?",
    a: "You can use browser-tab audio capture when your browser and meeting setup allow it. Lessonova does not guarantee universal compatibility with every conferencing app or device configuration.",
  },
  {
    q: "Can I use it with Zoom?",
    a: "Same as Google Meet: supported tab audio capture may work in some setups, but desktop app routing and browser limitations can prevent full teacher/student separation.",
  },
  {
    q: "Does it record both teacher and student?",
    a: "Lessonova attempts to preserve separate audio sources when your capture setup provides them. When separation is uncertain, the transcript will show that uncertainty instead of guessing.",
  },
  {
    q: "How accurate is the transcription?",
    a: "Accuracy depends on audio quality, accents, background noise, and provider performance. DeepInfra is primary with Deepgram fallback for eligible failures.",
  },
  {
    q: "Can I edit reports?",
    a: "Yes. Teachers can review and edit AI-generated feedback before approving student-facing reports.",
  },
  {
    q: "How many lessons can I process?",
    a: "Your plan and remaining lesson credits determine how many billable lessons you can process each billing period.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. Subscription management and cancellation flows are available from your billing area once Phase 5 billing is active on your account.",
  },
  {
    q: "Is student data secure?",
    a: "Lessonova uses Supabase authentication, row-level security, private storage, signed URLs, and role-based access controls. Legal compliance reviews are still required before making certification claims.",
  },
  {
    q: "Can a language school use Lessonova?",
    a: "Yes. School plans support multiple teachers, organization dashboards, and shared usage management.",
  },
  {
    q: "How do GCash and QR Ph payments work?",
    a: "You select a plan, pay using admin-configured GCash or QR Ph instructions, upload proof, and wait for manual verification before your subscription activates.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-muted py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">FAQs</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Questions from Filipino online teachers
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.q} className="rounded-2xl border border-border bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                >
                  <span className="font-semibold">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open ? (
                  <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
