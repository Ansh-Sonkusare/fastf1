import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { getOpenF1BaseUrl } from "./_shared";

export function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

export function mockFetch(data: unknown) {
  const spy = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  global.fetch = spy;
  return spy;
}

export function collectNulls(items: readonly object[]): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      if (value === null) keys.add(key);
    }
  }
  return [...keys];
}

export function testEdgeCases(fn: () => Promise<readonly unknown[]>): void {
  it.each([
    ["empty array", []],
    ["non-array input", { error: "not found" }],
  ])("returns empty array for %s", async (_, input) => {
    mockFetch(input);
    const result = await fn();
    expect(result).toEqual([]);
  });
}

export function setupMocks(): void {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
}
