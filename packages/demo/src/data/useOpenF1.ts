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
  | { readonly status: "error"; readonly error: Error }
  | { readonly status: "ok"; readonly data: T };

/** Promise -> Async state. `load === null` stays loading (e.g. waiting on a dependency). */
export function useAsync<T>(key: string | null, load: () => Promise<T>): Async<T> {
  const [state, setState] = useState<{ key: string | null; value: Async<T> }>({
    key,
    value: { status: "loading" },
  });
  useEffect(() => {
    if (key === null) return;
    let live = true;
    load().then(
      (data) => live && setState({ key, value: { status: "ok", data } }),
      (error: unknown) =>
        live &&
        setState({
          key,
          value: { status: "error", error: error instanceof Error ? error : new Error(String(error)) },
        }),
    );
    return () => {
      live = false;
    };
  }, [key]);
  return state.key === key ? state.value : { status: "loading" };
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
  return useAsync(url, () => gate.get(endpoint, sessionKey, filters ?? {}));
}

type OkData<T> = { [K in keyof T]: T[K] extends Async<infer D> ? D : never };

/** First loading/error wins; otherwise all data as a tuple. */
export function combine<T extends readonly Async<unknown>[]>(...states: T): Async<OkData<T>> {
  for (const s of states) if (s.status !== "ok") return s;
  return { status: "ok", data: states.map((s) => (s as { data: unknown }).data) as OkData<T> };
}
