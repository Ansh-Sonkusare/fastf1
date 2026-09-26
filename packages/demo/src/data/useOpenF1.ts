import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { cut } from "./cutoff";
import {
  isLocked,
  openF1Url,
  type OpenF1Endpoint,
  type OpenF1Filters,
  type OpenF1Rows,
  type SessionKey,
} from "./openf1";
import { CursorContext, useRaceSource } from "./source";

export type Async<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: Error; readonly retry: () => void }
  | { readonly status: "ok"; readonly data: T };

const LOADING: Async<never> = { status: "loading" };
export const LOCK_REPROBE_MS = 60_000;

/**
 * Promise -> Async state, keyed. `key === null` stays loading (e.g. waiting on a dependency).
 * Changing the key or unmounting aborts the previous load, which drops it from the gate's queue.
 * A locked OpenF1 (live session) re-probes on its own every minute, so the page recovers when it ends.
 */
export function useAsync<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): Async<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; attempt: number; value: Async<T> } | null>(null);
  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    let reprobe: ReturnType<typeof setTimeout> | undefined;
    const settle = (value: Async<T>) => {
      if (controller.signal.aborted) return;
      setState({ key, attempt, value });
      if (value.status === "error" && isLocked(value.error))
        reprobe = setTimeout(() => setAttempt((n) => n + 1), LOCK_REPROBE_MS);
    };
    load(controller.signal).then(
      (data) => settle({ status: "ok", data }),
      (error: unknown) =>
        settle({
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
          retry: () => setAttempt((n) => n + 1),
        }),
    );
    return () => {
      controller.abort();
      clearTimeout(reprobe);
    };
  }, [key, attempt]);
  if (!state || state.key !== key) return LOADING;
  const reprobing = state.value.status === "error" && isLocked(state.value.error);
  return state.attempt === attempt || reprobing ? state.value : LOADING;
}

/**
 * One OpenF1 endpoint for the console's session, read through the RaceSource and cut at the cursor, so a panel
 * never sees a row from after `at`. The result keeps its identity while the visible rows are unchanged.
 * Pass `filters === null` to hold the request (e.g. no driver focused yet).
 */
export function useOpenF1<E extends OpenF1Endpoint>(
  endpoint: E,
  sessionKey: SessionKey,
  filters: OpenF1Filters | null = {},
): Async<OpenF1Rows[E][]> {
  const source = useRaceSource();
  const cursor = useContext(CursorContext);
  const url = filters === null ? null : openF1Url(endpoint, { ...filters, session_key: sessionKey });
  const raw = useAsync(url, (signal) => source.rows(endpoint, filters ?? {}, signal));
  const rows = raw.status === "ok" ? raw.data : null;
  const visible = useStable(useMemo(() => (rows ? cut(endpoint, rows, cursor) : null), [endpoint, rows, cursor]));
  return useMemo(
    () => (raw.status === "ok" && visible ? { status: "ok", data: visible as OpenF1Rows[E][] } : raw),
    [raw, visible],
  );
}

/** The previous array while its elements are the same objects, so downstream memos don't rerun each tick. */
function useStable<T>(next: readonly T[] | null): readonly T[] | null {
  const prev = useRef(next);
  const same = prev.current !== null && next !== null && prev.current.length === next.length && next.every((x, i) => x === prev.current![i]);
  if (!same) prev.current = next;
  return prev.current;
}

type OkData<T> = { [K in keyof T]: T[K] extends Async<infer D> ? D : never };

/** First loading/error wins; otherwise all data as a tuple. */
export function combine<T extends readonly Async<unknown>[]>(...states: T): Async<OkData<T>> {
  for (const s of states) if (s.status !== "ok") return s;
  return { status: "ok", data: states.map((s) => (s as { data: unknown }).data) as OkData<T> };
}
