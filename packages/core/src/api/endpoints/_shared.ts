import { Effect, Either, Schema } from "effect";
import { F1ClientService } from "../../http/service";

let BASE = "https://api.openf1.org/v1";

export function setOpenF1BaseUrl(url: string): void {
  BASE = url;
}

export function getOpenF1BaseUrl(): string {
  return BASE;
}

export function cleanNulls<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(cleanNulls) as T;
  if (obj && typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanNulls(value);
    }
    return cleaned as T;
  }
  return obj;
}

export function parseOrDie<A, I>(schema: Schema.Schema<A, I, never>, input: unknown): A {
  const decoded = Schema.decodeUnknownEither(schema)(input);
  if (Either.isLeft(decoded)) {
    throw new Error(String(decoded.left));
  }
  return decoded.right;
}

export function parseArray<A, I>(schema: Schema.Schema<A, I, never>, input: unknown): readonly A[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => parseOrDie(schema, item));
}

export function fetchOpenF1<A>(endpoint: string, params?: Record<string, string | number>) {
  return Effect.gen(function* () {
    const client = yield* F1ClientService;
    const response = yield* client.fetch<unknown>(`${BASE}${endpoint}`, { params });
    return cleanNulls(response) as A;
  });
}
