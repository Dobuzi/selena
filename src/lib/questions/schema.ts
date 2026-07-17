import { z } from "zod";
import type { Question } from "@/lib/types";
import { randomUUID } from "crypto";

const rawQuestionSchema = z.object({
  stem: z.string().min(1),
  choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  explanation: z.string().min(1),
});

const payloadSchema = z.object({
  questions: z.array(rawQuestionSchema).min(1),
});

export type ParseResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string };

export function parseQuestionsPayload(input: unknown): ParseResult {
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  const questions: Question[] = parsed.data.questions.map((q) => ({
    id: randomUUID(),
    stem: q.stem,
    choices: q.choices,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));
  return { ok: true, questions };
}
