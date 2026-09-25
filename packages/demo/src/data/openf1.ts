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

/**
 * OpenF1 refuses all unauthenticated access, past sessions included, while a live F1 session runs.
 * `inferred` when the browser only saw repeated network failures: the lockout 401 carries no
 * CORS header, so the page can't tell it from being offline, DNS failing or a blocked host.
 */
export class OpenF1LockedError extends Error {
  override readonly name = "OpenF1LockedError";
  constructor(readonly inferred: boolean) {
    super("OpenF1 is locked while a live F1 session runs");
  }
}

export const isLocked = (error: unknown): error is OpenF1LockedError => error instanceof OpenF1LockedError;

export interface GateOptions {
  fetch: (url: string, signal: AbortSignal) => Promise<Response>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** Defers cancellation so an immediate re-subscribe (StrictMode, fast remount) keeps the request. */
  defer: (fn: () => void) => void;
  /** Minimum spacing between request starts. */
  minIntervalMs: number;
  /** Max request starts in any rolling 60 s window. */
  perMinute: number;
  /** Retries after a 429 or unreadable body before giving up. */
  maxRetries: number;
  /** Consecutive network failures (backoff doubling from backoffMs) before inferring a lockout. */
  maxNetworkFailures: number;
  /** First backoff; doubles each retry. Retry-After wins when present. */
  backoffMs: number;
  /** While locked, requests fail without fetching; one probe goes out per this interval. */
  lockProbeMs: number;
}

export interface Gate {
  get<E extends OpenF1Endpoint>(
    endpoint: E,
    sessionKey: SessionKey,
    filters?: OpenF1Filters,
    signal?: AbortSignal,
  ): Promise<OpenF1Rows[E][]>;
  getUrl<T>(url: string, signal?: AbortSignal): Promise<T[]>;
}

interface Entry {
  readonly url: string;
  readonly promise: Promise<unknown[]>;
  readonly resolve: (rows: unknown[]) => void;
  readonly reject: (error: Error) => void;
  readonly controller: AbortController;
  state: "queued" | "inflight" | "done";
  subscribers: number;
  /** 429 / unreadable-body retries so far. */
  attempt: number;
  /** Consecutive network failures (a CORS-less lockout 401 looks like one). */
  netFailures: number;
}

/**
 * One FIFO queue for every OpenF1 request in the app.
 * - Identical URLs share one entry for the life of the page.
 * - An entry whose every subscriber aborted is dropped from the queue (or aborted in flight).
 * - A 429 or network failure pauses the whole queue, then retries that request first.
 * - Failed entries are evicted so a later call starts fresh.
 */
