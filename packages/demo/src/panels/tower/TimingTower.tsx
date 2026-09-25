import { useMemo, useState, type ReactNode } from "react";
import { pick } from "../../app/replay";
import { lapCrossings, pitLanePassLaps, realPitStops } from "../../app/timeline";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { formatGap, formatLapTime } from "../../ui/format";
import { AsyncView, PanelFrame, useHotkey, useLayoutMode } from "../../ui/primitives";
import { color, font, tyreOf, type } from "../../ui/tokens";
import { buildTower, type LapTone, type TowerRow } from "./shape";

const DETAIL_COLUMNS = "20px 3px 52px 62px 52px 64px 64px 44px 16px";
const DESK_COMPACT_COLUMNS = "28px 3px minmax(0,1fr) 90px 62px";
const WALL_COLUMNS = "40px 5px minmax(0,1fr) 150px 90px";
const toneColor: Record<LapTone, string> = { overall: color.overall, personal: color.personal, plain: color.text };

/** Remembers the click-to-focus hint was dismissed, across reloads. */
const HINT_KEY = "undercut.towerHint";

type Mark = "A" | "B" | null;

export default function TimingTower({ session, lap, focus, drivers, setFocus }: PanelProps) {
  const mode = useLayoutMode();
  const big = mode === "wall";

  const [detail, setDetail] = useState(false);
  useHotkey("d", () => setDetail((d) => !d));

  const [hintSeen, setHintSeen] = useState(() => {
    try {
      return !!localStorage.getItem(HINT_KEY);
    } catch {
      return false;
    }
  });
  const dismissHint = () => {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* private browsing or storage disabled: the hint just won't stay dismissed */
    }
    setHintSeen(true);
  };

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

  const showDetail = !big && detail;
  const showHint = !big && !hintSeen;

  return (
    <PanelFrame
      num="01"
      title={big ? "Running order" : "Timing"}
      right={
        big ? (
          <span style={{ font: type.label, color: color.dim }}>GAP · TYRE</span>
        ) : (
          <button type="button" onClick={() => setDetail((d) => !d)} style={detailToggleStyle(detail)}>
            D · DETAIL {detail ? "ON" : "OFF"}
          </button>
        )
      }
    >
      <AsyncView state={data}>
        {([laps, stints, raceControl, pits]) => {
          if (!crossings) return null;
          const rows = buildTower({ lap, crossings, laps, stints, stops: realPitStops(pits, stints, pitLanePassLaps(raceControl)), retired });
          return (
            <>
              {!big &&
                (showDetail ? (
                  <ColumnHeader columns={DETAIL_COLUMNS} gap={4} padding="8px 12px">
                    <span>P</span>
                    <span />
                    <span>DRV</span>
                    <span style={{ textAlign: "right" }}>GAP</span>
                    <span style={{ textAlign: "right" }}>INT</span>
                    <span style={{ textAlign: "right" }}>LAST</span>
                    <span style={{ textAlign: "right" }}>BEST</span>
                    <span>TYRE</span>
                    <span style={{ textAlign: "right" }}>PIT</span>
                  </ColumnHeader>
                ) : (
                  <ColumnHeader columns={DESK_COMPACT_COLUMNS} gap={10} padding="0 12px">
                    <span>P</span>
                    <span />
                    <span>DRIVER</span>
                    <span style={{ textAlign: "right" }}>GAP</span>
                    <span style={{ textAlign: "right" }}>TYRE</span>
                  </ColumnHeader>
                ))}
              <div
                role="list"
                style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "auto", padding: big ? undefined : "0 6px 8px" }}
              >
                {rows.map((r) => {
                  const code = drivers.get(r.driver)?.code ?? String(r.driver);
                  const team = drivers.get(r.driver)?.color ?? color.label;
                  const mark: Mark = r.driver === focus.a ? "A" : r.driver === focus.b ? "B" : null;
                  return showDetail ? (
                    <DetailRow key={r.driver} row={r} code={code} team={team} mark={mark} onPick={onPick} />
                  ) : (
                    <CompactRow key={r.driver} row={r} code={code} team={team} mark={mark} onPick={onPick} big={big} />
                  );
                })}
              </div>
              {showHint && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: "auto",
                    padding: "8px 12px",
                    borderTop: `1px solid ${color.border}`,
                    background: color.panelHeader,
                  }}
                >
                  <span style={{ flex: 1, font: `500 12px/1.4 ${font.sans}`, color: color.textSoft }}>
                    Click a driver to focus A. Shift-click to compare as B.
                  </span>
                  <button type="button" onClick={dismissHint} style={okButtonStyle}>
                    OK
                  </button>
                </div>
              )}
            </>
          );
        }}
      </AsyncView>
    </PanelFrame>
  );
}

function ColumnHeader({ columns, gap, padding, children }: { columns: string; gap: number; padding: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: columns, gap, alignItems: "center", padding, font: type.label, color: color.dim, letterSpacing: ".06em" }}>
      {children}
    </div>
  );
}

