import type { SoloResult } from "@/lib/types";

export function applySoloOutcome(input: {
  playerHp: number;
  aiHp: number;
  correct: boolean;
}): { playerHp: number; aiHp: number; finished: boolean; result: SoloResult } {
  let { playerHp, aiHp } = input;
  if (input.correct) aiHp -= 1;
  else playerHp -= 1;
  if (playerHp <= 0) {
    return { playerHp: 0, aiHp, finished: true, result: "lose" };
  }
  if (aiHp <= 0) {
    return { playerHp, aiHp: 0, finished: true, result: "win" };
  }
  return { playerHp, aiHp, finished: false, result: null };
}

export function finalSoloResult(playerHp: number, aiHp: number): SoloResult {
  if (playerHp > aiHp) return "win";
  if (playerHp < aiHp) return "lose";
  return "draw";
}
