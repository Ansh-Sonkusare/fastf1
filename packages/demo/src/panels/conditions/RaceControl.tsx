import { useState } from "react";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, PanelFrame, useHotkey, useLayoutMode } from "../../ui/primitives";
import { color, font } from "../../ui/tokens";
import {
  shapeRaceEvents,
  type OpenF1RaceControlRow,
  type OpenF1TeamRadioRow,
} from "./racecontrol/shape";
import { RaceControl as RaceControlView } from "./racecontrol/RaceControl";

/**
 * Panel 09 — Race control & radio. Wraps the presentational
 * `racecontrol/RaceControl` in `<PanelFrame num="09">` for the standard
 * numbered header and `data-panel="09"` hook (used by browser-proof
 * automation), and does the real data plumbing:
 *
 * - Fetches `race_control` and `team_radio` whole-session (never per-lap,
 *   per CONTRACT.md) through B's gate via `useOpenF1`.
 * - Cuts both feeds off at `lapWindow` (the replay's current lap as the
 *   leader ran it) in the pure `shapeRaceEvents` function, so nothing from
 *   a future lap ever renders.
 * - Radio clips play through the `<audio>` element in
 *   `racecontrol/RaceControl.tsx`; its `recording_url` points at F1's
 *   livetiming CDN, not the OpenF1 API, so it isn't subject to the gate's
 *   pacing/rate limiting.
 * - Owns the `H` hotkey and the full-history toggle: desk shows the latest
 *   two events plus an optional ALL/RC/RADIO/OVT-filterable history; wall
 *   always shows just the latest two (per undercut-terminal.dc.html).
 *
 * Note: `@f1/core`'s `RaceControl`/`TeamRadio` types (what the gate's TS
 * signature declares) don't fully match the real OpenF1 payload — see
 * racecontrol/shape.ts for detail (flagged to lane A/B/root separately).
 * The casts below route the raw rows into the locally-defined types that
 * do match.
 */
export default function RaceControl({ session, lapWindow, focus, drivers }: PanelProps) {
  const mode = useLayoutMode();
  const [historyOpen, setHistoryOpen] = useState(false);
  useHotkey("h", () => setHistoryOpen((v) => !v));

  const raceControl = useOpenF1("race_control", session.sessionKey);
  const teamRadio = useOpenF1("team_radio", session.sessionKey);
  const combined = combine(raceControl, teamRadio);
  const cutoff = lapWindow?.end ?? lapWindow?.start ?? session.dateStart;
  const events =
    combined.status === "ok"
      ? shapeRaceEvents(
          combined.data[0] as unknown as OpenF1RaceControlRow[],
          combined.data[1] as unknown as OpenF1TeamRadioRow[],
          cutoff,
        )
      : [];

  return (
    <PanelFrame
      num="09"
      title={mode === "wall" ? "Race control · latest" : "Race control"}
      style={{ flex: 1, minHeight: 0 }}
      right={
        mode === "desk" &&
        combined.status === "ok" && (
          <button type="button" onClick={() => setHistoryOpen((v) => !v)} style={historyToggleStyle}>
            H · {historyOpen ? "HIDE HISTORY" : `FULL HISTORY · ${events.length}`}
          </button>
        )
      }
    >
      <AsyncView state={combined} isEmpty={() => events.length === 0}>
        {() => (
          <RaceControlView events={events} focusDriverNumber={focus.a ?? undefined} drivers={drivers} big={mode === "wall"} historyOpen={historyOpen} />
        )}
      </AsyncView>
    </PanelFrame>
  );
}

const historyToggleStyle = {
  height: 20,
  padding: "0 8px",
  border: `1px solid ${color.borderMuted}`,
  background: "transparent",
  color: color.label,
  font: `600 10px/1 ${font.sans}`,
  letterSpacing: ".06em",
  cursor: "pointer",
} as const;
