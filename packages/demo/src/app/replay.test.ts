import { describe, expect, it } from "vitest";
import { pick, replayReducer, type ReplayState } from "./replay";

const base: ReplayState = { lap: 10, totalLaps: 58, playing: false, focus: { a: 1, b: 4 } };

describe("pick", () => {
  it("click focuses A and keeps B", () => expect(pick({ a: 1, b: 4 }, 16, false)).toEqual({ a: 16, b: 4 }));
  it("click on B swaps the old A into B", () => expect(pick({ a: 1, b: 4 }, 4, false)).toEqual({ a: 4, b: 1 }));
  it("shift-click sets B", () => expect(pick({ a: 1, b: 4 }, 81, true)).toEqual({ a: 1, b: 81 }));
  it("shift-click on A is ignored", () => expect(pick({ a: 1, b: 4 }, 1, true)).toEqual({ a: 1, b: 4 }));
});

describe("replayReducer", () => {
  it("clamps seeks into 1..totalLaps", () => {
    expect(replayReducer(base, { type: "seek", lap: 99 }).lap).toBe(58);
    expect(replayReducer(base, { type: "seek", lap: -3 }).lap).toBe(1);
  });
  it("ticks only while playing and stops at the flag", () => {
    expect(replayReducer(base, { type: "tick" })).toBe(base);
    const end = replayReducer({ ...base, lap: 57, playing: true }, { type: "tick" });
    expect(end).toMatchObject({ lap: 58, playing: false });
  });
  it("play from the last lap restarts at lap 1", () => {
    expect(replayReducer({ ...base, lap: 58 }, { type: "toggle" })).toMatchObject({ lap: 1, playing: true });
  });
  it("load clamps a deep-linked lap to the session length", () => {
    expect(replayReducer({ ...base, lap: 70, totalLaps: 1 }, { type: "load", totalLaps: 53 }).lap).toBe(53);
  });
});
