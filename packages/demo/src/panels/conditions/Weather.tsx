import type { PanelProps } from "../../app/types";
import { useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, Label } from "../../ui/primitives";
import { color } from "../../ui/tokens";
import { shapeWeather, type OpenF1WeatherRow } from "./weather/shape";
import { Weather as WeatherView } from "./weather/Weather";

/**
 * Panel 08 — Weather. Header-strip panel, no PanelFrame (per CONTRACT.md).
 *
 * Fetches the whole-session `weather` feed once through B's gate (never
 * per-lap — CONTRACT.md requires whole-session fetches for this endpoint)
 * and slices it down to the replay's current lap in the pure `shapeWeather`
 * function, so nothing beyond `lapWindow` ever renders.
 *
 * Note: `@f1/core`'s `Weather` type (what the gate's TS signature declares
 * for this endpoint) doesn't match the real OpenF1 payload — the live API
 * returns `rainfall`, not `precipitation`/`track_surface_temperature`. The
 * cast below routes the raw rows (whatever shape they truly are) into the
 * locally-defined `OpenF1WeatherRow`, which does match. See
 * weather/shape.ts for detail; flagged to lane A/B/root separately.
 */
export default function Weather({ session, lapWindow }: PanelProps) {
  const weather = useOpenF1("weather", session.sessionKey);
  const cutoff = lapWindow?.end ?? lapWindow?.start ?? session.dateStart;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Label tone={color.dim}>08 WEATHER</Label>
      <AsyncView state={weather} isEmpty={(rows) => rows.length === 0}>
        {(rows) => {
          const shaped = shapeWeather(rows as unknown as OpenF1WeatherRow[], cutoff);
          return <WeatherView weather={shaped} />;
        }}
      </AsyncView>
    </div>
  );
}