export function createGate(options: GateOptions): Gate {
  const cache = new Map<string, Entry>();
  const queue: Entry[] = [];
  const starts: number[] = [];
  let pausedUntil = 0;
  let lockedUntil = 0;
  let lock: OpenF1LockedError | null = null;
  let pumping = false;

  const finish = (e: Entry, outcome: { rows: unknown[] } | { error: Error }) => {
    if (e.state === "done") return;
    e.state = "done";
    if ("rows" in outcome) e.resolve(outcome.rows);
    else {
      if (cache.get(e.url) === e) cache.delete(e.url);
      e.reject(outcome.error);
    }
  };

  const waitForSlot = async (): Promise<boolean> => {
    for (;;) {
      if (!queue.length) return false;
      const t = options.now();
      while (starts.length && t - (starts[0] as number) >= 60_000) starts.shift();
      const last = starts[starts.length - 1];
      const wait = Math.max(
        last === undefined ? 0 : last + options.minIntervalMs - t,
        starts.length >= options.perMinute ? (starts[0] as number) + 60_000 - t : 0,
        pausedUntil - t,
      );
      if (wait <= 0) return true;
      await options.sleep(wait);
    }
  };

  const pump = async () => {
    if (pumping) return;
    pumping = true;
    try {
      while (await waitForSlot()) {
        const e = queue.shift() as Entry;
        if (lock && options.now() < lockedUntil) {
          finish(e, { error: lock });
          continue;
        }
        starts.push(options.now());
        e.state = "inflight";
        void run(e);
      }
    } finally {
      pumping = false;
    }
    if (queue.length) void pump();
  };

  const enterLock = (e: Entry, inferred: boolean) => {
    lock = new OpenF1LockedError(inferred);
    lockedUntil = options.now() + options.lockProbeMs;
    finish(e, { error: lock });
    for (const queued of queue.splice(0)) finish(queued, { error: lock });
  };

  const pauseAndRequeue = (e: Entry, ms: number) => {
    pausedUntil = Math.max(pausedUntil, options.now() + ms);
    e.state = "queued";
    queue.unshift(e);
    void pump();
  };

  const retryLater = (e: Entry, retryAfterS: number, error: Error) => {
    if (e.attempt >= options.maxRetries) return finish(e, { error });
    const backoff = retryAfterS > 0 ? retryAfterS * 1000 : options.backoffMs * 2 ** e.attempt;
    e.attempt++;
    pauseAndRequeue(e, backoff);
  };

  const networkFailed = (e: Entry) => {
    e.netFailures++;
    if (lock || e.netFailures >= options.maxNetworkFailures) return enterLock(e, true);
    pauseAndRequeue(e, options.backoffMs * 2 ** (e.netFailures - 1));
  };

  const run = async (e: Entry) => {
    let res: Response;
    try {
      res = await options.fetch(e.url, e.controller.signal);
    } catch (error) {
      if (e.controller.signal.aborted) return;
      return networkFailed(e);
    }
    if (res.status === 401 && /live/i.test(await res.text().catch(() => ""))) return enterLock(e, false);
    lock = null;
    if (res.status === 429) return retryLater(e, Number(res.headers.get("retry-after")), new OpenF1Error(e.url, 429));
    if (res.status === 404) return finish(e, { rows: [] });
    if (!res.ok) return finish(e, { error: new OpenF1Error(e.url, res.status) });
    try {
      const body: unknown = await res.json();
      finish(e, { rows: Array.isArray(body) ? body : [] });
    } catch (error) {
      if (!e.controller.signal.aborted) retryLater(e, 0, error instanceof Error ? error : new Error(String(error)));
    }
  };

  const cancel = (e: Entry) => {
    if (e.subscribers > 0 || e.state === "done") return;
    const i = queue.indexOf(e);
    if (i >= 0) queue.splice(i, 1);
    e.controller.abort();
    finish(e, { error: new DOMException("cancelled", "AbortError") });
  };

  const getUrl = <T>(url: string, signal?: AbortSignal): Promise<T[]> => {
    let e = cache.get(url);
    if (!e) {
      let resolve!: Entry["resolve"];
      let reject!: Entry["reject"];
      const promise = new Promise<unknown[]>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      promise.catch(() => undefined);
      e = { url, promise, resolve, reject, controller: new AbortController(), state: "queued", subscribers: 0, attempt: 0, netFailures: 0 };
      cache.set(url, e);
      queue.push(e);
      void pump();
    }
    const entry = e;
    entry.subscribers++;
    signal?.addEventListener(
      "abort",
      () => {
        entry.subscribers--;
        options.defer(() => cancel(entry));
      },
      { once: true },
    );
    return entry.promise as Promise<T[]>;
  };

  return {
    getUrl,
    get: (endpoint, sessionKey, filters = {}, signal) =>
      getUrl(openF1Url(endpoint, { ...filters, session_key: sessionKey }), signal),
  };
}

export const gate: Gate = createGate({
  fetch: (url, signal) => fetch(url, { signal }),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
  defer: (fn) => setTimeout(fn, 0),
  minIntervalMs: 400,
  perMinute: 30,
  maxRetries: 4,
  maxNetworkFailures: 4,
  backoffMs: 2000,
  lockProbeMs: 60_000,
});

/** Race sessions of a season, for the session picker. Not session-keyed. */
export const getRaceSessions = (year: number, signal?: AbortSignal) =>
  gate.getUrl<Session>(openF1Url("sessions", { year, session_name: "Race" }), signal);
