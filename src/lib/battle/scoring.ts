import { BASE_CORRECT_POINTS, TIME_BONUS_PER_SEC } from "@/lib/constants";

export function multiPoints(correct: boolean, remainingSeconds: number): number {
  if (!correct) return 0;
  const rem = Math.max(0, Math.floor(remainingSeconds));
  return BASE_CORRECT_POINTS + rem * TIME_BONUS_PER_SEC;
}
