import type {
  CarData,
  Interval,
  OpenF1Driver,
  OpenF1Lap,
  OpenF1Location,
  OpenF1Pit,
  Overtake,
  Position,
  RaceControl,
  Session,
  SessionResult,
  StartingGrid,
  Stint,
  TeamRadio,
  Weather,
} from "@f1/core";

export const OPENF1_BASE = "https://api.openf1.org/v1";

export type SessionKey = number & { readonly __brand: "SessionKey" };
export const asSessionKey = (n: number): SessionKey => n as SessionKey;

/** Row type per OpenF1 endpoint. The gate returns `OpenF1Rows[E][]`. */
export interface OpenF1Rows {
  drivers: OpenF1Driver;
  laps: OpenF1Lap;
  stints: Stint;
  pit: OpenF1Pit;
  position: Position;
  intervals: Interval;
  race_control: RaceControl;
  team_radio: TeamRadio;
  weather: Weather;
  car_data: CarData;
  location: OpenF1Location;
  overtakes: Overtake;
  session_result: SessionResult;
  starting_grid: StartingGrid;
}
export type OpenF1Endpoint = keyof OpenF1Rows;

/**
 * Extra filters. A key ending in an operator is emitted without `=`:
 * `{ "date>=": iso, "date<": iso, driver_number: 1 }` -> `date>=...&date<...&driver_number=1`.
 */
export type OpenF1Filters = Readonly<Record<string, string | number>>;

const encodePair = (key: string, value: string | number) =>
  /[<>]=?$/.test(key)
    ? `${key}${encodeURIComponent(value)}`
    : `${key}=${encodeURIComponent(value)}`;

/** Canonical URL: params sorted, so identical queries dedupe regardless of key order. */
export function openF1Url(path: string, params: OpenF1Filters): string {
  const query = Object.keys(params)
    .sort()
    .map((k) => encodePair(k, params[k] as string | number))
    .join("&");
  return `${OPENF1_BASE}/${path}${query ? `?${query}` : ""}`;
}

export class OpenF1Error extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`OpenF1 ${status} for ${url}`);
  }
}

export interface GateOptions {
  fetch: (url: string) => Promise<Response>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** Minimum spacing between request starts. */
  minIntervalMs: number;
  /** Max request starts in any rolling 60 s window. */
  perMinute: number;
  /** Retries after a 429 before giving up. */
  maxRetries: number;
  /** First 429 backoff; doubles each retry. Retry-After wins when present. */
  backoffMs: number;
}

export interface Gate {
  get<E extends OpenF1Endpoint>(
    endpoint: E,
    sessionKey: SessionKey,
    filters?: OpenF1Filters,
  ): Promise<OpenF1Rows[E][]>;
  getUrl<T>(url: string): Promise<T[]>;
}

/**
 * One queue for every OpenF1 request in the app. Identical URLs share one
 * promise for the life of the page; failures are evicted so they can retry.
 */
export function createGate(options: GateOptions): Gate {
  const cache = new Map<string, Promise<unknown[]>>();
  const starts: number[] = [];
  let chain: Promise<void> = Promise.resolve();

  const waitForSlot = async () => {
    for (;;) {
      const t = options.now();
      while (starts.length && t - (starts[0] as number) >= 60_000) starts.shift();
      const last = starts[starts.length - 1];
      const spacing = last === undefined ? 0 : last + options.minIntervalMs - t;
      const window =
        starts.length >= options.perMinute ? (starts[0] as number) + 60_000 - t : 0;
      const wait = Math.max(spacing, window);
      if (wait <= 0) {
        starts.push(t);
        return;
      }
      await options.sleep(wait);
    }
  };

  const slot = () => {
    const turn = chain.then(waitForSlot);
    chain = turn.catch(() => undefined);
    return turn;
  };

  const load = async (url: string): Promise<unknown[]> => {
    for (let attempt = 0; ; attempt++) {
      await slot();
      const res = await options.fetch(url);
      if (res.status === 429 && attempt < options.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await options.sleep(
          retryAfter > 0 ? retryAfter * 1000 : options.backoffMs * 2 ** attempt,
        );
        continue;
      }
      if (res.status === 404) return [];
      if (!res.ok) throw new OpenF1Error(url, res.status);
      const body: unknown = await res.json();
      return Array.isArray(body) ? body : [];
    }
  };

  const getUrl = <T>(url: string): Promise<T[]> => {
    let hit = cache.get(url);
    if (!hit) {
      hit = load(url);
      cache.set(url, hit);
      hit.catch(() => cache.delete(url));
    }
    return hit as Promise<T[]>;
  };

  return {
    getUrl,
    get: (endpoint, sessionKey, filters = {}) =>
      getUrl(openF1Url(endpoint, { ...filters, session_key: sessionKey })),
  };
}

export const gate: Gate = createGate({
  fetch: (url) => fetch(url),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
  minIntervalMs: 400,
  perMinute: 30,
  maxRetries: 4,
  backoffMs: 2000,
});

/** Race sessions of a season, for the session picker. Not session-keyed. */
export const getRaceSessions = (year: number) =>
  gate.getUrl<Session>(openF1Url("sessions", { year, session_name: "Race" }));
