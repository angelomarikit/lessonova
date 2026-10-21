/**
 * One-shot live Claude connectivity test (sample transcript).
 * Usage: node --env-file=.env.local scripts/claude-live-sample-test.mjs
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const grammarItem = z.object({
  originalStudentSentence: z.string(),
  correctedSentence: z.string(),
  explanation: z.string(),
  grammarCategory: z.string(),
});

const schema = z.object({
  grammarCorrections: z.array(grammarItem),
  lessonSummary: z.object({
    studentFacingSummary: z.string(),
    topics: z.array(z.string()),
  }),
});

const SAMPLE = `Teacher: "What did you do yesterday?"
Student: "Yesterday I go to the mall. I buy a new shoes."
Teacher: "Very good. Do you like your new shoes?"
Student: "Yes, I likes them very much."`;

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5";

if (!apiKey || apiKey === "your_actual_anthropic_api_key") {
  console.error("BLOCKER: Set a real ANTHROPIC_API_KEY in .env.local");
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const message = await client.messages.parse({
  model,
  max_tokens: 800,
  system:
    "Analyze only student lines. Quote exact student sentences for grammar corrections. Return JSON only.",
  messages: [
    {
      role: "user",
      content: `Transcript:\n${SAMPLE}\n\nReturn grammar corrections for student mistakes only.`,
    },
  ],
  output_config: { format: zodOutputFormat(schema) },
});

if (!message.parsed_output) {
  console.error("BLOCKER: No parsed_output from Claude");
  process.exit(1);
}

const { grammarCorrections, lessonSummary } = message.parsed_output;
console.log("OK: Claude API responded");
console.log("Model:", model);
console.log("Tokens in/out:", message.usage.input_tokens, message.usage.output_tokens);
console.log("Summary:", lessonSummary.studentFacingSummary);
console.log("Grammar items:", grammarCorrections.length);
for (const item of grammarCorrections) {
  console.log("-", item.originalStudentSentence, "=>", item.correctedSentence);
}

const expectedPatterns = [/went/i, /bought/i, /shoes/i, /like/i];
const blob = JSON.stringify(grammarCorrections).toLowerCase();
const hits = expectedPatterns.filter((pattern) => pattern.test(blob));
console.log("Evidence check hits:", hits.length, "of", expectedPatterns.length);

process.exit(hits.length >= 3 ? 0 : 2);
