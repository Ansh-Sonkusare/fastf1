import type { CSSProperties, ReactNode } from "react";
import type { FlagBand } from "./timeline";
import { color, font, futureHatch } from "../ui/tokens";
import type { LayoutMode } from "../ui/primitives";

/** Lap marks along the scrubber: 1, every 10th lap, and the last lap. */
function lapMarks(totalLaps: number): number[] {
  const marks = new Set<number>([1]);
  for (let l = 10; l < totalLaps; l += 10) marks.add(l);
  if (totalLaps > 1) marks.add(totalLaps);
  return [...marks].sort((a, b) => a - b);
}

const bandStyle: Record<FlagBand["kind"], CSSProperties> = {
  sc: { background: "rgba(245,208,32,.2)", border: "1px solid rgba(245,208,32,.7)" },
  yellow: { background: "rgba(245,208,32,.55)" },
};

/**
 * The reference's timeline: a play button, a label, and a drawn track (base line, travelled
 * line, SC/yellow bands, pit ticks, lap labels, a hatch over the unplayed laps) with a real
 * `<input type=range aria-label="Lap scrubber">` layered on top for pointer and keyboard control —
 * visually transparent, so only the drawing shows, but it is what actually receives input.
 */
export function TimelineBar({
  mode,
  label,
  lap,
  totalLaps,
  playing,
  onToggle,
  onSeek,
  bands,
  pitLaps,
}: {
  mode: LayoutMode;
  label: ReactNode;
  lap: number;
  totalLaps: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (lap: number) => void;
  bands: readonly FlagBand[];
  pitLaps: readonly number[];
}) {
  const big = mode === "wall";
  const pct = (l: number) => (totalLaps <= 1 ? 0 : ((l - 1) / (totalLaps - 1)) * 100);
  const cell = totalLaps > 1 ? 100 / (totalLaps - 1) : 100;
  const head = pct(lap);
  const trackHeight = big ? 50 : 34;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: big ? 24 : 12,
        padding: big ? "0 24px" : "0 12px",
        background: color.panel,
      }}
    >
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={onToggle} style={playButtonStyle}>
        {playing ? "❚❚" : "▶"}
      </button>
      {label}
      <div style={{ position: "relative", flex: 1, height: trackHeight, marginTop: 4 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: trackHeight / 2 - 1, height: 2, background: color.border }} />
        <div style={{ position: "absolute", left: 0, top: trackHeight / 2 - 1, height: 2, width: `${head}%`, background: color.label }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            height: trackHeight - 8,
            left: `${head}%`,
            right: 0,
            background: futureHatch,
          }}
        />
        {bands.map((b, i) => {
          const left = Math.max(0, pct(b.fromLap) - cell / 2);
          const width = Math.min(100 - left, cell * (b.toLap - b.fromLap + 1));
          return <div key={i} style={{ position: "absolute", top: 4, height: trackHeight - 16, left: `${left}%`, width: `${width}%`, ...bandStyle[b.kind] }} />;
        })}
        {pitLaps.map((l, i) => (
          <span key={i} style={{ position: "absolute", left: `${pct(l)}%`, top: 2, width: 1, height: trackHeight - 12, background: color.text }} />
        ))}
        {lapMarks(totalLaps).map((l) => (
          <span
            key={l}
            style={{
              position: "absolute",
              left: `${pct(l)}%`,
              top: trackHeight - 11,
              transform: "translateX(-50%)",
              font: `500 ${big ? 13 : 10}px/1 ${font.mono}`,
              color: color.dim,
            }}
          >
            L{l}
          </span>
        ))}
        <span style={{ position: "absolute", left: `${head}%`, top: 0, height: trackHeight - 14, width: 2, marginLeft: -1, background: color.accent }} />
        <span
          style={{
            position: "absolute",
            left: `${head}%`,
            top: trackHeight / 2 - 1 - 6,
            width: 12,
            height: 12,
            marginLeft: -6,
            background: color.accent,
            border: `2px solid ${color.bg}`,
          }}
        />
        <input
          type="range"
          aria-label="Lap scrubber"
          min={1}
          max={Math.max(1, totalLaps)}
          value={lap}
          onChange={(e) => onSeek(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize", margin: 0 }}
        />
      </div>
      <Legend big={big} swatchStyle={{ width: big ? 14 : 12, height: big ? 11 : 9, background: "rgba(245,208,32,.35)", border: "1px solid #f5d020" }}>
        SC / YELLOW
      </Legend>
      <Legend big={big} swatchStyle={{ width: big ? 2 : 1, height: big ? 16 : 12, background: color.text }}>
        PIT
      </Legend>
    </div>
  );
}

function Legend({ big, swatchStyle, children }: { big: boolean; swatchStyle: CSSProperties; children: ReactNode }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: big ? 8 : 6, font: `500 ${big ? 14 : 11}px/1 ${font.mono}`, color: color.label, whiteSpace: "nowrap" }}>
      <span style={swatchStyle} />
      {children}
    </span>
  );
}

const playButtonStyle = {
  width: 30,
  height: 24,
  flexShrink: 0,
  border: `1px solid ${color.borderMuted}`,
  background: "transparent",
  color: color.text,
  font: `700 10px/1 ${font.mono}`,
  cursor: "pointer",
} as const;
