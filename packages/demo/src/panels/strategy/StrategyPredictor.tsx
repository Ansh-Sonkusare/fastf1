import { useMemo, useState } from "react";
import { pitLanePassLaps, realPitStops } from "../../app/timeline";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { useCursor } from "../../data/source";
import {
  AsyncView,
  PanelFrame,
  PredictedLegend,
  TabStrip,
  useHotkey,
  useLayoutMode,
  type Tab,
} from "../../ui/primitives";
import { color, font, tyreOf, type } from "../../ui/tokens";
import { buildHeroCall, type FactTone, type HeroCall } from "./call";
import { approx, approxPos } from "./format";
import { computeStrategy } from "./model";
import { SC_LAPS } from "./plan";
import { parseRace } from "./race";
import type { AlertKind, Strategy, StrategyAlert } from "./types";
import { Bar, DegradationSvg, Ghost, PitWindowSvg, Section, mono, pct } from "./views";

export const DEFAULT_PIT_LOSS = 21.4;

type TabKey = "plans" | "ghost" | "window" | "degradation" | "threats";

export default function StrategyPredictor({ session, completedLap, totalLaps, focus, drivers, ownLapOf }: PanelProps) {
  const cursor = useCursor();
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
    return parseRace({ laps, stints, stops, drivers: driverRows, totalLaps });
  }, [data, drivers, totalLaps]);
  // Plan from the lap the car last finished at the cursor; a lapped car is a lap behind the leader.
  const ownLap = focus.a == null ? completedLap : Math.min(ownLapOf(focus.a, completedLap), cursor.lapOf(focus.a) - 1);
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

  const mode = useLayoutMode();
  const [picked, setPicked] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("plans");

  const selected = strategy ? (picked ?? strategy.plans.findIndex((p) => p.best)) : -1;
  const hero = useMemo(
    () => (strategy ? buildHeroCall(strategy, selected, safetyCar) : null),
    [strategy, selected, safetyCar],
  );

  const meta = strategy
    ? `P${strategy.focus.position} · ${tyreOf(strategy.focus.compound).code} ${strategy.focus.tyreAge} LAPS · AS OF L${strategy.lap}`
    : null;

  useHotkey("1", () => setTab("plans"));
  useHotkey("2", () => setTab("ghost"));
  useHotkey("3", () => setTab("window"));
  useHotkey("4", () => setTab("degradation"));
  useHotkey("5", () => setTab("threats"));

  const toggle = strategy && mode !== "wall" && (
    <button
      type="button"
      onClick={() => setSafetyCar((v) => !v)}
      aria-pressed={safetyCar}
      style={{
        height: 20,
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        border: `1px solid ${safetyCar ? color.predicted : color.borderMuted}`,
        background: safetyCar ? "rgba(111,211,232,.12)" : "transparent",
        color: safetyCar ? color.predicted : color.label,
        font: `600 10px/1 ${font.sans}`,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      WHAT-IF SC L{ownLap + 1}–{ownLap + SC_LAPS}
    </button>
  );

  return (
    <PanelFrame
      num="10"
      title={strategy ? <>STRATEGY · {strategy.focus.code}</> : "STRATEGY"}
      predicted
      right={
        strategy && hero ? (
          <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {mode !== "wall" && (
              <span style={{ font: mono(500, 11), color: color.label, whiteSpace: "nowrap" }}>{meta}</span>
            )}
            {toggle}
            <span
              style={{
                font: mono(700, 10),
                letterSpacing: ".08em",
                padding: "4px 7px",
                background: hero.isBest ? color.predicted : color.amber,
                color: "#000",
              }}
            >
              {hero.tag}
            </span>
          </span>
        ) : null
      }
    >
      <AsyncView state={data}>
        {() =>
          strategy && hero ? (
            <Body
              s={strategy}
              hero={hero}
              selected={selected}
              onPick={setPicked}
              tab={tab}
              setTab={setTab}
              meta={meta ?? ""}
            />
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

function Body({
  s,
  hero,
  selected,
  onPick,
  tab,
  setTab,
  meta,
}: {
  s: Strategy;
  hero: HeroCall;
  selected: number;
  onPick: (i: number) => void;
  tab: TabKey;
  setTab: (t: TabKey) => void;
  meta: string;
}) {
  const mode = useLayoutMode();
  const wall = mode === "wall";

  const heroBlock = (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: wall ? 20 : 12,
          padding: wall ? "34px 30px 30px" : "20px 22px 18px",
        }}
      >
        {wall && <span style={{ font: mono(500, 18), color: color.label }}>{meta}</span>}
        <span
          style={{
            fontFamily: font.sans,
            fontWeight: 600,
            fontSize: wall ? 76 : 46,
            lineHeight: 1,
            letterSpacing: "-.02em",
            color: color.text,
          }}
        >
          {hero.head}
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontWeight: 500,
            fontSize: wall ? 28 : 18,
            lineHeight: 1.3,
            color: color.predicted,
          }}
        >
          {hero.sub}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: wall ? "repeat(2,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))",
          borderTop: `1px solid ${color.border}`,
        }}
      >
        {hero.facts.map((f) => (
          <div
            key={f.label}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              padding: wall ? "18px 30px" : "12px 22px",
              borderRight: `1px solid ${color.border}`,
              borderBottom: `1px solid ${color.border}`,
            }}
          >
            <span
              style={{
                font: `500 11px/1 ${font.sans}`,
                letterSpacing: ".07em",
                textTransform: "uppercase",
                color: color.label,
              }}
            >
              {f.label}
            </span>
            <span style={{ font: mono(500, wall ? 24 : 14), color: FACT_TONE[f.tone] }}>{f.value}</span>
          </div>
        ))}
      </div>
    </>
  );

  if (wall) {
    return <div style={{ display: "flex", flexDirection: "column" }}>{heroBlock}</div>;
  }

  const tabs: Tab[] = [
    { key: "1", label: `Plans · ${s.plans.length}`, active: tab === "plans", onClick: () => setTab("plans") },
    { key: "2", label: "Ghost rejoin", active: tab === "ghost", onClick: () => setTab("ghost") },
    { key: "3", label: "Pit window", active: tab === "window", onClick: () => setTab("window") },
    { key: "4", label: "Degradation", active: tab === "degradation", onClick: () => setTab("degradation") },
    { key: "5", label: `Threats · ${s.alerts.length}`, active: tab === "threats", onClick: () => setTab("threats") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {heroBlock}
      <TabStrip
        tabs={tabs}
        right={
          <span style={{ padding: "0 12px" }}>
            <PredictedLegend />
          </span>
        }
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          padding: 14,
          gap: 14,
        }}
      >
        {tab === "plans" && <Plans s={s} selected={selected} onPick={onPick} />}
        {tab === "ghost" && <Ghost s={s} />}
        {tab === "window" && (
          <Section
            title="Pit window · race-time cost by stop lap"
            note={`OPT L${s.window.optimal.lap} → ${s.window.optimal.compound}`}
          >
            <PitWindowSvg s={s} />
          </Section>
        )}
        {tab === "degradation" && (
          <Section title="Tyre degradation · fuel-corrected">
            <DegradationSvg s={s} />
          </Section>
        )}
        {tab === "threats" && s.alerts.map((a) => <Alert key={a.title} a={a} />)}
      </div>
    </div>
  );
}

const FACT_TONE: Record<FactTone, string> = {
  normal: color.text,
  warn: color.amber,
  predicted: color.predicted,
  muted: color.textMuted,
};

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
