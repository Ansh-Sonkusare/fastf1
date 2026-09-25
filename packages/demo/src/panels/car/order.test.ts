import { describe, expect, it } from "vitest";
import { ABU_DHABI, MONZA } from "./__fixtures__";
import { runningOrder } from "./order";

describe("runningOrder", () => {
  it("orders the Abu Dhabi field by who crossed the line first at the end of lap 5", () => {
    expect(runningOrder(ABU_DHABI.laps, 5).slice(0, 5)).toEqual([1, 81, 4, 16, 63]);
  });

  it("puts a driver with no completed lap last (Hülkenberg did not start at Monza)", () => {
    const order = runningOrder(MONZA.laps, 5);
    expect(order.slice(0, 3)).toEqual([1, 4, 16]);
    expect(order.at(-1)).toBe(27);
  });

  it("ignores laps after the cursor", () => {
    expect(runningOrder(ABU_DHABI.laps, 1).slice(0, 5)).toEqual([1, 81, 4, 16, 14]);
  });
});
