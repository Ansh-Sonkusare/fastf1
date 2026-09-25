// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PanelDef } from "../panels/registry";
import { PanelSlot } from "./PanelSlot";
import type { PanelProps } from "./types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const props = { lap: 7 } as PanelProps;
const Ok = ({ lap }: PanelProps) => <p>panel ok at lap {lap}</p>;
const Boom = (): never => {
  throw new Error("boom");
};

async function mount(def: PanelDef) {
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  await act(async () => root.render(<PanelSlot def={def} props={props} />));
  return el;
}
const settle = () => act(async () => new Promise((r) => setTimeout(r, 0)));
const clickRetry = (el: HTMLElement) =>
  act(async () => (el.querySelector("button") as HTMLButtonElement).click());

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("PanelSlot", () => {
  it("contains a render crash to its panel and recovers on RETRY", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let crash = true;
    const el = await mount({
      num: "04",
      title: "Lap times",
      slot: "mid-right",
      load: async () => ({ default: (p: PanelProps) => (crash ? <Boom /> : <Ok {...p} />) }),
    });
    await settle();
    expect(el.textContent).toBe("04 LAP TIMES FAILED · boomRETRY");
    crash = false;
    await clickRetry(el);
    await settle();
    expect(el.textContent).toBe("panel ok at lap 7");
  });

  it("re-imports a chunk that failed to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const load = vi
      .fn<PanelDef["load"]>()
      .mockRejectedValueOnce(new Error("Failed to fetch dynamically imported module"))
      .mockResolvedValue({ default: Ok });
    const el = await mount({ num: "02", title: "Track map", slot: "top-right", load });
    await settle();
    expect(el.textContent).toContain("02 TRACK MAP FAILED · Failed to fetch dynamically imported module");
    await clickRetry(el);
    await settle();
    expect(el.textContent).toBe("panel ok at lap 7");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
