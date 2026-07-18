import { describe, it, expect } from "vitest";
import { uniqueNickname } from "@/lib/nickname";

describe("uniqueNickname", () => {
  it("returns desired when free", () => {
    expect(uniqueNickname("민수", [])).toBe("민수");
    expect(uniqueNickname("민수", ["영희"])).toBe("민수");
  });

  it("adds _2, _3 suffixes", () => {
    expect(uniqueNickname("민수", ["민수"])).toBe("민수_2");
    expect(uniqueNickname("민수", ["민수", "민수_2"])).toBe("민수_3");
  });

  it("trims and defaults empty to 학생", () => {
    expect(uniqueNickname("  ", [])).toBe("학생");
    expect(uniqueNickname("", ["학생"])).toBe("학생_2");
  });
});
