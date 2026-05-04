import QuickLRU from "quick-lru";

import { AbortError, F1ClientError, RateLimitError, TimeoutError } from "./errors";

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxCacheSize?: number;
  cacheTtlMs?: number;
  rateLimitMs?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class F1Client {
  private baseUrl: string;
  private timeout: number;
  private cache: QuickLRU<string, CacheEntry<unknown>>;
  private cacheTtlMs: number;
  private rateLimitMs: number;
  private lastRequestTime = 0;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.jolpi.ca/ergast/f1";
    this.timeout = options.timeout ?? 10000;
    this.cacheTtlMs = options.cacheTtlMs ?? 3600000;
    this.rateLimitMs = options.rateLimitMs ?? 200;
    this.cache = new QuickLRU({
      maxSize: options.maxCacheSize ?? 100,
    });
  }

  async fetch<T = unknown>(
    endpoint: string,
    params: Record<string, string | number> = {},
    options: RequestInit & { timeout?: number } = {},
  ): Promise<T> {
    const { timeout = this.timeout, method = "GET", signal, ...rest } = options;

    const cacheKey = `${method}:${endpoint}:${JSON.stringify(params)}`;

    if (method === "GET") {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
        return cached.data as T;
      }
    }

    await this.rateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, String(value));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const abortSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

    try {
      const response = await fetch(url.toString(), {
        method,
        signal: abortSignal,
        ...rest,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
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

      throw error;
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitMs) {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimitMs - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
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
}
