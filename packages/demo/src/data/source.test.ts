import type { OpenF1Lap } from "@f1/core";
import { describe, expect, it } from "vitest";
import { asSessionKey, type Gate } from "./openf1";
import { replaySource } from "./source";

// Zandvoort 9920, PIA lap 40, as OpenF1 serves it: no S1 time.
const pia40 = {
  session_key: 9920,
  meeting_key: 1267,
  driver_number: 81,
  lap_number: 40,
  date_start: "2025-08-31T13:55:11.670000+00:00",
  lap_duration: 74.117,
  duration_sector_1: null,
  duration_sector_2: 26.571,
  duration_sector_3: 22.282,
} as unknown as OpenF1Lap;
const gate = { get: async () => [pia40] } as unknown as Gate;

describe("replaySource", () => {
  it("restores a lap's missing S1 from the lap and the other sectors", async () => {
    const [lap] = await replaySource(asSessionKey(9920), gate).rows("laps", {});
    expect(lap?.duration_sector_1).toBe(25.264);
  });
});
