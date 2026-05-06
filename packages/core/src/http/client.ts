import QuickLRU from "quick-lru";

import { AbortError, F1ClientError, RateLimitError, TimeoutError } from "./errors";

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxCacheSize?: number;
  cacheTtlMs?: number;
  maxRetries?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export class F1Client {
  private baseUrl: string;
  private timeout: number;
  private cache: QuickLRU<string, CacheEntry<unknown>>;
  private cacheTtlMs: number;
  private maxRetries: number;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.jolpi.ca/ergast/f1";
    this.timeout = options.timeout ?? 10000;
    this.cacheTtlMs = options.cacheTtlMs ?? 3600000;
    this.maxRetries = options.maxRetries ?? 3;
    this.cache = new QuickLRU({
      maxSize: options.maxCacheSize ?? 100,
    });
  }

  async fetch<T = unknown>(
    endpoint: string,
    params: Record<string, string | number> = {},
    options: RequestInit & { timeout?: number; retry?: RetryOptions } = {},
  ): Promise<T> {
    const { timeout = this.timeout, method = "GET", signal, retry, ...rest } = options;

    const cacheKey = `${method}:${endpoint}:${JSON.stringify(params)}`;

    if (method === "GET") {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
        return cached.data as T;
      }
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, String(value));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const abortSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

    const retries = retry?.maxRetries ?? this.maxRetries;
    const baseDelay = retry?.baseDelayMs ?? 300;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method,
          signal: abortSignal,
          ...rest,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          if (attempt < retries) {
            const delay = baseDelay * 2 ** attempt;
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new RateLimitError();
        }

        if (!response.ok) {
          throw new F1ClientError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.statusText,
          );
        }

        const data = await response.json();

        if (method === "GET") {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof DOMException && error.name === "AbortError") {
          if (signal?.aborted) {
            throw new AbortError();
          }
          throw new TimeoutError();
        }

        if (error instanceof RateLimitError && attempt < retries) {
          const delay = baseDelay * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delay));
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  abort(endpoint: string): void {
    const controller = this.abortControllers.get(endpoint);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(endpoint);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  async get<T = unknown>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    return this.fetch<T>(endpoint, params);
  }
}
