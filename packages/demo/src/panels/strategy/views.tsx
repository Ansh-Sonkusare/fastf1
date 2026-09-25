import type { ReactNode } from "react";
import { Label, PredictedBox } from "../../ui/primitives";
import { color, font, predictedHatch, type, tyreOf } from "../../ui/tokens";
import { WINDOW_BOX, degradationChart, windowChart } from "./chart";
import { approx } from "./format";
import type { Strategy } from "./types";

export const mono = (weight: number, size: number) => `${weight} ${size}px/1 ${font.mono}`;
export const pct = (p: number) => `${Math.round(p * 100)}%`;

export function Section({
  title,
  note,
  children,
}: { title: string; note?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            font: mono(600, 10),
            letterSpacing: ".06em",
            color: color.label,
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1 }} />
        {note && <span style={{ font: mono(600, 10), color: color.predicted }}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

const STRIP_S = 12;

export function Ghost({ s }: { s: Strategy }) {
  const g = s.ghost;
  const lo = g.gapToLeader.value - STRIP_S / 2;
  const left = (gap: number) => `${((gap - lo) / STRIP_S) * 100}%`;
  const detail = [
    `Pit loss ${g.pitLoss.toFixed(1)}s`,
    g.ahead && `≈${g.ahead.margin.toFixed(1)}s behind ${g.ahead.code}`,
    g.behind && `≈${g.behind.margin.toFixed(1)}s ahead of ${g.behind.code}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <PredictedBox
      style={{
        display: "grid",
        gridTemplateColumns: "260px minmax(0,1fr)",
        gap: 18,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Label tone={color.predicted}>Ghost projection · pit now, L{s.lap}</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, color: color.predicted }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Rejoin</span>
          <span style={{ font: mono(600, 44) }}>≈P{Math.round(g.position.value)}</span>
          <span style={{ font: mono(500, 12) }}>±{g.position.sd.toFixed(1)}</span>
        </div>
        <span style={{ font: `500 12px/1.4 ${font.mono}`, color: color.textMuted }}>{detail}</span>
        <span
          style={{
            font: `500 12px/1.4 ${font.mono}`,
            color: g.clearAir ? color.personal : color.amber,
          }}
        >
          {g.clearAir
            ? "Clear air on exit"
            : `Traffic on exit: in ${g.ahead?.code ?? ""} dirty air`}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            font: mono(500, 11),
            color: color.predicted,
          }}
        >
          <Bar value={g.probability} width={90} />
          {pct(g.probability)} · ±{g.gapToLeader.sd.toFixed(1)}s
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            font: type.label,
            color: color.dim,
          }}
        >
          <span>← AHEAD</span>
          <span>GAP TO LEADER AFTER STOP (S)</span>
          <span>BEHIND →</span>
        </div>
        <div style={{ position: "relative", height: 96 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 37,
              height: 1,
              background: "#2a3038",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 27,
              height: 21,
              left: left(g.gapToLeader.value - g.gapToLeader.sd),
              width: `${((2 * g.gapToLeader.sd) / STRIP_S) * 100}%`,
              border: `1px dashed ${color.predicted}`,
              background: predictedHatch,
              borderRadius: 2,
            }}
          />
          {g.field.map((c) => (
            <div
              key={c.code}
              style={{
                position: "absolute",
                top: 30,
                left: left(c.gapToLeader),
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: c.color,
                  border: `2px solid ${color.panel}`,
                  opacity: c.neighbour ? 1 : 0.5,
                }}
              />
              <span style={{ font: mono(600, 11), color: color.textSoft, height: 11 }}>
                {c.neighbour ? c.code : ""}
              </span>
              <span style={{ font: mono(400, 10), color: color.dim, height: 10 }}>
                {c.neighbour ? `+${c.gapToLeader.toFixed(1)}` : ""}
              </span>
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "baseline",
              gap: 5,
              whiteSpace: "nowrap",
              color: color.predicted,
            }}
          >
            <span style={{ font: mono(700, 11) }}>{s.focus.code}</span>
            <span style={{ font: mono(500, 10) }}>{approx(g.gapToLeader, 1)}</span>
          </div>
          <span
            style={{
              position: "absolute",
              top: 28,
              left: "50%",
              width: 19,
              height: 19,
              marginLeft: -9.5,
              boxSizing: "border-box",
              borderRadius: "50%",
              border: `2px dashed ${color.predicted}`,
            }}
          />
        </div>
      </div>
    </PredictedBox>
  );
}

const ZONE_STYLE = {
  UNDERCUT: { fill: "rgba(255,181,71,.10)", text: color.amber },
  OPTIMAL: { fill: "rgba(111,211,232,.14)", text: color.predicted },
  OVERCUT: { fill: "rgba(155,140,255,.10)", text: "#a99cff" },
} as const;

const axisText = { fill: color.dim, font: `400 10px ${font.mono}` } as const;

export function PitWindowSvg({ s }: { s: Strategy }) {
  const w = windowChart(s);
  const { x0, x1, y0, y1 } = WINDOW_BOX;
  return (
    <svg
      viewBox="0 0 620 232"
      style={{ width: "100%", maxHeight: 300, display: "block" }}
      role="img"
      aria-label="Pit window cost curve"
    >
      <defs>
        <pattern
          id="strategy-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="2" height="6" style={{ fill: color.predicted, opacity: 0.4 }} />
        </pattern>
      </defs>
      {w.zones.map((z) => (
        <g key={z.kind}>
          <rect
            x={z.x}
            y={y1}
            width={Math.max(0, z.w)}
            height={y0 - y1}
            style={{ fill: ZONE_STYLE[z.kind].fill }}
          />
          {z.labelled && (
            <text
              x={z.x + z.w / 2}
              y={30}
              textAnchor="middle"
              style={{ fill: ZONE_STYLE[z.kind].text, font: mono(600, 10), letterSpacing: ".06em" }}
            >
              {z.kind}
            </text>
          )}
        </g>
      ))}
      {w.yTicks.map((t) => (
        <g key={t.label}>
          <line x1={x0} x2={x1} y1={t.y} y2={t.y} style={{ stroke: color.border }} />
          <text x={34} y={t.y + 3} textAnchor="end" style={axisText}>
            {t.label}
          </text>
        </g>
      ))}
      {w.stayOut && (
        <g>
          <line
            x1={x0}
            x2={x1}
            y1={w.stayOut.y}
            y2={w.stayOut.y}
            style={{ stroke: color.label, strokeDasharray: "2 4" }}
          />
          <text
            x={606}
            y={w.stayOut.y - 5}
            textAnchor="end"
            style={{ fill: color.label, font: mono(500, 10) }}
          >
            STAY OUT {approx(s.window.stayOut ?? { value: 0, sd: 0 }, 1, "s", true)}
          </text>
        </g>
      )}
      <path d={w.band} style={{ fill: "url(#strategy-hatch)" }} />
      <path
        d={w.curve}
        style={{ fill: "none", stroke: color.predicted, strokeWidth: 2, strokeDasharray: "6 4" }}
      />
      <circle
        cx={w.optimal.x}
        cy={w.optimal.y}
        r={5}
        style={{ fill: color.panel, stroke: color.predicted, strokeWidth: 2 }}
      />
      <line
        x1={w.now}
        x2={w.now}
        y1={y1}
        y2={y0}
        style={{ stroke: color.text, strokeWidth: 1.5 }}
      />
      <text x={w.now} y={210} textAnchor="middle" style={{ fill: color.text, font: mono(600, 10) }}>
        NOW
      </text>
      {w.xTicks.map((t) => (
        <text key={t.label} x={t.x} y={224} textAnchor="middle" style={axisText}>
          {t.label}
        </text>
      ))}
    </svg>
  );
}

export function DegradationSvg({ s }: { s: Strategy }) {
  const d = degradationChart(s);
  return (
    <svg
      viewBox="0 0 400 232"
      style={{ width: "100%", maxHeight: 300, display: "block" }}
      role="img"
      aria-label="Tyre degradation"
    >
      {d.yTicks.map((t) => (
        <g key={t.label}>
          <line x1={40} x2={392} y1={t.y} y2={t.y} style={{ stroke: color.border }} />
          <text x={34} y={t.y + 3} textAnchor="end" style={axisText}>
            {t.label}
          </text>
        </g>
      ))}
      {d.curves.map((c) => {
        const tone = tyreOf(c.compound).color;
        return (
          <g key={c.compound} style={{ opacity: c.prior ? 0.55 : 1 }}>
            <path d={c.band} style={{ fill: tone, opacity: 0.12 }} />
            <path
              d={c.d}
              style={{ fill: "none", stroke: tone, strokeWidth: 1.8, strokeDasharray: "5 4" }}
            />
            <text x={c.label.x} y={c.label.y} style={{ fill: tone, font: mono(700, 10) }}>
              {tyreOf(c.compound).code}
            </text>
          </g>
        );
      })}
      {d.dots.map((p) => (
        <circle
          key={`${p.x}:${p.y}`}
          cx={p.x}
          cy={p.y}
          r={2.6}
          style={{ fill: tyreOf(p.compound).color, opacity: p.current ? 1 : 0.3 }}
        />
      ))}
      <line x1={d.now} x2={d.now} y1={16} y2={194} style={{ stroke: color.text, strokeWidth: 1 }} />
      <text x={d.now} y={12} textAnchor="middle" style={{ fill: color.text, font: mono(600, 10) }}>
        AGE {s.focus.tyreAge}
      </text>
      {d.xTicks.map((t) => (
        <text key={t.label} x={t.x} y={210} textAnchor="middle" style={axisText}>
          {t.label}
        </text>
      ))}
      <text x={392} y={226} textAnchor="end" style={axisText}>
        TYRE AGE (LAPS) · DOTS = MEASURED {s.focus.code}
      </text>
    </svg>
  );
}

export function Bar({ value, width }: { value: number; width?: number }) {
  return (
    <span
      style={{
        flex: width ? undefined : 1,
        width,
        height: 5,
        background: "#1f2a2e",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: pct(value),
          background: color.predicted,
          opacity: 0.45 + value * 0.55,
        }}
      />
    </span>
  );
}
