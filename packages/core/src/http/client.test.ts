import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { F1Client, F1ClientError, RateLimitError, TimeoutError } from "./client";

describe("F1Client", () => {
  let client: F1Client;

  beforeEach(() => {
    client = new F1Client({ baseUrl: "http://test.api" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetch", () => {
    it("should make GET request and return JSON", async () => {
      const mockResponse = { data: "test" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.fetch("/test");

      expect(fetch).toHaveBeenCalledWith(
        "http://test.api/test",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should include query params", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await client.fetch("/test", { limit: 10, offset: 5 });

      expect(fetch).toHaveBeenCalledWith(
        "http://test.api/test?limit=10&offset=5",
        expect.any(Object),
      );
    });

    it("should throw TimeoutError on timeout", async () => {
      const abortError = new DOMException("Aborted", "AbortError");
      global.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(client.fetch("/test", {}, { timeout: 100 })).rejects.toThrow(TimeoutError);
    });

    it("should throw RateLimitError on 429", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      await expect(client.fetch("/test")).rejects.toThrow(RateLimitError);
    });

    it("should throw F1ClientError on other errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(client.fetch("/test")).rejects.toThrow(F1ClientError);
    });
  });

  describe("caching", () => {
    it("should cache GET requests", async () => {
      const mockData = { cached: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result1 = await client.fetch("/test");
      const result2 = await client.fetch("/test");

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it("should not cache POST requests", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await client.fetch("/test", {}, { method: "POST" });
      await client.fetch("/test", {}, { method: "POST" });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
