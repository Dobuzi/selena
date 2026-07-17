import { describe, it, expect } from "vitest";
import { multiPoints } from "@/lib/battle/scoring";

describe("multiPoints", () => {
  it("awards 100 + remaining*2 when correct", () => {
    expect(multiPoints(true, 15)).toBe(130);
  });
  it("awards 0 when wrong", () => {
    expect(multiPoints(false, 15)).toBe(0);
  });
  it("clamps remaining seconds at 0", () => {
    expect(multiPoints(true, -3)).toBe(100);
  });
});
