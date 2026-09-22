import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../http/service";
import { getDriverCareer } from "./drivers";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

describe("getDriverCareer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return the driver career profile", async () => {
    const mockResponse = {
      MRData: {
        DriverTable: {
          driverId: "hamilton",
          Drivers: [
            {
              driverId: "hamilton",
              permanentNumber: "44",
              code: "HAM",
              url: "https://en.wikipedia.org/wiki/Lewis_Hamilton",
              givenName: "Lewis",
              familyName: "Hamilton",
              dateOfBirth: "1985-01-07",
              nationality: "British",
            },
          ],
        },
      },
    };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await run(getDriverCareer("hamilton"));

    expect(result?.driverId).toBe("hamilton");
    expect(result?.code).toBe("HAM");
    expect(result?.permanentNumber).toBe("44");
    expect(result?.nationality).toBe("British");
  });

  it("should return null when the driver does not exist", async () => {
    const mockResponse = { MRData: { DriverTable: { driverId: "nowhere", Drivers: [] } } };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await run(getDriverCareer("nowhere"));

    expect(result).toBeNull();
  });
});
