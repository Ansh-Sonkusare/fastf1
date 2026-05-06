import type {
  CarData,
  GetRacePitStopsParams,
  GetRaceStintsParams,
  GetRaceTelemetryParams,
  GetRaceWeatherParams,
  OpenF1Pit,
  Stint,
  Weather,
} from "@f1/core";
import { getRacePitStops, getRaceStints, getRaceTelemetry, getRaceWeather } from "@f1/core";
import { useEffect, useState } from "react";

export interface UseRaceStintsResult {
  data: Stint[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRaceStints(
  year: number,
  raceName: string,
  driverCode?: string,
  options?: { initialData?: Stint[] },
): UseRaceStintsResult {
  const [data, setData] = useState<Stint[] | null>(options?.initialData ?? null);
  const [isLoading, setIsLoading] = useState(!options?.initialData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.initialData) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params: GetRaceStintsParams = { year, raceName };
    if (driverCode) params.driver = driverCode;

    getRaceStints(params)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year, raceName, driverCode, options?.initialData]);

  return { data, isLoading, error };
}

export interface UseRacePitStopsResult {
  data: OpenF1Pit[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRacePitStops(
  year: number,
  raceName: string,
  driverCode?: string,
  options?: { initialData?: OpenF1Pit[] },
): UseRacePitStopsResult {
  const [data, setData] = useState<OpenF1Pit[] | null>(options?.initialData ?? null);
  const [isLoading, setIsLoading] = useState(!options?.initialData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.initialData) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params: GetRacePitStopsParams = { year, raceName };
    if (driverCode) params.driver = driverCode;

    getRacePitStops(params)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year, raceName, driverCode, options?.initialData]);

  return { data, isLoading, error };
}

export interface UseRaceWeatherResult {
  data: Weather[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRaceWeather(
  year: number,
  raceName: string,
  options?: { initialData?: Weather[] },
): UseRaceWeatherResult {
  const [data, setData] = useState<Weather[] | null>(options?.initialData ?? null);
  const [isLoading, setIsLoading] = useState(!options?.initialData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.initialData) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getRaceWeather({ year, raceName })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year, raceName, options?.initialData]);

  return { data, isLoading, error };
}

export interface UseRaceTelemetryResult {
  data: CarData[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRaceTelemetry(
  year: number,
  raceName: string,
  driverCode: string,
  options?: { initialData?: CarData[] },
): UseRaceTelemetryResult {
  const [data, setData] = useState<CarData[] | null>(options?.initialData ?? null);
  const [isLoading, setIsLoading] = useState(!options?.initialData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.initialData) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getRaceTelemetry({ year, raceName, driver: driverCode })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year, raceName, driverCode, options?.initialData]);

  return { data, isLoading, error };
}
