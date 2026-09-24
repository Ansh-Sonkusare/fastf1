import { beforeEach } from "vitest";
import { clearOpenF1Cache } from "../api/endpoints/cache";

/**
 * Clear the OpenF1 cache before each test to prevent cache leakage
 * between tests that might mock the same URLs with different data.
 */
beforeEach(() => {
  clearOpenF1Cache();
});
