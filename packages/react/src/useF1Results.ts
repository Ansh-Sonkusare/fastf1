import { type ResultType, getRaceResults } from "@f1/core";
import { useEffect, useState } from "react";

export interface UseF1ResultsOptions {
  initialData?: unknown[];
  type?: ResultType;
}

export interface UseF1ResultsResult {
  data: unknown[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useF1Results(
  year: number,
  round: number,
  options?: UseF1ResultsOptions,
): UseF1ResultsResult {
  const [data, setData] = useState<unknown[] | null>(options?.initialData ?? null);
  const [isLoading, setIsLoading] = useState(!options?.initialData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.initialData) {
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getRaceResults(year, round, options?.type ?? "race")
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
  }, [year, round, options?.type, options?.initialData]);

  return { data, isLoading, error };
}
