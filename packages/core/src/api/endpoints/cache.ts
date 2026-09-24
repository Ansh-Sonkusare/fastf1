import QuickLRU from "quick-lru";

// 1 hour TTL in milliseconds
const CACHE_TTL_MS = 60 * 60 * 1000;

// Module-level cache instance
const cache = new QuickLRU<string, unknown>({
  maxSize: 500,
  maxAge: CACHE_TTL_MS,
});

let cacheEnabled = true;

/**
 * Check if a value exists in the cache.
 * Returns undefined if not found or cache is disabled.
 */
export function getFromCache<T>(key: string): T | undefined {
  if (!cacheEnabled) return undefined;
  return cache.get(key) as T | undefined;
}

/**
 * Store a value in the cache.
 * No-op if cache is disabled.
 */
export function setInCache<T>(key: string, value: T): void {
  if (cacheEnabled) {
    cache.set(key, value);
  }
}

/**
 * Clear all entries from the cache.
 */
export function clearOpenF1Cache(): void {
  cache.clear();
}

/**
 * Enable or disable the cache.
 * When disabled, cache reads return undefined and writes are no-ops.
 */
export function setOpenF1CacheEnabled(enabled: boolean): void {
  cacheEnabled = enabled;
}

/**
 * Get the current enabled state of the cache.
 */
export function isOpenF1CacheEnabled(): boolean {
  return cacheEnabled;
}
