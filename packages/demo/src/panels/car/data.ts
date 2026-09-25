import type { ConsoleSession, DriverNumber, PanelProps } from "../../app/types";
import { createGate, getRaceSessions, type OpenF1Filters } from "../../data/openf1";
import type { MarshalSector } from "./track";

export function blockFilter(
  props: Pick<PanelProps, "session" | "lapBlockOf">,
  driver: DriverNumber | null | undefined,
  lap: number | null | undefined,
): OpenF1Filters | null {
  const block = driver == null || lap == null ? null : props.lapBlockOf(driver, lap);
  if (!block) return null;
  return {
    driver_number: driver!,
    "date>=": block.window.start,
    "date<": block.window.end ?? props.session.dateEnd,
  };
}

export interface CircuitInfo {
  readonly rotation: number;
  readonly marshalSectors: readonly MarshalSector[];
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseCircuit(raw: unknown): CircuitInfo | null {
  const c = raw as { rotation?: unknown; marshalSectors?: unknown } | null;
  if (!c || !isNum(c.rotation) || !Array.isArray(c.marshalSectors)) return null;
  const marshalSectors = c.marshalSectors.filter(
    (m): m is MarshalSector => isNum(m?.number) && isNum(m?.trackPosition?.x) && isNum(m?.trackPosition?.y),
  );
  return marshalSectors.length ? { rotation: c.rotation, marshalSectors } : null;
}

const multiviewer = createGate({
  fetch: async (url, signal) => {
    const res = await fetch(url, { signal });
    return res.ok ? new Response(JSON.stringify([await res.json()])) : res;
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
  defer: (fn) => setTimeout(fn, 0),
  minIntervalMs: 0,
  perMinute: 60,
  maxRetries: 0,
  maxNetworkFailures: 1,
  backoffMs: 0,
  lockProbeMs: 0,
});

export async function getCircuit(session: ConsoleSession, signal: AbortSignal): Promise<CircuitInfo | null> {
  try {
    const races = await getRaceSessions(session.year, signal);
    const key = races.find((s) => s.session_key === session.sessionKey)?.circuit_key;
    if (key == null) return null;
    const [raw] = await multiviewer.getUrl<unknown>(`https://api.multiviewer.app/api/v1/circuits/${key}/${session.year}`, signal);
    return parseCircuit(raw);
  } catch (e) {
    if (signal.aborted) throw e;
    return null;
  }
}
