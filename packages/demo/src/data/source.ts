import type { OpenF1Lap } from "@f1/core";
import { createContext, useContext } from "react";
import { OMNISCIENT, type Cursor } from "./cutoff";
import { gate as sharedGate, type Gate, type OpenF1Endpoint, type OpenF1Filters, type OpenF1Rows, type SessionKey } from "./openf1";

/** Where a session's rows come from. Every source speaks OpenF1 row shapes, the model every panel reads. */
export interface RaceSource {
  readonly sessionKey: SessionKey;
  readonly mode: "replay";
  rows<E extends OpenF1Endpoint>(endpoint: E, filters: OpenF1Filters, signal?: AbortSignal): Promise<OpenF1Rows[E][]>;
}

/** OpenF1's archive drops the odd S1 time. Live timing showed it, and the lap and the other two sectors give it exactly. */
export function withSector1(lap: OpenF1Lap): OpenF1Lap {
  const { lap_duration: d, duration_sector_1: s1, duration_sector_2: s2, duration_sector_3: s3 } = lap;
  return s1 == null && d != null && s2 != null && s3 != null ? { ...lap, duration_sector_1: Math.round((d - s2 - s3) * 1000) / 1000 } : lap;
}

/** A past session, fetched whole through the rate-limited gate. The cursor hides what hasn't happened yet. */
export function replaySource(sessionKey: SessionKey, gate: Gate = sharedGate): RaceSource {
  return {
    sessionKey,
    mode: "replay",
    rows: async (endpoint, filters, signal) => {
      const rows = await gate.get(endpoint, sessionKey, filters, signal);
      return endpoint === "laps" ? ((rows as OpenF1Lap[]).map(withSector1) as typeof rows) : rows;
    },
  };
}

export const RaceSourceContext = createContext<RaceSource | null>(null);
export const CursorContext = createContext<Cursor>(OMNISCIENT);

export function useRaceSource(): RaceSource {
  const source = useContext(RaceSourceContext);
  if (!source) throw new Error("useRaceSource outside a RaceSourceContext provider");
  return source;
}
