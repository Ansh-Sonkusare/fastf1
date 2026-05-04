export class F1ClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly statusText?: string,
  ) {
    super(message);
    this.name = "F1ClientError";
  }
}

export class TimeoutError extends F1ClientError {
  constructor() {
    super("Request timed out");
    this.name = "TimeoutError";
  }
}

export class RateLimitError extends F1ClientError {
  constructor() {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

export class AbortError extends F1ClientError {
  constructor() {
    super("Request aborted");
    this.name = "AbortError";
  }
}
