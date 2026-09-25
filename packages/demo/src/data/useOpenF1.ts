import { useEffect, useState } from "react";
import {
  gate,
  openF1Url,
  type OpenF1Endpoint,
  type OpenF1Filters,
  type OpenF1Rows,
  type SessionKey,
} from "./openf1";

export type Async<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: Error; readonly retry: () => void }
  | { readonly status: "ok"; readonly data: T };

const LOADING: Async<never> = { status: "loading" };

/**
 * Promise -> Async state, keyed. `key === null` stays loading (e.g. waiting on a dependency).
 * Changing the key or unmounting aborts the previous load, which drops it from the gate's queue.
 */
export function useAsync<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): Async<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; attempt: number; value: Async<T> } | null>(null);
  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    const settle = (value: Async<T>) => {
      if (!controller.signal.aborted) setState({ key, attempt, value });
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
    return () => controller.abort();
  }, [key, attempt]);
  return state && state.key === key && state.attempt === attempt ? state.value : LOADING;
}

/**
 * Fetch one OpenF1 endpoint for the console's session through the shared gate.
 * Pass `filters === null` to hold the request (e.g. no driver focused yet).
 */
export function useOpenF1<E extends OpenF1Endpoint>(
  endpoint: E,
  sessionKey: SessionKey,
  filters: OpenF1Filters | null = {},
): Async<OpenF1Rows[E][]> {
  const url = filters === null ? null : openF1Url(endpoint, { ...filters, session_key: sessionKey });
  return useAsync(url, (signal) => gate.get(endpoint, sessionKey, filters ?? {}, signal));
}

type OkData<T> = { [K in keyof T]: T[K] extends Async<infer D> ? D : never };

/** First loading/error wins; otherwise all data as a tuple. */
export function combine<T extends readonly Async<unknown>[]>(...states: T): Async<OkData<T>> {
  for (const s of states) if (s.status !== "ok") return s;
  return { status: "ok", data: states.map((s) => (s as { data: unknown }).data) as OkData<T> };
}
