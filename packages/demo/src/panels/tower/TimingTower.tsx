import { useMemo } from "react";
import { pick } from "../../app/replay";
import { lapCrossings, pitLanePassLaps } from "../../app/timeline";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { formatGap, formatLapTime } from "../../ui/format";
import { AsyncView, PanelFrame } from "../../ui/primitives";
import { color, font, tyreOf, type } from "../../ui/tokens";
import { buildTower, type LapTone, type TowerRow } from "./shape";

const COLUMNS = "20px 3px 52px 62px 52px 64px 64px 44px 16px";
const toneColor: Record<LapTone, string> = { overall: color.overall, personal: color.personal, plain: color.text };

export default function TimingTower({ session, lap, focus, drivers, setFocus }: PanelProps) {
  const data = combine(
    useOpenF1("laps", session.sessionKey),
    useOpenF1("stints", session.sessionKey),
    useOpenF1("race_control", session.sessionKey),
    useOpenF1("pit", session.sessionKey),
  );
  const result = useOpenF1("session_result", session.sessionKey);
  const retired = useMemo(
    () =>
      result.status === "ok" && result.data.length
        ? new Set(result.data.filter((r) => r.dnf || r.dns).map((r) => r.driver_number))
        : null,
    [result],
  );
  const laps = data.status === "ok" ? data.data[0] : null;
  const crossings = useMemo(() => (laps ? lapCrossings(laps) : null), [laps]);
  const onPick = (driver: number, compare: boolean) => setFocus(pick(focus, driver, compare));

  return (
    <PanelFrame
      num="01"
      title="Timing tower"
      right={<span style={{ font: `400 10px/1 ${font.mono}`, color: color.dim }}>CLICK = FOCUS A · SHIFT-CLICK = COMPARE B</span>}
    >
      <div
        style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 4, padding: "8px 12px", font: type.label, color: color.dim, letterSpacing: ".06em" }}
      >
        <span>P</span>
        <span />
        <span>DRV</span>
        <span style={{ textAlign: "right" }}>GAP</span>
        <span style={{ textAlign: "right" }}>INT</span>
        <span style={{ textAlign: "right" }}>LAST</span>
        <span style={{ textAlign: "right" }}>BEST</span>
        <span>TYRE</span>
        <span style={{ textAlign: "right" }}>PIT</span>
      </div>
      <AsyncView state={data}>
        {([laps, stints, raceControl, pits]) => {
          if (!crossings) return null;
          const rows = buildTower({ lap, crossings, laps, stints, pits, passLaps: pitLanePassLaps(raceControl), retired });
          return (
            <div role="list" style={{ display: "flex", flexDirection: "column", padding: "0 6px 8px" }}>
              {rows.map((r) => (
                <Row
                  key={r.driver}
                  row={r}
                  code={drivers.get(r.driver)?.code ?? String(r.driver)}
                  team={drivers.get(r.driver)?.color ?? color.label}
                  mark={r.driver === focus.a ? "A" : r.driver === focus.b ? "B" : null}
                  onPick={onPick}
                />
              ))}
            </div>
          );
        }}
      </AsyncView>
    </PanelFrame>
  );
}

function Row({
  row,
  code,
  team,
  mark,
  onPick,
}: {
  row: TowerRow;
  code: string;
  team: string;
  mark: "A" | "B" | null;
  onPick: (driver: number, compare: boolean) => void;
}) {
  const tyre = tyreOf(row.compound);
  return (
    <div
      role="listitem"
      data-driver={row.driver}
      aria-label={`P${row.position} ${code}${mark ? ` focus ${mark}` : ""}`}
      onClick={(e) => onPick(row.driver, e.shiftKey)}
      className="pw-row"
      style={{
        display: "grid",
        gridTemplateColumns: COLUMNS,
        gap: 4,
        alignItems: "center",
        height: 31,
        padding: "0 6px",
        borderRadius: 3,
        cursor: "pointer",
        userSelect: "none",
        background: mark === "A" ? "rgba(255,255,255,.08)" : mark === "B" ? "rgba(255,255,255,.04)" : "transparent",
        font: type.cell,
        opacity: row.gap === "OUT" ? 0.45 : 1,
      }}
    >
      <span style={{ color: color.label }}>{row.position}</span>
      <span style={{ height: 18, background: team }} />
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: font.sans, fontWeight: 700, fontSize: 14, letterSpacing: ".04em" }}>
        {code}
        {mark && (
          <span
            style={{
              font: `700 9px/1 ${font.mono}`,
              padding: "2px 4px",
              borderRadius: 2,
              background: mark === "A" ? color.text : "#7d8692",
              color: color.bg,
            }}
          >
            {mark}
          </span>
        )}
      </span>
      <span style={{ textAlign: "right", color: color.textSoft }}>{row.gap}</span>
      <span style={{ textAlign: "right", color: row.interval !== null && row.interval < 1 ? color.personal : color.textSoft }}>
        {row.position === 1 ? "—" : row.interval === null ? "" : formatGap(row.interval)}
      </span>
      <span style={{ textAlign: "right", color: toneColor[row.lastTone] }}>{formatLapTime(row.last)}</span>
      <span style={{ textAlign: "right", color: row.bestIsOverall ? color.overall : color.text }}>{formatLapTime(row.best)}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {row.compound && (
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: `2px solid ${tyre.color}`,
              color: tyre.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: `700 9px/1 ${font.mono}`,
            }}
          >
            {tyre.code}
          </span>
        )}
        <span style={{ color: color.textMuted }}>{row.tyreAge ?? ""}</span>
      </span>
      <span style={{ textAlign: "right", color: color.label }}>{row.pits}</span>
    </div>
  );
}
