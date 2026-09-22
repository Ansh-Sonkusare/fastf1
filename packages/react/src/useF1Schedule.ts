import { type RaceTable, getSchedule, toPromise } from "@f1/core";
import { useCallback } from "react";
import { useAsyncResource } from "./hooks";

export interface UseF1ScheduleOptions {
  initialData?: RaceTable;
}

export interface UseF1ScheduleResult {
  data: RaceTable | null;
  isLoading: boolean;
  error: Error | null;
}

export function useF1Schedule(year: number, options?: UseF1ScheduleOptions): UseF1ScheduleResult {
  return useAsyncResource<RaceTable>(
    useCallback(() => toPromise(getSchedule(year)), [year]),
    options?.initialData,
  );
}