/** A rows's focus tint and border: solid lime for A, dashed grey for B, a faint zebra stripe otherwise. */
function rowChrome(mark: Mark, position: number, big: boolean): { background: string; border: string } {
  const width = big ? 2 : 1;
  if (mark === "A") return { background: "rgba(198,255,61,.13)", border: `${width}px solid ${color.accent}` };
  if (mark === "B") return { background: "rgba(255,255,255,.06)", border: `${width}px dashed ${color.label}` };
  return { background: position % 2 === 0 ? "rgba(140,170,255,.035)" : "transparent", border: `${width}px solid transparent` };
}

function FocusBadge({ mark, big }: { mark: "A" | "B"; big: boolean }) {
  return (
    <span
      style={{
        font: `700 ${big ? 15 : 10}px/1 ${font.mono}`,
        padding: big ? "4px 7px" : "3px 5px",
        background: mark === "A" ? color.accent : color.label,
        color: color.bg,
      }}
    >
      {mark}
    </span>
  );
}

function detailToggleStyle(active: boolean) {
  return {
    height: 20,
    padding: "0 8px",
    border: `1px solid ${color.borderMuted}`,
    background: active ? color.accent : "transparent",
    color: active ? color.bg : color.label,
    font: `600 10px/1 ${font.sans}`,
    letterSpacing: ".06em",
    cursor: "pointer",
  } as const;
}

const okButtonStyle = {
  height: 20,
  padding: "0 8px",
  border: "none",
  background: color.accent,
  color: color.bg,
  font: `700 10px/1 ${font.mono}`,
  cursor: "pointer",
} as const;

/** Default row: P, driver (team bar + A/B badge), GAP, TYRE. Used in desk-compact and wall (bigger). */
function CompactRow({
  row,
  code,
  team,
  mark,
  onPick,
  big,
}: {
  row: TowerRow;
  code: string;
  team: string;
  mark: Mark;
  onPick: (driver: number, compare: boolean) => void;
  big: boolean;
}) {
  const tyre = tyreOf(row.compound);
  const { background, border } = rowChrome(mark, row.position, big);
  return (
    <div
      role="listitem"
      data-driver={row.driver}
      aria-label={`P${row.position} ${code}${mark ? ` focus ${mark}` : ""}`}
      onClick={(e) => onPick(row.driver, e.shiftKey)}
      className="pw-row"
      style={{
        display: "grid",
        gridTemplateColumns: big ? WALL_COLUMNS : DESK_COMPACT_COLUMNS,
        gap: big ? 14 : 10,
        alignItems: "center",
        height: big ? 43 : 29,
        padding: big ? "0 18px" : "0 12px",
        background,
        border,
        cursor: "pointer",
        userSelect: "none",
        opacity: row.gap === "OUT" ? 0.45 : 1,
      }}
    >
      <span style={{ font: `600 ${big ? 24 : 15}px/1 ${font.mono}`, color: color.text }}>{row.position}</span>
      <span style={{ height: big ? 28 : 18, background: team }} />
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: big ? 12 : 8,
          font: `700 ${big ? 28 : 17}px/1 ${font.sans}`,
          color: color.text,
          letterSpacing: ".03em",
        }}
      >
        {code}
        {mark && <FocusBadge mark={mark} big={big} />}
      </span>
      <span style={{ textAlign: "right", font: `500 ${big ? 24 : 15}px/1 ${font.mono}`, color: color.text }}>{row.gap}</span>
      <span style={{ textAlign: "right", font: `500 ${big ? 22 : 14}px/1 ${font.mono}`, whiteSpace: "nowrap" }}>
        {row.compound && <span style={{ color: tyre.color, fontWeight: 700 }}>{tyre.code}</span>}
        <span style={{ color: color.label }}> {row.tyreAge ?? ""}</span>
      </span>
    </div>
  );
}

/** Full-stat row: P, DRV, GAP, INT, LAST, BEST, TYRE, PIT. Toggled on by the D key, desk only. */
function DetailRow({
  row,
  code,
  team,
  mark,
  onPick,
}: {
  row: TowerRow;
  code: string;
  team: string;
  mark: Mark;
  onPick: (driver: number, compare: boolean) => void;
}) {
  const tyre = tyreOf(row.compound);
  const { background, border } = rowChrome(mark, row.position, false);
  return (
    <div
      role="listitem"
      data-driver={row.driver}
      aria-label={`P${row.position} ${code}${mark ? ` focus ${mark}` : ""}`}
      onClick={(e) => onPick(row.driver, e.shiftKey)}
      className="pw-row"
      style={{
        display: "grid",
        gridTemplateColumns: DETAIL_COLUMNS,
        gap: 4,
        alignItems: "center",
        height: 31,
        padding: "0 6px",
        borderRadius: 3,
        cursor: "pointer",
        userSelect: "none",
        background,
        border,
        font: type.cell,
        opacity: row.gap === "OUT" ? 0.45 : 1,
      }}
    >
      <span style={{ color: color.text, fontWeight: 600 }}>{row.position}</span>
      <span style={{ height: 18, background: team }} />
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: font.sans, fontWeight: 700, fontSize: 14, letterSpacing: ".04em", color: color.text }}>
        {code}
        {mark && <FocusBadge mark={mark} big={false} />}
      </span>
      <span style={{ textAlign: "right", color: color.text }}>{row.gap}</span>
      <span style={{ textAlign: "right", color: row.interval !== null && row.interval < 1 ? color.personal : color.text }}>
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
