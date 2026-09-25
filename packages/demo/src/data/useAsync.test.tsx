// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
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
