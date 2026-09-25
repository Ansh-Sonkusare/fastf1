import { describe, expect, it } from "vitest";
import { asSessionKey, createGate, openF1Url, OpenF1Error } from "./openf1";

const SK = asSessionKey(9839);

function harness(responses: Array<{ status: number; body?: unknown; retryAfter?: string }>) {
  let clock = 0;
  const calls: Array<{ url: string; at: number }> = [];
  const sleeps: number[] = [];
  const gate = createGate({
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    fetch: async (url) => {
      calls.push({ url, at: clock });
      const r = responses.shift() ?? { status: 200, body: [] };
      return new Response(JSON.stringify(r.body ?? []), {
        status: r.status,
        headers: r.retryAfter ? { "retry-after": r.retryAfter } : {},
      });
    },
    minIntervalMs: 400,
    perMinute: 3,
    maxRetries: 2,
    backoffMs: 1000,
  });
  return { gate, calls, sleeps };
}

describe("openF1Url", () => {
  it("sorts params and keeps operator keys without '='", () => {
    expect(
      openF1Url("car_data", { session_key: 9839, "date<": "2025-12-07T13:00:00", driver_number: 1, "date>=": "2025-12-07T12:58:00" }),
    ).toBe(
      "https://api.openf1.org/v1/car_data?date<2025-12-07T13%3A00%3A00&date>=2025-12-07T12%3A58%3A00&driver_number=1&session_key=9839",
    );
  });
});

describe("createGate", () => {
  it("dedupes identical queries regardless of filter order", async () => {
    const { gate, calls } = harness([{ status: 200, body: [{ lap_number: 1 }] }]);
    const [a, b] = await Promise.all([
      gate.get("laps", SK, { driver_number: 1, lap_number: 3 }),
      gate.get("laps", SK, { lap_number: 3, driver_number: 1 }),
    ]);
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.openf1.org/v1/laps?driver_number=1&lap_number=3&session_key=9839",
    ]);
    expect(a).toEqual([{ lap_number: 1 }]);
    expect(b).toBe(a);
  });

  it("spaces request starts and caps the rolling minute", async () => {
    const { gate, calls } = harness([]);
    await Promise.all(["drivers", "laps", "stints", "pit"].map((e) => gate.get(e as "laps", SK)));
    expect(calls.map((c) => c.at)).toEqual([0, 400, 800, 60_000]);
  });

  it("retries a 429, honoring Retry-After then backing off", async () => {
    const { gate, calls, sleeps } = harness([
      { status: 429, retryAfter: "3" },
      { status: 429 },
      { status: 200, body: [{ ok: 1 }] },
    ]);
    expect(await gate.get("weather", SK)).toEqual([{ ok: 1 }]);
    expect(calls).toHaveLength(3);
    expect(sleeps.slice(0, 2)).toEqual([3000, 2000]);
  });

  it("gives up after maxRetries and lets the next call retry", async () => {
    const { gate, calls } = harness([{ status: 429 }, { status: 429 }, { status: 429 }, { status: 200, body: [1] }]);
    await expect(gate.get("pit", SK)).rejects.toBeInstanceOf(OpenF1Error);
    expect(await gate.get("pit", SK)).toEqual([1]);
    expect(calls).toHaveLength(4);
  });

  it("treats 404 as no rows", async () => {
    const { gate } = harness([{ status: 404, body: { detail: "No results found." } }]);
    expect(await gate.get("team_radio", SK)).toEqual([]);
  });
});
