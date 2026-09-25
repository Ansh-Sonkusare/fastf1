export interface DeepLink {
  readonly session: number | null;
  readonly lap: number | null;
  /** Seconds since lights out. Wins over `lap` when both are present. */
  readonly t: number | null;
  readonly a: number | null;
  readonly b: number | null;
}

const KEYS = ["session", "lap", "t", "a", "b"] as const;

const positiveInt = (raw: string | null): number | null => {
  const n = Number(raw);
  return raw !== null && raw !== "" && Number.isInteger(n) && n > 0 ? n : null;
};

const seconds = (raw: string | null): number | null => {
  const n = Number(raw);
  return raw !== null && raw !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

/** "?session=9920&t=3021.412&a=81&b=4" or "?session=9839&lap=38" -> DeepLink. Garbage values become null. */
export function parseDeepLink(search: string): DeepLink {
  const p = new URLSearchParams(search);
  return {
    session: positiveInt(p.get("session")),
    lap: positiveInt(p.get("lap")),
    t: seconds(p.get("t")),
    a: positiveInt(p.get("a")),
    b: positiveInt(p.get("b")),
  };
}

export function formatDeepLink(link: DeepLink): string {
  const value = (k: (typeof KEYS)[number]) => (k === "t" && link.t !== null ? Number(link.t.toFixed(3)) : link[k]);
  const parts = KEYS.flatMap((k) => (link[k] === null ? [] : [`${k}=${value(k)}`]));
  return parts.length ? `?${parts.join("&")}` : "";
}
