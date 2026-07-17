import { describe, it, expect } from "vitest";
import { parseQuestionsPayload } from "@/lib/questions/schema";
import { getFallbackQuestions } from "@/lib/questions/fallback";

describe("parseQuestionsPayload", () => {
  it("accepts valid payload from fallback shape", () => {
    const qs = getFallbackQuestions("math");
    const parsed = parseQuestionsPayload({
      questions: qs.map(({ stem, choices, correctIndex, explanation }) => ({
        stem,
        choices,
        correctIndex,
        explanation,
      })),
    });
    expect(parsed.ok).toBe(true);
  });
  it("rejects wrong choice count", () => {
    const parsed = parseQuestionsPayload({
      questions: [
        { stem: "x", choices: ["a", "b"], correctIndex: 0, explanation: "e" },
      ],
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("getFallbackQuestions", () => {
  it("returns exactly 10 questions per subject", () => {
    for (const s of ["korean", "english", "math", "science"] as const) {
      expect(getFallbackQuestions(s)).toHaveLength(10);
    }
  });
});
