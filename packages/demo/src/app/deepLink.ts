export interface DeepLink {
  readonly session: number | null;
  readonly lap: number | null;
  readonly a: number | null;
  readonly b: number | null;
}

const KEYS = ["session", "lap", "a", "b"] as const;

const positiveInt = (raw: string | null): number | null => {
  const n = Number(raw);
  return raw !== null && raw !== "" && Number.isInteger(n) && n > 0 ? n : null;
};

/** "?session=9839&lap=38&a=1&b=4" -> DeepLink. Garbage values become null. */
export function parseDeepLink(search: string): DeepLink {
  const p = new URLSearchParams(search);
  return {
    session: positiveInt(p.get("session")),
    lap: positiveInt(p.get("lap")),
    a: positiveInt(p.get("a")),
    b: positiveInt(p.get("b")),
  };
}

export function formatDeepLink(link: DeepLink): string {
  const parts = KEYS.flatMap((k) => (link[k] === null ? [] : [`${k}=${link[k]}`]));
  return parts.length ? `?${parts.join("&")}` : "";
}
