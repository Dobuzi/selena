import { describe, it, expect, afterEach } from "vitest";
import { isStaticMode } from "@/lib/platform";

describe("isStaticMode", () => {
  const prev = process.env.NEXT_PUBLIC_STATIC;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_STATIC;
    else process.env.NEXT_PUBLIC_STATIC = prev;
  });

  it("is true only when NEXT_PUBLIC_STATIC=1", () => {
    process.env.NEXT_PUBLIC_STATIC = "1";
    expect(isStaticMode()).toBe(true);
    process.env.NEXT_PUBLIC_STATIC = "0";
    expect(isStaticMode()).toBe(false);
    delete process.env.NEXT_PUBLIC_STATIC;
    expect(isStaticMode()).toBe(false);
  });
});
