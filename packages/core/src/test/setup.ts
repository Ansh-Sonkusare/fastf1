import { beforeEach } from "vitest";
import { clearOpenF1Cache, setOpenF1CacheEnabled } from "../api/endpoints/cache";

beforeEach(() => {
  clearOpenF1Cache();
  setOpenF1CacheEnabled(true);
});
