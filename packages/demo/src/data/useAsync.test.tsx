// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { OpenF1LockedError } from "./openf1";
import { useAsync, type Async } from "./useOpenF1";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("useAsync", () => {
  it("surfaces an error with retry, aborts on key change, and recovers without a reload", async () => {
    let calls = 0;
    const signals: AbortSignal[] = [];
    let seen: Async<string> = { status: "loading" };
    function Probe({ k }: { k: string }) {
      seen = useAsync(k, async (signal) => {
        signals.push(signal);
        calls++;
        if (calls === 1) throw new Error("offline");
        return `${k}#${calls}`;
      });
      return null;
    }
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(<Probe k="a" />));
    expect(seen).toMatchObject({ status: "error", error: { message: "offline" } });
    await act(async () => (seen as Extract<Async<string>, { status: "error" }>).retry());
    expect(seen).toEqual({ status: "ok", data: "a#2" });
    await act(async () => root.render(<Probe k="b" />));
    expect(signals.map((s) => s.aborted)).toEqual([true, true, false]);
    expect(seen).toEqual({ status: "ok", data: "b#3" });
  });
});

describe("useAsync while OpenF1 is locked", () => {
  it("re-probes every minute and keeps showing the lock meanwhile, then recovers", async () => {
    vi.useFakeTimers();
    let calls = 0;
    let seen: Async<string> = { status: "loading" };
    function Probe() {
      seen = useAsync("sessions", async () => {
        calls++;
        if (calls < 3) throw new OpenF1LockedError(true);
        return "back";
      });
      return null;
    }
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(<Probe />));
    expect(seen).toMatchObject({ status: "error", error: { name: "OpenF1LockedError" } });
    await act(async () => vi.advanceTimersByTime(59_000));
    expect(calls).toBe(1);
    await act(async () => vi.advanceTimersByTime(1_000));
    expect([calls, seen.status]).toEqual([2, "error"]);
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(seen).toEqual({ status: "ok", data: "back" });
    vi.useRealTimers();
  });
});
