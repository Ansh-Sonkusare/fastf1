import { useMemo, useState } from "react";
import { pitLanePassLaps, realPitStops } from "../../app/timeline";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, Label, MeasuredLegend, PanelFrame, PredictedLegend } from "../../ui/primitives";
import { color, font, type } from "../../ui/tokens";
import { CLIFF_PER_LAP, FUEL_PER_LAP } from "./fit";
import { approx, approxPos } from "./format";
import { computeStrategy } from "./model";
import { SC_LAPS, SC_PIT_FACTOR } from "./plan";
import { parseRace } from "./race";
import type { AlertKind, Strategy, StrategyAlert } from "./types";
import { Bar, DegradationSvg, Ghost, PitWindowSvg, Section, mono, pct } from "./views";

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
      SC L{ownLap + 1}–{ownLap + SC_LAPS}
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
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? s.plans.findIndex((p) => p.best);
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))",
          gap: 14,
        }}
      >
        <Plans s={s} selected={selected} onPick={setPicked} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label>Threats &amp; opportunities</Label>
          {s.alerts.map((a) => (
            <Alert key={a.title} a={a} />
          ))}
        </div>
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

const PLAN_COLUMNS = "minmax(0,1.6fr) 84px 108px 120px";

function Plans({
  s,
  selected,
  onPick,
}: { s: Strategy; selected: number; onPick: (i: number) => void }) {
  return (
    <div
      aria-label="Candidate plans"
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${color.border}`,
        borderRadius: 4,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: PLAN_COLUMNS,
          gap: 8,
          padding: "9px 12px",
          font: type.label,
          letterSpacing: ".06em",
          color: color.dim,
          borderBottom: `1px solid ${color.border}`,
        }}
      >
        <span>PLAN · CLICK TO APPLY</span>
        <span style={{ textAlign: "right" }}>FINISH</span>
        <span style={{ textAlign: "right" }}>Δ TIME</span>
        <span>CONFIDENCE</span>
      </div>
      {s.plans.map((p, i) => {
        const on = i === selected;
        const tone =
          p.delta.value < 0.05 ? color.predicted : p.delta.value < 3 ? color.textMuted : color.red;
        return (
          <button
            type="button"
            key={p.name}
            aria-pressed={on}
            onClick={() => onPick(i)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              color: color.text,
              display: "grid",
              gridTemplateColumns: PLAN_COLUMNS,
              gap: 8,
              alignItems: "center",
              padding: "10px 12px",
              cursor: "pointer",
              background: on ? "rgba(111,211,232,.08)" : "transparent",
              borderBottom: `1px solid ${color.rowDivider}`,
              font: type.cell,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: font.sans,
                fontSize: 14,
                fontWeight: 600,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: `2px solid ${on ? color.predicted : "#3a414a"}`,
                  background: on ? color.predicted : "transparent",
                }}
              />
              {p.name}
              {p.best && (
                <span
                  style={{
                    font: mono(700, 9),
                    padding: "3px 5px",
                    borderRadius: 2,
                    background: color.predicted,
                    color: color.bg,
                  }}
                >
                  BEST
                </span>
              )}
            </span>
            <span style={{ textAlign: "right", color: color.predicted }}>
              {approxPos(p.finish)}
            </span>
            <span style={{ textAlign: "right", color: tone }}>{approx(p.delta, 1, "s", true)}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bar value={p.confidence} />
              <span style={{ color: color.predicted, width: 36, textAlign: "right" }}>
                ≈{pct(p.confidence)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const ALERT_STYLE: Record<
  AlertKind,
  (p: number) => { level: string; tone: string; bg: string; bd: string }
> = {
  THREAT: (p) =>
    p > 0.6
      ? { level: "HIGH", tone: color.red, bg: "rgba(255,90,79,.07)", bd: "rgba(255,90,79,.35)" }
      : p >= 0.3
        ? { level: "MED", tone: color.amber, bg: "rgba(255,181,71,.06)", bd: "rgba(255,181,71,.3)" }
        : { level: "LOW", tone: color.label, bg: "rgba(255,255,255,.02)", bd: color.border },
  OPPORTUNITY: () => ({
    level: "OPP",
    tone: color.predicted,
    bg: "rgba(111,211,232,.05)",
    bd: "rgba(111,211,232,.3)",
  }),
  DEGRADATION: () => ({
    level: "DEG",
    tone: color.label,
    bg: "rgba(255,255,255,.02)",
    bd: color.border,
  }),
};

function Alert({ a }: { a: StrategyAlert }) {
  const st = ALERT_STYLE[a.kind](a.probability);
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 4,
        background: st.bg,
        border: `1px solid ${st.bd}`,
      }}
    >
      <span
        style={{
          font: mono(700, 10),
          color: color.bg,
          background: st.tone,
          padding: "4px 6px",
          borderRadius: 2,
          alignSelf: "flex-start",
        }}
      >
        {st.level}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</span>
        <span style={{ font: `400 11px/1.4 ${font.mono}`, color: color.textMuted }}>{a.body}</span>
      </div>
      <span style={{ font: mono(600, 13), color: color.predicted }}>≈{pct(a.probability)}</span>
    </div>
  );
}
