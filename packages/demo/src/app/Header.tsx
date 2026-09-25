import type { ReactNode } from "react";
import type { LayoutMode } from "../ui/primitives";
import { color, font } from "../ui/tokens";
import type { FlagKind } from "./timeline";

const flagStyle: Record<FlagKind, { bg: string; fg: string }> = {
  green: { bg: "#173323", fg: color.personal },
  yellow: { bg: color.yellow, fg: "#000" },
  sc: { bg: color.yellow, fg: "#000" },
  vsc: { bg: color.yellow, fg: "#000" },
  red: { bg: color.red, fg: "#000" },
  chequered: { bg: color.text, fg: "#000" },
};

/**
 * The Undercut Terminal header: brand, session, lap, clock, track status, weather, desk/wall.
 * Sized up for `mode: "wall"`; same cells, same aria-labels, in both modes (see PR notes on why
 * the session select and lap stepper stay visible in wall mode, unlike the reference).
 */
export function Header({
  mode,
  onModeChange,
  sessionSelect,
  lap,
  totalLaps,
  onPrev,
  onNext,
  clock,
  flag,
  statusPill,
  weatherSlot,
  onSeason,
}: {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  sessionSelect: ReactNode;
  lap: number | null;
  totalLaps: number | null;
  onPrev?: () => void;
  onNext?: () => void;
  clock?: string;
  flag?: { kind: FlagKind; label: string } | null;
  statusPill?: ReactNode;
  weatherSlot?: ReactNode;
  onSeason: () => void;
}) {
  const big = mode === "wall";
  return (
    <div style={{ display: "flex", alignItems: "stretch", background: color.panel, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", padding: big ? "0 26px" : "0 16px", background: color.accent, color: "#000" }}>
        <span style={{ font: `700 ${big ? 26 : 15}px/1 ${font.sans}`, letterSpacing: ".16em" }}>UNDERCUT</span>
        <span style={{ fontWeight: 500, letterSpacing: ".06em", marginLeft: 10, fontSize: big ? 13 : 11, opacity: 0.7 }}>STRATEGY TERMINAL</span>
      </div>
      <Cell big={big}>{sessionSelect}</Cell>
      <Cell big={big} label="Lap">
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: `600 ${big ? 76 : 26}px/1 ${font.mono}`, color: color.text }}>
            {lap ?? "—"}
            <span style={{ color: color.dim, fontSize: big ? 36 : 16 }}>/{totalLaps ?? "—"}</span>
          </span>
          {onPrev && (
            <button type="button" aria-label="Previous lap" onClick={onPrev} style={stepStyle}>
              ‹
            </button>
          )}
          {onNext && (
            <button type="button" aria-label="Next lap" onClick={onNext} style={stepStyle}>
              ›
            </button>
          )}
        </span>
      </Cell>
      {clock !== undefined && (
        <Cell big={big} label="Time" borderRight={!flag && !statusPill}>
          <span style={{ font: `600 ${big ? 44 : 22}px/1 ${font.mono}`, color: color.text }}>{clock}</span>
        </Cell>
      )}
      {flag && (
        <div
          aria-label="Track status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: big ? 12 : 8,
            padding: big ? "0 22px" : "0 14px",
            background: flagStyle[flag.kind].bg,
            color: flagStyle[flag.kind].fg,
            font: `700 ${big ? 24 : 12}px/1 ${font.mono}`,
            letterSpacing: ".06em",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span style={{ width: big ? 14 : 8, height: big ? 14 : 8, background: flagStyle[flag.kind].fg, borderRadius: flag.kind === "green" ? "50%" : 0 }} />
          {flag.label}
        </div>
      )}
      {statusPill}
      <div style={{ flex: 1 }} />
      {weatherSlot && (
        <div style={{ display: "flex", alignItems: "center", padding: big ? "0 14px" : "0 12px", borderLeft: `1px solid ${color.border}` }}>{weatherSlot}</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderLeft: `1px solid ${color.border}` }}>
        {(["desk", "wall"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            style={{
              height: 22,
              padding: "0 10px",
              border: `1px solid ${color.borderMuted}`,
              background: mode === m ? color.accent : "transparent",
              color: mode === m ? "#000" : color.label,
              font: `600 11px/1 ${font.sans}`,
              letterSpacing: ".06em",
              cursor: "pointer",
            }}
          >
            {m.toUpperCase()}
          </button>
        ))}
        <button type="button" onClick={onSeason} style={{ ...stepStyle, height: 22, padding: "0 10px", font: `600 11px/1 ${font.sans}`, letterSpacing: ".06em" }}>
          SEASON
        </button>
      </div>
    </div>
  );
}

function Cell({ big, label, borderRight = true, children }: { big: boolean; label?: string; borderRight?: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: big ? 12 : 10,
        padding: big ? "0 20px" : "0 16px",
        borderRight: borderRight ? `1px solid ${color.border}` : undefined,
        alignSelf: "center",
      }}
    >
      {label && (
        <span style={{ font: `500 ${big ? 15 : 11}px/1 ${font.sans}`, letterSpacing: ".07em", textTransform: "uppercase", color: color.label }}>{label}</span>
      )}
      {children}
    </div>
  );
}

const stepStyle = {
  height: 24,
  padding: "0 8px",
  border: `1px solid ${color.borderMuted}`,
  background: "transparent",
  color: color.text,
  cursor: "pointer",
} as const;
