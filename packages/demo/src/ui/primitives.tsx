import type { CSSProperties, ReactNode } from "react";
import type { Async } from "../data/useOpenF1";
import { formatEstimate, type Estimate } from "./format";
import { color, font, predictedHatch, predictedHatchFaint, type } from "./tokens";

export interface PanelFrameProps {
  /** "01".."10" */
  readonly num: string;
  readonly title: ReactNode;
  /** Right side of the header: legends, hints, toggles. */
  readonly right?: ReactNode;
  /** Predicted panels get the teal border. */
  readonly predicted?: boolean;
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

export function PanelFrame({ num, title, right, predicted, children, style }: PanelFrameProps) {
  return (
    <section
      data-panel={num}
      style={{
        background: color.panel,
        border: `1px solid ${predicted ? color.borderPredicted : color.border}`,
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderBottom: `1px solid ${color.border}`,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            margin: 0,
            font: type.panelTitle,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: color.text,
          }}
        >
          {num} {title}
        </h2>
        <div style={{ flex: 1 }} />
        {right}
      </header>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </section>
  );
}

/** Small uppercase mono label used in headers and legends. */
export function Label({ children, tone = color.label }: { children: ReactNode; tone?: string }) {
  return (
    <span style={{ font: type.label, letterSpacing: ".08em", color: tone, textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

/** A measured value: plain, solid. */
export function Measured({ children, tone = color.text }: { children: ReactNode; tone?: string }) {
  return <span style={{ fontFamily: font.mono, color: tone }}>{children}</span>;
}

/** A predicted value: teal, ≈ prefix, ± spread and confidence. Never render an estimate any other way. */
export function Predicted({ estimate, digits = 1, unit = "" }: { estimate: Estimate; digits?: number; unit?: string }) {
  return (
    <span style={{ fontFamily: font.mono, color: color.predicted }} title="predicted">
      {formatEstimate(estimate, digits, unit)}
    </span>
  );
}

/** Container for a predicted region: dashed teal border over a faint hatch. */
export function PredictedBox({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        border: `1px dashed ${color.predictedBorder}`,
        borderRadius: 4,
        background: predictedHatchFaint,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function MeasuredLegend() {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, font: type.label, color: color.textMuted }}>
      <span style={{ width: 18, height: 2, background: color.text }} />
      MEASURED
    </span>
  );
}

export function PredictedLegend({ label = "≈ PREDICTED ± CONFIDENCE" }: { label?: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, font: type.label, color: color.predicted }}>
      <span style={{ width: 18, height: 10, border: `1px dashed ${color.predicted}`, background: predictedHatch }} />
      {label}
    </span>
  );
}

/** Colored key swatch for panel legends ("DRS", "OVERALL"...). */
export function Swatch({ tone, children, shape = "bar" }: { tone: string; children: ReactNode; shape?: "bar" | "square" }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, font: type.label, color: tone }}>
      <span style={shape === "bar" ? { width: 14, height: 3, background: tone } : { width: 9, height: 9, background: tone }} />
      {children}
    </span>
  );
}

/** Loading / error / empty placeholder for any Async. Renders `children(data)` once ok. */
export function AsyncView<T>({
  state,
  children,
  isEmpty,
}: {
  state: Async<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
}) {
  const note = (text: string, tone: string = color.dim) => (
    <div style={{ padding: 16, font: type.label, letterSpacing: ".06em", color: tone }}>{text}</div>
  );
  if (state.status === "loading") return note("LOADING…");
  if (state.status === "error")
    return (
      <div style={{ padding: 16, display: "flex", gap: 10, alignItems: "center", font: type.label, color: color.red }}>
        ERROR · {state.error.message}
        <button type="button" onClick={state.retry} style={retryStyle}>
          RETRY
        </button>
      </div>
    );
  if (isEmpty?.(state.data)) return note("NO DATA FOR THIS SESSION");
  return <>{children(state.data)}</>;
}

export const retryStyle = {
  padding: "4px 8px",
  borderRadius: 3,
  border: `1px solid ${color.border}`,
  background: color.panelRaised,
  color: color.text,
  font: type.label,
  cursor: "pointer",
} as const;
