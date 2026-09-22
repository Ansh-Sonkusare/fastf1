import { Schema } from "effect";

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
}) {}

export class AbortError extends Schema.TaggedError<AbortError>()("AbortError", {
  message: Schema.String,
}) {}

export type ClientError = F1ClientError | TimeoutError | RateLimitError | AbortError;
