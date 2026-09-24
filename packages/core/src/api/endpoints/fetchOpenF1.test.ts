import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../../http/service";
import { fetchOpenF1 } from "./_shared";
import { clearOpenF1Cache, setOpenF1CacheEnabled } from "./cache";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

describe("fetchOpenF1 Cache", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearOpenF1Cache();
    setOpenF1CacheEnabled(true);
  });

  it("caches successful responses and serves from cache on repeat calls", async () => {
    const data = [{ id: 1, name: "test" }];
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    // First call
    const result1 = await run(fetchOpenF1("/test"));
    expect(result1).toEqual(data);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const result2 = await run(fetchOpenF1("/test"));
    expect(result2).toEqual(data);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it("uses different cache entries for different parameters", async () => {
    const data1 = [{ id: 1 }];
    const data2 = [{ id: 2 }];

    const fetchSpy = vi.fn();
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify(data1), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(data2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    global.fetch = fetchSpy;

    // Call with different params
    const result1 = await run(fetchOpenF1("/test", { id: "1" }));
    expect(result1).toEqual(data1);

    const result2 = await run(fetchOpenF1("/test", { id: "2" }));
    expect(result2).toEqual(data2);

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Repeat first call with id=1, should use cache
    const result1Again = await run(fetchOpenF1("/test", { id: "1" }));
    expect(result1Again).toEqual(data1);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // Still 2
  });

  it("respects cache TTL with fake timers", async () => {
    vi.useFakeTimers();
    try {
      const data = [{ id: 1 }];
      const fetchSpy = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      global.fetch = fetchSpy;

      // First call - fetch
      const result1 = await run(fetchOpenF1("/test"));
      expect(result1).toEqual(data);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Advance time by 59 minutes
      vi.advanceTimersByTime(59 * 60 * 1000);

      // Second call - should still use cache
      const result2 = await run(fetchOpenF1("/test"));
      expect(result2).toEqual(data);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Advance to exactly 1 hour (TTL expiration)
      vi.advanceTimersByTime(60 * 1000);

      // Third call - should refetch (cache expired)
      const result3 = await run(fetchOpenF1("/test"));
      expect(result3).toEqual(data);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("respects cache disabled state", async () => {
    const data = [{ id: 1 }];
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    global.fetch = fetchSpy;

    // Start with cache disabled
    setOpenF1CacheEnabled(false);

    // First call
    const result1 = await run(fetchOpenF1("/test"));
    expect(result1).toEqual(data);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call - should refetch because cache is disabled
    const result2 = await run(fetchOpenF1("/test"));
    expect(result2).toEqual(data);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("caches the cleaned response without refetching", async () => {
    const data = {
      id: 1,
      name: "test",
      nested: {
        value: 42,
      },
    };

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    const result = (await run(fetchOpenF1("/test"))) as typeof data;

    expect(result.id).toBe(1);
    expect(result.name).toBe("test");
    expect(result.nested.value).toBe(42);

    const result2 = await run(fetchOpenF1("/test"));
    expect(result2).toEqual(result);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("shares in-flight promises for concurrent identical calls", async () => {
    const data = [{ id: 1 }];
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchSpy;

    const call1 = run(fetchOpenF1("/test"));
    const call2 = run(fetchOpenF1("/test"));

    const [result1, result2] = await Promise.all([call1, call2]);

    expect(result1).toEqual(data);
    expect(result2).toEqual(data);
    expect(result1).toBe(result2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("evicts failed in-flight calls so next call refetches", async () => {
    const successData = [{ id: 1 }];
    let callCount = 0;

    const fetchSpy = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Network error");
      }
      return Promise.resolve(
        new Response(JSON.stringify(successData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    global.fetch = fetchSpy;

    let errorThrown = false;
    try {
      await run(fetchOpenF1("/test"));
    } catch {
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const result = await run(fetchOpenF1("/test"));
    expect(result).toEqual(successData);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("interrupted in-flight fetch does not poison later calls", async () => {
    const data = [{ id: 1 }];
    const fetchSpy = vi.fn((): Promise<Response> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            new Response(JSON.stringify(data), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }, 500);
      });
    });
    global.fetch = fetchSpy;

    const firstCallAborted = Effect.timeout(fetchOpenF1("/test"), "50 millis").pipe(
      Effect.catchAll(() => Effect.void),
    );
    await run(firstCallAborted);

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const secondResult = await run(fetchOpenF1("/test"));
    expect(secondResult).toEqual(data);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("concurrent callers both receive error when first fetch fails", async () => {
    let callCount = 0;
    const fetchSpy = vi.fn((): Promise<Response> => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Connection failed");
      }
      return Promise.resolve(
        new Response(JSON.stringify([{ id: 2 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    global.fetch = fetchSpy;

    const errors: Error[] = [];

    const call1Promise = run(fetchOpenF1("/concurrent")).catch((err) => {
      errors.push(err);
    });
    const call2Promise = run(fetchOpenF1("/concurrent")).catch((err) => {
      errors.push(err);
    });

    await Promise.all([call1Promise, call2Promise]);

    expect(errors).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("exports cache controls from package entry", async () => {
    const { clearOpenF1Cache: exported } = await import("../../index");
    expect(typeof exported).toBe("function");
  });
});
