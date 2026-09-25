import type { OpenF1Location } from "@f1/core";
import { describe, expect, it } from "vitest";
import { indexLocations, positionAt, windowsCovering } from "./windows";

const T = Date.parse("2025-08-31T13:10:00Z");
const loc = (driver_number: number, s: number, x: number, y: number): OpenF1Location => ({
  session_key: 9920,
  meeting_key: 1267,
  driver_number,
  date: new Date(T + s * 1000).toISOString(),
  x,
  y,
});

describe("windowsCovering", () => {
  it("snaps to 30 s windows on the epoch", () => {
    expect(windowsCovering(T + 5_000, T + 40_000).map((w) => (w.start - T) / 1000)).toEqual([0, 30]);
    expect(windowsCovering(T, T + 30_000)).toHaveLength(1);
  });
});

describe("positionAt", () => {
  const tracks = indexLocations([loc(1, 0.25, 110, 10), loc(4, 0, 10, 10), loc(1, 0, 10, 10), loc(1, 0.5, 110, 110), loc(1, 5, 10, 10)]);

  it("interpolates between the samples around the instant, out of order input included", () => {
    expect(positionAt(tracks.get(1)!, T + 125, T + 1_000)).toEqual([60, 10]);
    expect(positionAt(tracks.get(1)!, T + 375, T + 1_000)).toEqual([110, 60]);
  });

  it("has no position across a gap or outside the samples", () => {
    expect(positionAt(tracks.get(1)!, T + 3_000, T + 9_000)).toBeNull();
    expect(positionAt(tracks.get(1)!, T - 1, T)).toBeNull();
    expect(positionAt(tracks.get(4)!, T, T)).toEqual([10, 10]);
  });

  it("drops (0, 0) samples, which mean no fix", () => {
    const withGap = indexLocations([loc(1, 0, 10, 10), loc(1, 0.25, 0, 0), loc(1, 0.5, 20, 20)]);
    expect(positionAt(withGap.get(1)!, T + 250, T + 1_000)).toEqual([15, 15]);
  });

  it("never interpolates toward a sample after the cursor", () => {
    expect(positionAt(tracks.get(1)!, T + 375, T + 400)).toBeNull();
  });
});
