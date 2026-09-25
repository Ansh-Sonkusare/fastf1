import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, PanelFrame } from "../../ui/primitives";
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
 *
 * Note: `@f1/core`'s `RaceControl`/`TeamRadio` types (what the gate's TS
 * signature declares) don't fully match the real OpenF1 payload — see
 * racecontrol/shape.ts for detail (flagged to lane A/B/root separately).
 * The casts below route the raw rows into the locally-defined types that
 * do match.
 */
export default function RaceControl({ session, lapWindow, focus }: PanelProps) {
  const raceControl = useOpenF1("race_control", session.sessionKey);
  const teamRadio = useOpenF1("team_radio", session.sessionKey);
  const combined = combine(raceControl, teamRadio);
  const cutoff = lapWindow?.end ?? lapWindow?.start ?? session.dateStart;

  return (
    <PanelFrame num="09" title="Race control & radio" style={{ flex: 1, minHeight: 0 }}>
      <AsyncView state={combined} isEmpty={([rc, tr]) => rc.length === 0 && tr.length === 0}>
        {([rc, tr]) => {
          const events = shapeRaceEvents(
            rc as unknown as OpenF1RaceControlRow[],
            tr as unknown as OpenF1TeamRadioRow[],
            cutoff
          );
          return (
            <RaceControlView events={events} focusDriverNumber={focus.a ?? undefined} />
          );
        }}
      </AsyncView>
    </PanelFrame>
  );
}
