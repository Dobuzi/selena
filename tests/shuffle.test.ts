import { describe, it, expect } from "vitest";
import { balanceAnswerPositions } from "@/lib/questions/shuffle";
import type { Question } from "@/lib/types";

describe("balanceAnswerPositions", () => {
  it("cycles correctIndex 0,1,2,3 and keeps correct text", () => {
    const input: Question[] = Array.from({ length: 8 }, (_, i) => ({
      id: `q${i}`,
      stem: `Q${i}`,
      choices: ["A", "B", "C", "D"] as [string, string, string, string],
      correctIndex: 1 as const, // always "B"
      explanation: "B is right",
    }));
    const out = balanceAnswerPositions(input);
    expect(out.map((q) => q.correctIndex)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    for (const q of out) {
      expect(q.choices[q.correctIndex]).toBe("B");
    }
  });
});
