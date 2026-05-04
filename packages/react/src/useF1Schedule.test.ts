import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useF1Schedule } from "./useF1Schedule";

vi.mock("@f1/core", () => ({
  getSchedule: vi.fn(),
}));

import { getSchedule } from "@f1/core";

const mockGetSchedule = getSchedule as ReturnType<typeof vi.fn>;

describe("useF1Schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return schedule data on success", async () => {
    const mockData = {
      season: "2024",
      Races: [
        {
          season: "2024",
          round: "1",
          url: "http://example.com",
          raceName: "Bahrain Grand Prix",
          Circuit: {
            circuitId: "bahrain",
            url: "http://example.com",
            circuitName: "Bahrain International Circuit",
            Location: {
              lat: "26.0325",
              long: "50.5106",
              locality: "Sakhir",
              country: "Bahrain",
            },
          },
          date: "2024-03-02",
          time: "15:00:00Z",
        },
      ],
    };

    mockGetSchedule.mockResolvedValue(mockData);

    const { result } = renderHook(() => useF1Schedule(2024));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("should use initialData for SSR hydration", async () => {
    const initialData = {
      season: "2024",
      Races: [
        {
          season: "2024",
          round: "1",
          url: "http://example.com",
          raceName: "Bahrain Grand Prix",
          Circuit: {
            circuitId: "bahrain",
            url: "http://example.com",
            circuitName: "Bahrain International Circuit",
            Location: {
              lat: "26.0325",
              long: "50.5106",
              locality: "Sakhir",
              country: "Bahrain",
            },
          },
          date: "2024-03-02",
          time: "15:00:00Z",
        },
      ],
    };

    const { result } = renderHook(() => useF1Schedule(2024, { initialData }));

    expect(result.current.data).toEqual(initialData);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle error state", async () => {
    mockGetSchedule.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useF1Schedule(2024));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();
  });

  it("should set loading state initially", () => {
    mockGetSchedule.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useF1Schedule(2024));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });
});
