import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type F1ClientService, F1ClientServiceLive } from "../http/service";
import { getCircuitInfo } from "./circuits";

function run<A, E>(effect: Effect.Effect<A, E, F1ClientService>) {
  return Effect.runPromise(Effect.provide(effect, F1ClientServiceLive));
}

describe("getCircuitInfo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return circuit details", async () => {
    const mockResponse = {
      MRData: {
        CircuitTable: {
          circuitId: "silverstone",
          Circuits: [
            {
              circuitId: "silverstone",
              url: "https://en.wikipedia.org/wiki/Silverstone_Circuit",
              circuitName: "Silverstone Circuit",
              Location: {
                lat: "52.0786",
                long: "-1.01694",
                locality: "Silverstone",
                country: "UK",
              },
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

    const result = await run(getCircuitInfo("silverstone"));

    expect(result?.circuitId).toBe("silverstone");
    expect(result?.circuitName).toBe("Silverstone Circuit");
    expect(result?.Location.country).toBe("UK");
  });

  it("should return null when the circuit does not exist", async () => {
    const mockResponse = { MRData: { CircuitTable: { circuitId: "nowhere", Circuits: [] } } };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await run(getCircuitInfo("nowhere"));

    expect(result).toBeNull();
  });

  it("should normalize whitespace in the circuit id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ MRData: { CircuitTable: { Circuits: [] } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchMock;

    await run(getCircuitInfo("Silverstone Circuit"));

    const firstArg = fetchMock.mock.calls[0][0];
    expect(String(firstArg)).toContain("circuits/silverstone_circuit.json");
  });
});
