import { Context, Duration, Effect, Layer, Schema } from "effect";

export class F1ClientError extends Schema.TaggedError<F1ClientError>()("F1ClientError", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  statusText: Schema.optional(Schema.String),
}) {}

export class TimeoutError extends Schema.TaggedError<TimeoutError>()("TimeoutError", {
  message: Schema.String,
}) {}

export class RateLimitError extends Schema.TaggedError<RateLimitError>()("RateLimitError", {
  message: Schema.String,
  retryAfter: Schema.optional(Schema.Number),
}) {}

export type ClientError = F1ClientError | TimeoutError | RateLimitError;

const MAX_ATTEMPTS = 4;

function isRetryable(err: ClientError): boolean {
  if (err instanceof RateLimitError || err instanceof TimeoutError) return true;
  if (err instanceof F1ClientError) {
    return err.status !== undefined && err.status >= 500;
  }
  return false;
}

function retryDelay(err: ClientError, attempt: number): Duration.Duration {
  if (err instanceof RateLimitError && err.retryAfter !== undefined) {
    return Duration.seconds(Math.min(err.retryAfter, 60));
  }
  return Duration.millis(100 * 2 ** (attempt - 1));
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  if (Number.isFinite(date)) {
    const diff = Math.ceil((date - Date.now()) / 1000);
    return diff > 0 ? diff : undefined;
  }
  return undefined;
}

export interface FetchOptions {
  readonly params?: Record<string, string | number>;
  readonly method?: string;
}

export interface F1ClientServiceShape {
  readonly fetch: <A>(endpoint: string, options?: FetchOptions) => Effect.Effect<A, ClientError>;
}

export class F1ClientService extends Context.Tag("F1ClientService")<
  F1ClientService,
  F1ClientServiceShape
>() {}

function buildUrl(endpoint: string, params?: Record<string, string | number>): string {
  if (!params) return endpoint;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${endpoint}?${qs}` : endpoint;
}

export const F1ClientServiceLive: Layer.Layer<F1ClientService> = Layer.effect(
  F1ClientService,
  Effect.sync(() => ({
    fetch: <A>(endpoint: string, options: FetchOptions = {}): Effect.Effect<A, ClientError> => {
      const { params, method = "GET" } = options;
      const url = buildUrl(endpoint, params);

      const attempt = Effect.gen(function* () {
        const controller = new AbortController();
        const signal = controller.signal;

        const response = yield* Effect.tryPromise({
          try: () =>
            globalThis.fetch(url, {
              method,
              signal,
            }),
          catch: (err) => {
            if (err instanceof DOMException && err.name === "AbortError") {
              return new TimeoutError({ message: "Request timed out" });
            }
            return new F1ClientError({
              message: err instanceof Error ? err.message : String(err),
            });
          },
        }).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(10),
            onTimeout: () => {
              controller.abort();
              return new TimeoutError({ message: "Request timed out" });
            },
          }),
        );

        if (response.status === 429) {
          const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
          const props = { message: "Rate limit exceeded" };
          return yield* Effect.fail(
            retryAfter !== undefined
              ? new RateLimitError({ ...props, retryAfter })
              : new RateLimitError(props),
          );
        }

        if (!response.ok) {
          return yield* Effect.fail(
            new F1ClientError({
              message: `HTTP ${response.status}`,
              status: response.status,
            }),
          );
        }

        const data = yield* Effect.tryPromise({
          try: () => response.json() as Promise<A>,
          catch: () => new F1ClientError({ message: "Failed to parse response" }),
        });

        return data;
      });

      return Effect.gen(function* () {
        let attemptCount = 1;
        for (;;) {
          const result = yield* Effect.either(attempt);
          if (result._tag === "Right") return result.right;
          const error = result.left;
          if (!isRetryable(error) || attemptCount >= MAX_ATTEMPTS) {
            return yield* Effect.fail(error);
          }
          yield* Effect.sleep(retryDelay(error, attemptCount));
          attemptCount += 1;
        }
      });
    },
  })),
);
