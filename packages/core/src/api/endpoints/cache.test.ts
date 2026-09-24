import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOpenF1Cache,
  getFromCache,
  isOpenF1CacheEnabled,
  setInCache,
  setOpenF1CacheEnabled,
} from "./cache";

describe("OpenF1 Cache", () => {
  beforeEach(() => {
    clearOpenF1Cache();
    setOpenF1CacheEnabled(true);
  });

  it("stores and retrieves values from cache", () => {
    const value = { test: "data" };
    setInCache("key1", value);

    const cached = getFromCache("key1");
    expect(cached).toEqual(value);
  });

  it("returns undefined for missing keys", () => {
    const cached = getFromCache("missing");
    expect(cached).toBeUndefined();
  });

  it("clears all cached entries", () => {
    setInCache("key1", { test: "data1" });
    setInCache("key2", { test: "data2" });

    clearOpenF1Cache();

    expect(getFromCache("key1")).toBeUndefined();
    expect(getFromCache("key2")).toBeUndefined();
  });

  it("disables cache when setOpenF1CacheEnabled(false)", () => {
    setInCache("key1", { test: "data" });
    setOpenF1CacheEnabled(false);

    const cached = getFromCache("key1");
    expect(cached).toBeUndefined();
  });

  it("prevents writes when cache is disabled", () => {
    setOpenF1CacheEnabled(false);
    setInCache("key1", { test: "data" });

    setOpenF1CacheEnabled(true);
    const cached = getFromCache("key1");
    expect(cached).toBeUndefined();
  });

  it("re-enables cache when setOpenF1CacheEnabled(true)", () => {
    setOpenF1CacheEnabled(false);
    setOpenF1CacheEnabled(true);

    setInCache("key1", { test: "data" });
    const cached = getFromCache("key1");
    expect(cached).toEqual({ test: "data" });
  });

  it("respects TTL with fake timers", () => {
    vi.useFakeTimers();
    try {
      const value = { test: "data" };
      setInCache("key1", value);

      // Immediately after, should be cached
      expect(getFromCache("key1")).toEqual(value);

      // Advance time by 59 minutes (before TTL expires)
      vi.advanceTimersByTime(59 * 60 * 1000);
      expect(getFromCache("key1")).toEqual(value);

      // Advance to exactly 1 hour (TTL expiration)
      vi.advanceTimersByTime(60 * 1000);
      expect(getFromCache("key1")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks enabled state correctly", () => {
    expect(isOpenF1CacheEnabled()).toBe(true);

    setOpenF1CacheEnabled(false);
    expect(isOpenF1CacheEnabled()).toBe(false);

    setOpenF1CacheEnabled(true);
    expect(isOpenF1CacheEnabled()).toBe(true);
  });
});
