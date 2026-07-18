import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithTimeout, readJson } from "@/lib/client-fetch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("readJson", () => {
  it("parses JSON body", async () => {
    const res = new Response(JSON.stringify({ a: 1 }), { status: 200 });
    await expect(readJson(res)).resolves.toEqual({ a: 1 });
  });

  it("returns empty object for empty body", async () => {
    const res = new Response("", { status: 200 });
    await expect(readJson(res)).resolves.toEqual({});
  });

  it("throws friendly error on HTML error page", async () => {
    const res = new Response("<html>error</html>", { status: 500 });
    await expect(readJson(res)).rejects.toThrow(/서버 오류 \(500\)/);
  });

  it("throws on invalid JSON with 200", async () => {
    const res = new Response("not-json", { status: 200 });
    await expect(readJson(res)).rejects.toThrow(/서버 응답을 읽지 못했어요/);
  });
});

describe("fetchWithTimeout", () => {
  it("returns response when fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
    );
    const res = await fetchWithTimeout("/x", { timeoutMs: 1000 });
    expect(res.status).toBe(200);
  });

  it("maps AbortError to Korean timeout message", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const onAbort = () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          };
          if (init?.signal?.aborted) onAbort();
          else init?.signal?.addEventListener("abort", onAbort);
        });
      }),
    );
    const p = fetchWithTimeout("/slow", { timeoutMs: 50 });
    // attach rejection handler immediately to avoid unhandled rejection noise
    const assertion = expect(p).rejects.toThrow(/요청 시간이 초과/);
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });
});
