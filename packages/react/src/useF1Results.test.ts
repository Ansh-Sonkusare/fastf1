import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useF1Results } from "./useF1Results";

vi.mock("@f1/core", () => ({
  getRaceResults: vi.fn(),
  toPromise: (x: unknown) => x,
}));

import { getRaceResults } from "@f1/core";

const mockGetRaceResults = getRaceResults as ReturnType<typeof vi.fn>;

describe("useF1Results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return results data on success", async () => {
    const mockData = [
      {
        season: "2026",
        round: "1",
        url: "http://example.com",
        raceName: "Bahrain Grand Prix",
        Results: [
          {
            Driver: {
              driverId: "hamilton",
              code: "HAM",
              givenName: "Lewis",
              familyName: "Hamilton",
            },
            Constructor: {
              constructorId: "mercedes",
              name: "Mercedes",
            },
            position: "1",
            positionText: "1",
            points: "25",
            laps: "57",
            grid: "1",
            status: "Finished",
          },
        ],
      },
    ];

    mockGetRaceResults.mockResolvedValue(mockData);

    const { result } = renderHook(() => useF1Results(2026, 1));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("should use initialData for SSR hydration", async () => {
    const initialData = [
      {
        season: "2026",
        round: "1",
        url: "http://example.com",
        raceName: "Bahrain Grand Prix",
        Results: [
          {
            Driver: {
              driverId: "hamilton",
              code: "HAM",
            },
            Constructor: {
              constructorId: "mercedes",
            },
            position: "1",
          },
        ],
      },
    ];

    const { result } = renderHook(() => useF1Results(2026, 1, { initialData }));

    expect(result.current.data).toEqual(initialData);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle error state", async () => {
    mockGetRaceResults.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useF1Results(2026, 1));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();
  });

  it("should set loading state initially", () => {
    mockGetRaceResults.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useF1Results(2026, 1));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });
});
