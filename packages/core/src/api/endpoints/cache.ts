import type { Deferred } from "effect";
import QuickLRU from "quick-lru";
import type { ClientError } from "../../http/service";

const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry =
  | { type: "resolved"; value: unknown }
  | { type: "pending"; deferred: Deferred.Deferred<unknown, ClientError> };

const cache = new QuickLRU<string, CacheEntry>({
  maxSize: 100,
  maxAge: CACHE_TTL_MS,
});

let cacheEnabled = true;

export function getFromCache(key: string): CacheEntry | undefined {
  if (!cacheEnabled) return undefined;
  return cache.get(key);
}

export function setInCache<A>(key: string, value: A): void {
  if (cacheEnabled) {
    cache.set(key, { type: "resolved", value });
  }
}

export function setInFlightCache<A>(
  key: string,
  deferred: Deferred.Deferred<A, ClientError>,
): void {
  if (cacheEnabled) {
    cache.set(key, {
      type: "pending",
      deferred: deferred as Deferred.Deferred<unknown, ClientError>,
    });
  }
}

export function clearOpenF1Cache(): void {
  cache.clear();
}

export function setOpenF1CacheEnabled(enabled: boolean): void {
  cacheEnabled = enabled;
}

export function evictFromCache(key: string): void {
  cache.delete(key);
}
