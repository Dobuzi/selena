import { describe, it, expect } from "vitest";
import { applySoloOutcome } from "@/lib/battle/solo";

describe("applySoloOutcome", () => {
  it("decrements aiHp on correct", () => {
    expect(applySoloOutcome({ playerHp: 3, aiHp: 3, correct: true })).toEqual({
      playerHp: 3,
      aiHp: 2,
      finished: false,
      result: null,
    });
  });
  it("decrements playerHp on wrong and finishes at 0", () => {
    expect(applySoloOutcome({ playerHp: 1, aiHp: 2, correct: false })).toEqual({
      playerHp: 0,
      aiHp: 2,
      finished: true,
      result: "lose",
    });
  });
  it("finishes with win when aiHp hits 0", () => {
    expect(applySoloOutcome({ playerHp: 2, aiHp: 1, correct: true })).toEqual({
      playerHp: 2,
      aiHp: 0,
      finished: true,
      result: "win",
    });
  });
});
