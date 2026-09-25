import { useMemo, useState } from "react";
import { pitLanePassLaps, realPitStops } from "../../app/timeline";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, Label, MeasuredLegend, PanelFrame, PredictedLegend } from "../../ui/primitives";
import { color, font, type } from "../../ui/tokens";
import { CLIFF_PER_LAP, FUEL_PER_LAP } from "./fit";
import { computeStrategy } from "./model";
import { SC_PIT_FACTOR } from "./plan";
import { parseRace } from "./race";
import type { Strategy } from "./types";
import { DegradationSvg, Ghost, PitWindowSvg, Section, mono } from "./views";

export const DEFAULT_PIT_LOSS = 21.4;

export default function StrategyPredictor({ session, lap, focus, drivers, ownLapOf }: PanelProps) {
  const data = combine(
    useOpenF1("laps", session.sessionKey),
    useOpenF1("stints", session.sessionKey),
    useOpenF1("pit", session.sessionKey),
    useOpenF1("race_control", session.sessionKey),
  );
  const [safetyCar, setSafetyCar] = useState(false);
  const race = useMemo(() => {
    if (data.status !== "ok") return null;
    const [laps, stints, pit, raceControl] = data.data;
    const driverRows = [...drivers.values()].map((d) => ({
      driver_number: d.number,
      name_acronym: d.code,
      team_colour: d.color.replace("#", ""),
    }));
    const stops = realPitStops(pit, stints, pitLanePassLaps(raceControl));
    return parseRace({ laps, stints, stops, drivers: driverRows });
  }, [data, drivers]);
  // A lapped car is a lap behind the cursor; plan from the lap it last completed, never a later one.
  const ownLap = focus.a == null ? lap : ownLapOf(focus.a, lap);
  const strategy = useMemo(
    () =>
      race && focus.a != null
        ? computeStrategy(race, {
            lap: ownLap,
            focus: focus.a,
            pitLoss: DEFAULT_PIT_LOSS,
            safetyCar,
          })
        : null,
    [race, ownLap, focus.a, safetyCar],
  );

  const toggle = (
    <button
      type="button"
      onClick={() => setSafetyCar((v) => !v)}
      aria-pressed={safetyCar}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 3,
        border: `1px solid ${safetyCar ? color.predicted : "#2a3038"}`,
        background: safetyCar ? "rgba(111,211,232,.12)" : "transparent",
        color: safetyCar ? color.predicted : color.label,
        font: mono(600, 11),
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          border: "1px solid currentColor",
          background: safetyCar ? color.predicted : "transparent",
        }}
      />
      SC L{ownLap + 1}–{ownLap + 3}
    </button>
  );

  return (
    <PanelFrame
      num="10"
      title="Strategy predictor"
      predicted
      right={
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {strategy && <FocusChip s={strategy} />}
          <MeasuredLegend />
          <PredictedLegend />
          <span style={{ width: 1, height: 18, background: color.border }} />
          <Label tone={color.dim}>What-if</Label>
          {toggle}
        </span>
      }
    >
      <AsyncView state={data}>
        {() =>
          strategy ? (
            <Body s={strategy} safetyCar={safetyCar} />
          ) : (
            <div style={{ padding: 16, font: type.label, color: color.dim }}>
              {focus.a == null
                ? "CLICK A DRIVER IN THE TOWER TO FOCUS A"
                : "FOCUS CAR HAS NO RUNNING LAP AT THIS POINT"}
            </div>
          )
        }
      </AsyncView>
    </PanelFrame>
  );
}

function FocusChip({ s }: { s: Strategy }) {
  const f = s.focus;
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 3,
        background: color.panelRaised,
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      <span style={{ width: 3, height: 14, background: f.color }} />
      {f.code}
      <span style={{ font: mono(500, 11), color: color.label }}>
        P{f.position} · {f.compound ?? "?"} {f.tyreAge} laps
      </span>
    </span>
  );
}

function Body({ s, safetyCar }: { s: Strategy; safetyCar: boolean }) {
  const priors = Object.values(s.model.fits)
    .filter((f) => f?.prior)
    .map((f) => f?.compound);
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
      <Ghost s={s} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(460px,1fr))",
          gap: 14,
        }}
      >
        <Section
          title="Pit window · race-time cost by stop lap"
          note={`OPT L${s.window.optimal.lap} → ${s.window.optimal.compound}`}
        >
          <PitWindowSvg s={s} />
        </Section>
        <Section title="Tyre degradation · fuel-corrected">
          <DegradationSvg s={s} />
        </Section>
      </div>
      <p style={{ margin: 0, font: `400 10px/1.5 ${font.mono}`, color: color.dim }}>
        Model, refit each lap on laps up to L{s.lap} only. Fuel correction {FUEL_PER_LAP} s/lap.
        Linear tyre wear per compound pooled across the field's stints (traffic, pit, lap-1 and SC
        laps excluded), plus {CLIFF_PER_LAP} s/lap past each set's life.
        {priors.length > 0 && ` ${priors.join(", ")} not run yet, so on priors.`} Pit loss{" "}
        {s.ghost.pitLoss.toFixed(1)} s{safetyCar && ` (${SC_PIT_FACTOR}× under the SC what-if)`}. No
        traffic or overtaking cost. Rivals run their best legal plan. ± is one standard deviation.
        Plans rank on mean time plus half a standard deviation.
      </p>
    </div>
  );
}
