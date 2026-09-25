import { describe, expect, it } from "vitest";
import { pick, replayReducer, resolveFocus, type ReplayState } from "./replay";

const base: ReplayState = { at: 5_000, start: 1_000, end: 9_000, speed: 1, playing: false, focus: { a: 1, b: 4 } };

describe("pick", () => {
  it("click focuses A and keeps B", () => expect(pick({ a: 1, b: 4 }, 16, false)).toEqual({ a: 16, b: 4 }));
  it("click on B swaps the old A into B", () => expect(pick({ a: 1, b: 4 }, 4, false)).toEqual({ a: 4, b: 1 }));
  it("shift-click sets B", () => expect(pick({ a: 1, b: 4 }, 81, true)).toEqual({ a: 1, b: 81 }));
  it("shift-click on A is ignored", () => expect(pick({ a: 1, b: 4 }, 1, true)).toEqual({ a: 1, b: 4 }));
});

describe("replayReducer", () => {
  it("clamps seeks into lights out..flag", () => {
    expect(replayReducer(base, { type: "seek", at: 99_000 }).at).toBe(9_000);
    expect(replayReducer(base, { type: "seek", at: -3 }).at).toBe(1_000);
  });
  it("ticks only while playing, by elapsed time times speed", () => {
    expect(replayReducer(base, { type: "tick", elapsedMs: 250 })).toBe(base);
    expect(replayReducer({ ...base, playing: true }, { type: "tick", elapsedMs: 250 }).at).toBe(5_250);
    expect(replayReducer({ ...base, playing: true, speed: 8 }, { type: "tick", elapsedMs: 250 }).at).toBe(7_000);
  });
  it("stops at the flag", () => {
    expect(replayReducer({ ...base, at: 8_900, playing: true }, { type: "tick", elapsedMs: 250 })).toMatchObject({ at: 9_000, playing: false });
  });
  it("play from the flag restarts at lights out", () => {
    expect(replayReducer({ ...base, at: 9_000 }, { type: "toggle" })).toMatchObject({ at: 1_000, playing: true });
  });
  it("load clamps a deep-linked instant to the race", () => {
    expect(replayReducer(base, { type: "load", start: 2_000, end: 3_000, at: 70_000 })).toMatchObject({ at: 3_000, start: 2_000, end: 3_000 });
  });
  it("keeps speed across pause and play", () => {
    const fast = replayReducer(base, { type: "speed", speed: 4 });
    expect(replayReducer(replayReducer(fast, { type: "toggle" }), { type: "toggle" }).speed).toBe(4);
  });
});

describe("resolveFocus", () => {
  const known = new Set([1, 4, 81, 44]);
  const order = [4, 1, 81, 44];
  it("keeps a valid deep link", () => expect(resolveFocus({ a: 44, b: 1 }, known, order)).toEqual({ a: 44, b: 1 }));
  it("drops unknown drivers and defaults from the classification", () =>
    expect(resolveFocus({ a: 999, b: null }, known, order)).toEqual({ a: 4, b: 1 }));
  it("never lets B equal A", () => expect(resolveFocus({ a: 1, b: 1 }, known, order)).toEqual({ a: 1, b: 4 }));
  it("keeps a lone B and fills A", () => expect(resolveFocus({ a: null, b: 44 }, known, order)).toEqual({ a: 4, b: 44 }));
});
