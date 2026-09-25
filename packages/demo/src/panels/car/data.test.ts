import type { Session } from "@f1/core";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleSession } from "../../app/types";
import { asSessionKey } from "../../data/openf1";
import * as openf1 from "../../data/openf1";
import { MONZA } from "./__fixtures__";
import { blockFilter, getCircuit, parseCircuit } from "./data";

vi.mock("../../data/openf1", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../data/openf1")>()),
  getRaceSessions: vi.fn(),
}));

describe("parseCircuit", () => {
  it("keeps Monza's rotation and 17 marshal sectors", () => {
    const circuit = parseCircuit(MONZA.circuit);
    expect([circuit?.rotation, circuit?.marshalSectors.length]).toEqual([95, 17]);
    expect(circuit?.marshalSectors[0]).toEqual({
      number: 1,
      trackPosition: { x: -1414.551025390625, y: -1183.938720703125 },
    });
  });

  it("treats an error page or an unexpected body as unavailable", () => {
    expect(parseCircuit({ error: "blocked" })).toBe(null);
    expect(parseCircuit({ rotation: 95, marshalSectors: [{ number: "1" }] })).toBe(null);
    expect(parseCircuit(null)).toBe(null);
  });
});

describe("blockFilter", () => {
  const session = { dateEnd: "2025-09-07T15:00:00+00:00" } as ConsoleSession;
  const lapBlockOf = (driver: number, lap: number) =>
    driver === 1 ? { fromLap: 41, toLap: 50, window: { start: `start-of-${lap}`, end: null } } : null;

  it("asks for one driver's block and runs to the session end when the block is open", () => {
    expect(blockFilter({ session, lapBlockOf }, 1, 44)).toEqual({
      driver_number: 1,
      "date>=": "start-of-44",
      "date<": "2025-09-07T15:00:00+00:00",
    });
  });

  it("holds the request without a driver or a block", () => {
    expect([blockFilter({ session, lapBlockOf }, null, 44), blockFilter({ session, lapBlockOf }, 4, 44)]).toEqual([null, null]);
  });
});

describe("getCircuit", () => {
  it("resolves to null, not a rejection, when the MultiViewer fetch fails, so the map can fall back to 'sector positions unavailable'", async () => {
    vi.mocked(openf1.getRaceSessions).mockResolvedValue([{ session_key: 9839, circuit_key: 70 } as Session]);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("network down"));
    const session = { sessionKey: asSessionKey(9839), year: 2025 } as ConsoleSession;

    await expect(getCircuit(session, new AbortController().signal)).resolves.toBe(null);

    fetchSpy.mockRestore();
  });

  it("resolves to null when the session's circuit can't be matched", async () => {
    vi.mocked(openf1.getRaceSessions).mockResolvedValue([{ session_key: 1, circuit_key: 70 } as Session]);
    const session = { sessionKey: asSessionKey(9839), year: 2025 } as ConsoleSession;

    await expect(getCircuit(session, new AbortController().signal)).resolves.toBe(null);
  });
});
