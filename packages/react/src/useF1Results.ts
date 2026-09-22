import { type ResultType, getRaceResults, toPromise } from "@f1/core";
import { useCallback } from "react";
import { useAsyncResource } from "./hooks";

export interface UseF1ResultsOptions {
  initialData?: readonly unknown[];
  type?: ResultType;
}

export interface UseF1ResultsResult {
  data: readonly unknown[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useF1Results(
  year: number,
  round: number,
  options?: UseF1ResultsOptions,
): UseF1ResultsResult {
  return useAsyncResource<readonly unknown[]>(
    useCallback(
      () => toPromise(getRaceResults(year, round, options?.type ?? "race")),
      [year, round, options?.type],
    ),
    options?.initialData,
  );
}
