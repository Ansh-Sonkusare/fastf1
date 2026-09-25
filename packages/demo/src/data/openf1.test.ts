import { describe, expect, it } from "vitest";
import { asSessionKey, createGate, openF1Url, OpenF1Error } from "./openf1";

const SK = asSessionKey(9839);
type Reply = { status: number; body?: unknown; retryAfter?: string } | "network";

function harness(replies: Reply[]) {
  let clock = 0;
  const calls: Array<{ url: string; at: number }> = [];
  const deferred: Array<() => void> = [];
  const gate = createGate({
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
      await new Promise((r) => setTimeout(r, 0));
    },
    defer: (fn) => deferred.push(fn),
    fetch: async (url) => {
      calls.push({ url, at: clock });
      const r = replies.shift() ?? { status: 200, body: [] };
      if (r === "network") throw new TypeError("Failed to fetch");
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
  const flushDeferred = () => deferred.splice(0).forEach((fn) => fn());
  return { gate, calls, flushDeferred };
}

const path = (url: string) => url.replace("https://api.openf1.org/v1/", "");

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
    expect(calls.map((c) => path(c.url))).toEqual(["laps?driver_number=1&lap_number=3&session_key=9839"]);
    expect(a).toEqual([{ lap_number: 1 }]);
    expect(b).toBe(a);
  });

  it("spaces request starts and caps the rolling minute", async () => {
    const { gate, calls } = harness([]);
    await Promise.all(["drivers", "laps", "stints", "pit"].map((e) => gate.get(e as "laps", SK)));
    expect(calls.map((c) => c.at)).toEqual([0, 400, 800, 60_000]);
  });

  it("a 429 pauses the whole queue for Retry-After, then retries that request first", async () => {
    const { gate, calls } = harness([{ status: 429, retryAfter: "3" }, { status: 200, body: [1] }, { status: 200, body: [2] }]);
    const [a, b] = await Promise.all([gate.get("weather", SK), gate.get("pit", SK)]);
    expect([a, b]).toEqual([[1], [2]]);
    expect(calls.map((c) => path(c.url).split("?")[0])).toEqual(["weather", "weather", "pit"]);
    expect(calls[1]!.at).toBeGreaterThanOrEqual(3000);
  });

  it("retries network failures with backoff", async () => {
    const { gate, calls } = harness(["network", { status: 200, body: [7] }]);
    expect(await gate.get("drivers", SK)).toEqual([7]);
    expect(calls[1]!.at - calls[0]!.at).toBeGreaterThanOrEqual(1000);
  });

  it("gives up after maxRetries and lets the next call start fresh", async () => {
    const { gate, calls } = harness([{ status: 429 }, "network", { status: 429 }, { status: 200, body: [1] }]);
    await expect(gate.get("pit", SK)).rejects.toBeInstanceOf(OpenF1Error);
    expect(await gate.get("pit", SK)).toEqual([1]);
    expect(calls).toHaveLength(4);
  });

  it("drops queued work once every subscriber aborted, and never fetches it", async () => {
    const { gate, calls, flushDeferred } = harness([]);
    const lap1 = new AbortController();
    const first = gate.get("drivers", SK);
    const stale = gate.get("car_data", SK, { "date>=": "lap1" }, lap1.signal);
    lap1.abort();
    flushDeferred();
    await expect(stale).rejects.toMatchObject({ name: "AbortError" });
    await first;
    expect(await gate.get("car_data", SK, { "date>=": "lap2" })).toEqual([]);
    expect(calls.map((c) => path(c.url).split("?")[0])).toEqual(["drivers", "car_data"]);
    expect(calls[1]!.url).toContain("lap2");
  });

  it("keeps a request when another subscriber still wants it", async () => {
    const { gate, calls, flushDeferred } = harness([{ status: 200, body: [3] }]);
    const gone = new AbortController();
    void gate.get("laps", SK, {}, gone.signal);
    const kept = gate.get("laps", SK);
    gone.abort();
    flushDeferred();
    expect(await kept).toEqual([3]);
    expect(calls).toHaveLength(1);
  });

  it("treats 404 as no rows", async () => {
    const { gate } = harness([{ status: 404, body: { detail: "No results found." } }]);
    expect(await gate.get("team_radio", SK)).toEqual([]);
  });
});
