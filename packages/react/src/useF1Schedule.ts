import { type RaceTable, getSchedule } from "@f1/core";
import { useEffect, useState } from "react";

export interface UseF1ScheduleOptions {
  initialData?: RaceTable;
}

export interface UseF1ScheduleResult {
  data: RaceTable | null;
  isLoading: boolean;
  error: Error | null;
}

export function useF1Schedule(year: number, options?: UseF1ScheduleOptions): UseF1ScheduleResult {
  const [data, setData] = useState<RaceTable | null>(options?.initialData ?? null);
  const [isLoading, setIsLoading] = useState(!options?.initialData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.initialData) {
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getSchedule(year)
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
  }, [year, options?.initialData]);

  return { data, isLoading, error };
}
