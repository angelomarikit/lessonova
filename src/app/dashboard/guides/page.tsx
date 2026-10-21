import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { GuidesRecordLink } from "@/components/recording/guides-record-link";

const guides = [
  {
    id: "add-student",
    title: "Add a student",
    description: "Set up a student profile before you record browser-based lessons.",
    href: "/dashboard/students",
  },
  {
    id: "record-lesson",
    title: "Record a lesson",
    description: "Capture microphone and supported classroom tab audio from your browser.",
    href: "record-modal",
  },
  {
    id: "review-transcript",
    title: "Review transcript",
    description: "Run DeepInfra transcription, then review source-labeled dialogue on the lesson page.",
    href: "/dashboard/lessons",
  },
  {
    id: "track-progress",
    title: "Track progress",
    description: "Lesson history and progress analytics expand in upcoming phases.",
    href: "/dashboard/lessons",
  },
];

export default function DashboardGuidesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="How-to guides"
        title="Learn the Lessonova workflow"
        description="Step-by-step help for students, recording, transcripts, and progress."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
        {guides.map((guide) => (
          <Card key={guide.id} id={guide.id} className="h-full">
            <CardContent>
            <h2 className="text-lg font-semibold">{guide.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.description}</p>
            {guide.href === "record-modal" ? (
              <GuidesRecordLink>
                <span className="mt-4 inline-block text-sm font-semibold">Open</span>
              </GuidesRecordLink>
            ) : (
              <Link href={guide.href} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                Open
              </Link>
            )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
