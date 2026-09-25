import { describe, expect, it } from "vitest";
import { formatDeepLink, parseDeepLink } from "./deepLink";

describe("deep link", () => {
  it("round-trips session, lap and A/B", () => {
    const link = { session: 9839, lap: 38, t: null, a: 1, b: 4 };
    expect(formatDeepLink(link)).toBe("?session=9839&lap=38&a=1&b=4");
    expect(parseDeepLink("?session=9839&lap=38&a=1&b=4")).toEqual(link);
  });
  it("round-trips an instant to the millisecond", () => {
    const link = { session: 9920, lap: null, t: 3021.4126, a: 81, b: 4 };
    expect(formatDeepLink(link)).toBe("?session=9920&t=3021.413&a=81&b=4");
    expect(parseDeepLink("?session=9920&t=3021.413&a=81&b=4")).toEqual({ ...link, t: 3021.413 });
  });
  it("drops garbage and omits nulls", () => {
    expect(parseDeepLink("?session=abc&lap=0&t=-4&a=1.5")).toEqual({ session: null, lap: null, t: null, a: null, b: null });
    expect(formatDeepLink({ session: 9839, lap: null, t: null, a: null, b: null })).toBe("?session=9839");
  });
});
