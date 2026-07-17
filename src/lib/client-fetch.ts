/** Client-side fetch with timeout (AbortController). */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...rest,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("요청 시간이 초과됐어요. 다시 시도해 주세요.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function readJson(
  res: Response,
): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "서버 응답을 읽지 못했어요."
        : `서버 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`,
    );
  }
}
