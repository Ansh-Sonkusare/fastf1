// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { OpenF1LockedError } from "../data/openf1";
import { AsyncView, LOCKED_MESSAGE, PanelFrame } from "./primitives";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AsyncView", () => {
  it("shows the lockout message inside the panel frame instead of a generic error", async () => {
    const el = document.createElement("div");
    await act(async () =>
      createRoot(el).render(
        <PanelFrame num="04" title="Lap times">
          <AsyncView state={{ status: "error", error: new OpenF1LockedError(true), retry: () => undefined }}>
            {() => "data"}
          </AsyncView>
        </PanelFrame>,
      ),
    );
    expect(el.textContent).toBe(`04 Lap times${LOCKED_MESSAGE}`);
    expect(el.querySelector("section[data-panel='04'] [role='status']")).not.toBeNull();
  });
});
