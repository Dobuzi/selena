import { afterEach, vi } from "vitest";

// Deterministic random for balanceAnswerPositions when needed — leave real Math.random
// unless a test opts into vi.spyOn(Math, "random")

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
