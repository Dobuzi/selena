import { describe, it, expect } from "vitest";
import { normalizeLabel, makeRoomId } from "@/lib/room-id";

describe("normalizeLabel", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeLabel("  선린  중학교  ")).toBe("선린 중학교");
  });
  it("lowercases ascii", () => {
    expect(normalizeLabel("ABC School")).toBe("abc school");
  });
});

describe("makeRoomId", () => {
  it("is stable for same school+hall+subject", () => {
    const a = makeRoomId("선린중", "3-1 수학", "math");
    const b = makeRoomId("  선린중 ", "3-1  수학", "math");
    expect(a).toBe(b);
  });
  it("differs by subject", () => {
    expect(makeRoomId("A", "B", "math")).not.toBe(makeRoomId("A", "B", "korean"));
  });
});
