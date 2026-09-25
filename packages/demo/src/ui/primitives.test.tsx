// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { OpenF1LockedError } from "../data/openf1";
import { AsyncView, LOCKED_MESSAGE, PanelFrame, UNREACHABLE_MESSAGE } from "./primitives";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AsyncView", () => {
  const render = async (inferred: boolean) => {
    const el = document.createElement("div");
    await act(async () =>
      createRoot(el).render(
        <PanelFrame num="04" title="Lap times">
          <AsyncView state={{ status: "error", error: new OpenF1LockedError(inferred), retry: () => undefined }}>
            {() => "data"}
          </AsyncView>
        </PanelFrame>,
      ),
    );
    return el;
  };
  it("a readable live-session 401 shows the definite lockout message inside the panel frame", async () => {
    const el = await render(false);
    expect(el.textContent).toBe(`Lap times${LOCKED_MESSAGE}`);
    expect(el.querySelector("section[data-panel='04'] [role='status']")).not.toBeNull();
  });
  it("an inferred lock (browser only saw network failures) doesn't claim a live session", async () => {
    expect((await render(true)).textContent).toBe(`Lap times${UNREACHABLE_MESSAGE}`);
  });
});
