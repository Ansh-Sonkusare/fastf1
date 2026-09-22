import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  F1ClientError,
  F1ClientService,
  F1ClientServiceLive,
  RateLimitError,
  TimeoutError,
} from "./service";

function runEffect<A>(effect: Effect.Effect<A, unknown, F1ClientService>): Promise<A> {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

function fetchWithClient<A>(
  endpoint: string,
  options?: { params?: Record<string, string | number> },
) {
  return Effect.gen(function* () {
    const client = yield* F1ClientService;
    return yield* client.fetch<A>(endpoint, options);
  });
}

let originalFetch: typeof globalThis.fetch;

describe("F1ClientService", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should make GET request and return JSON", async () => {
    const mockData = { data: "test" };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(mockData), { status: 200 }));

    const result = await runEffect(fetchWithClient<{ data: string }>("http://test.api/test"));
    expect(result).toEqual(mockData);
  });

  it("should include query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    globalThis.fetch = fetchMock;

    await runEffect(fetchWithClient("http://test.api/test", { params: { limit: 10, offset: 5 } }));

    const calls = fetchMock.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const firstArg = calls[0][0];
    const firstArgStr = typeof firstArg === "string" ? firstArg : JSON.stringify(firstArg);
    expect(firstArgStr).toContain("limit=10");
  });

  it("should throw RateLimitError on 429", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 429, statusText: "Too Many Requests" }));

    await expect(runEffect(fetchWithClient("http://test.api/test"))).rejects.toThrow(
      "Rate limit exceeded",
    );
  }, 10_000);

  it("should fail immediately on non-retryable HTTP errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404, statusText: "Not Found" }));
    globalThis.fetch = fetchMock;

    await expect(runEffect(fetchWithClient("http://test.api/test"))).rejects.toThrow("HTTP 404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("should retry 5xx errors up to the max attempts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500, statusText: "Internal Server Error" }));
    globalThis.fetch = fetchMock;

    await expect(runEffect(fetchWithClient("http://test.api/test"))).rejects.toThrow("HTTP 500");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  }, 10_000);

  it("should retry 429 errors up to the max attempts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 429, headers: { "retry-after": "0" } }));
    globalThis.fetch = fetchMock;

    await expect(runEffect(fetchWithClient("http://test.api/test"))).rejects.toThrow(
      "Rate limit exceeded",
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  }, 10_000);

  it("should respect Retry-After and succeed on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "1" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "ok" }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const result = await runEffect(fetchWithClient<{ data: string }>("http://test.api/test"));
    expect(result).toEqual({ data: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("should throw F1ClientError on 500", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500, statusText: "Internal Server Error" }));

    await expect(runEffect(fetchWithClient("http://test.api/test"))).rejects.toThrow("HTTP 500");
  }, 10_000);

  it("should throw F1ClientError on non-JSON response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));

    await expect(runEffect(fetchWithClient("http://test.api/test"))).rejects.toThrow(
      "Failed to parse response",
    );
  }, 10_000);
});
