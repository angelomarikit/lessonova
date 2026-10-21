"use client";

import { useState } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const categories = ["Something's wrong", "Feedback", "A question"] as const;

export default function DashboardContactPage() {
  const [category, setCategory] = useState<(typeof categories)[number]>("A question");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Get in touch"
        title="We're here to help"
        description="Something not working, feedback, or a question? Tell us what you need. Support inbox integration arrives in a later phase."
      />

      <Card>
        <CardContent>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={
                category === item
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
              }
            >
              {item}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What's on your mind?"
          className="mt-4 min-h-40 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setMessage("");
              setSent(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!message.trim()}
            onClick={() => {
              setSent(true);
              setMessage("");
            }}
          >
            Send
          </Button>
        </div>
        {sent ? (
          <p className="mt-4 text-sm text-primary">
            Thanks — your message was captured locally for now. Email support via Resend will connect this form
            later.
          </p>
        ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
