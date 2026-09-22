import type {
  CarData,
  GetFastestLapParams,
  GetRacePitStopsParams,
  GetRaceStintsParams,
  GetRaceTelemetryParams,
  GetRaceWeatherParams,
  OpenF1Pit,
  Stint,
  Weather,
} from "@f1/core";
import {
  getFastestLap,
  getRacePitStops,
  getRaceStints,
  getRaceTelemetry,
  getRaceWeather,
  toPromise,
} from "@f1/core";
import { useCallback } from "react";
import { useAsyncResource } from "./hooks";

type SessionKind = "race" | "qualifying" | "sprint" | "practice";

export interface UseRaceStintsResult {
  data: Stint[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRaceStints(
  year: number,
  raceName: string,
  driverCode?: string,
  session: SessionKind = "race",
  meetingKey?: number,
  options?: { initialData?: Stint[] },
): UseRaceStintsResult {
  return useAsyncResource(
    useCallback(() => {
      const params: GetRaceStintsParams = { year, raceName, session };
      if (driverCode) params.driver = driverCode;
      if (meetingKey) params.meetingKey = meetingKey;
      return toPromise(getRaceStints(params)).then((result) => [...result]);
    }, [year, raceName, driverCode, session, meetingKey]),
    options?.initialData,
  );
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
  session: SessionKind = "race",
  meetingKey?: number,
  options?: { initialData?: OpenF1Pit[] },
): UseRacePitStopsResult {
  return useAsyncResource(
    useCallback(() => {
      const params: GetRacePitStopsParams = { year, raceName, session };
      if (driverCode) params.driver = driverCode;
      if (meetingKey) params.meetingKey = meetingKey;
      return toPromise(getRacePitStops(params)).then((result) => [...result]);
    }, [year, raceName, driverCode, session, meetingKey]),
    options?.initialData,
  );
}

export interface UseRaceWeatherResult {
  data: Weather[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRaceWeather(
  year: number,
  raceName: string,
  session: SessionKind = "race",
  meetingKey?: number,
  options?: { initialData?: Weather[] },
): UseRaceWeatherResult {
  return useAsyncResource(
    useCallback(() => {
      const params: GetRaceWeatherParams = { year, raceName, session };
      if (meetingKey) params.meetingKey = meetingKey;
      return toPromise(getRaceWeather(params)).then((result) => [...result]);
    }, [year, raceName, session, meetingKey]),
    options?.initialData,
  );
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
  session: SessionKind = "race",
  meetingKey?: number,
  lap?: number,
  lapStart?: number,
  lapEnd?: number,
  options?: { initialData?: CarData[] },
): UseRaceTelemetryResult {
  return useAsyncResource(
    useCallback(() => {
      const params: GetRaceTelemetryParams = { year, raceName, driver: driverCode, session };
      if (meetingKey) params.meetingKey = meetingKey;
      if (lap) params.lap = lap;
      if (lapStart) params.lapStart = lapStart;
      if (lapEnd) params.lapEnd = lapEnd;
      return toPromise(getRaceTelemetry(params)).then((result) => [...result]);
    }, [year, raceName, driverCode, session, meetingKey, lap, lapStart, lapEnd]),
    options?.initialData,
  );
}

export interface UseFastestLapResult {
  lap: number | null;
  isLoading: boolean;
  error: Error | null;
}

export function useFastestLap(
  year: number,
  raceName: string,
  driverCode: string,
  session: SessionKind = "race",
  meetingKey?: number,
  round?: number,
  sessionKey?: number,
  options?: { initialData?: number | null },
): UseFastestLapResult {
  const resource = useAsyncResource(
    useCallback(() => {
      const params: GetFastestLapParams = { year, raceName, driver: driverCode, session };
      if (meetingKey) params.meetingKey = meetingKey;
      if (round) params.round = round;
      if (sessionKey) params.sessionKey = sessionKey;
      return toPromise(getFastestLap(params));
    }, [year, raceName, driverCode, session, meetingKey, round, sessionKey]),
    options?.initialData ?? undefined,
  );

  return { lap: resource.data, isLoading: resource.isLoading, error: resource.error };
}
