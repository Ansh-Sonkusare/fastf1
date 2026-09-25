import type { PanelProps } from "../../app/types";
import { useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, useLayoutMode } from "../../ui/primitives";
import { shapeWeather, type OpenF1WeatherRow } from "./weather/shape";
import { Weather as WeatherView } from "./weather/Weather";

/**
 * Panel 08 — Weather. Header-strip panel, no PanelFrame (per CONTRACT.md);
 * `Header.tsx` wraps whatever this renders in the header's bordered cell.
 *
 * Fetches the whole-session `weather` feed once through B's gate (never
 * per-lap — CONTRACT.md requires whole-session fetches for this endpoint)
 * and slices it at the replay cursor `at` in the pure `shapeWeather` function,
 * so no sample after the cursor ever renders.
 *
 * Note: `@f1/core`'s `Weather` type (what the gate's TS signature declares
 * for this endpoint) doesn't match the real OpenF1 payload — the live API
 * returns `rainfall`, not `precipitation`/`track_surface_temperature`. The
 * cast below routes the raw rows (whatever shape they truly are) into the
 * locally-defined `OpenF1WeatherRow`, which does match. See
 * weather/shape.ts for detail; flagged to lane A/B/root separately.
 */
export default function Weather({ session, at }: PanelProps) {
  const mode = useLayoutMode();
  const weather = useOpenF1("weather", session.sessionKey);
  const cutoff = new Date(at).toISOString();

  return (
    <AsyncView state={weather} isEmpty={(rows) => rows.length === 0}>
      {(rows) => {
        const shaped = shapeWeather(rows as unknown as OpenF1WeatherRow[], cutoff);
        return <WeatherView weather={shaped} big={mode === "wall"} />;
      }}
    </AsyncView>
  );
}
