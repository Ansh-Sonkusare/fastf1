import { createContext, useContext, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { isLocked } from "../data/openf1";
import type { Async } from "../data/useOpenF1";
import { formatEstimate, type Estimate } from "./format";
import { color, font, predictedHatch, predictedHatchFaint, type } from "./tokens";

export interface PanelFrameProps {
  /** "01".."10", kept as the `data-panel` hook for browser-proof automation. Not shown in the header. */
  readonly num: string;
  readonly title: ReactNode;
  /** Right side of the header: legends, hints, toggles. */
  readonly right?: ReactNode;
  /** Predicted panels get the teal border. */
  readonly predicted?: boolean;
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

/** The Undercut Terminal panel chrome: a lime bullet, an uppercase title, no radius. */
export function PanelFrame({ num, title, right, predicted, children, style }: PanelFrameProps) {
  return (
    <section
      data-panel={num}
      style={{
        background: color.panel,
        border: `1px solid ${predicted ? color.borderPredicted : color.border}`,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          minHeight: 28,
          padding: "0 12px",
          background: color.panelHeader,
          borderBottom: `1px solid ${color.border}`,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <span style={{ width: 6, height: 6, flexShrink: 0, background: color.accent }} />
        <h2
          style={{
            margin: 0,
            font: type.panelTitle,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: color.text,
          }}
        >
          {title}
        </h2>
        <div style={{ flex: 1 }} />
        {right}
      </header>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </section>
  );
}

export interface Tab {
  readonly key: string;
  readonly label: string;
  readonly active: boolean;
  readonly onClick?: () => void;
}

/**
 * The numbered tab strip from the reference (analysis tabs, footer key hints): a keycap digit in
 * `dim`/black, an uppercase label, lime fill when active. `onClick` omitted renders an inert hint.
 */
export function TabStrip({ tabs, right }: { tabs: readonly Tab[]; right?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        minHeight: 28,
        background: color.panelHeader,
        borderBottom: `1px solid ${color.border}`,
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={t.onClick}
          aria-pressed={t.active}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            border: "none",
            borderRight: `1px solid ${color.border}`,
            background: t.active ? color.accent : "transparent",
            color: t.active ? "#000" : color.label,
            font: `600 11px/1 ${font.sans}`,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            cursor: t.onClick ? "pointer" : "default",
          }}
        >
          <span style={{ color: t.active ? "#000" : color.dim }}>{t.key}</span>
          {t.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

/**
 * Global hotkey, ignoring form inputs and modified keys (mirrors the reference's `onKey`).
 * `key` is a single character (case-insensitive) or a named key ("ArrowLeft", " ").
 */
export function useHotkey(key: string, handler: () => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      const pressed = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (pressed !== key) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}

export type LayoutMode = "desk" | "wall";
const LayoutModeContext = createContext<LayoutMode>("desk");
/** Wrap the console so panels can later read `useLayoutMode()` and adapt to wall's bigger, sparser view. */
export const LayoutModeProvider = LayoutModeContext.Provider;
export function useLayoutMode(): LayoutMode {
  return useContext(LayoutModeContext);
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
  if (state.status === "error" && isLocked(state.error)) return <LockedNote inferred={state.error.inferred} />;
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

export const LOCKED_MESSAGE = "OpenF1 is locked while a live F1 session runs. Past-race data returns when it ends.";
export const UNREACHABLE_MESSAGE = "Can't reach OpenF1: offline, blocked, or locked by a live session. Retrying…";

/**
 * Shown in place of panel content while OpenF1 is locked; the page re-probes every minute.
 * Claims a live session only when OpenF1 said so (a readable 401), not when it was inferred.
 */
export function LockedNote({ inferred }: { inferred: boolean }) {
  return (
    <div role="status" style={{ padding: 16, font: type.label, letterSpacing: ".04em", lineHeight: 1.5, color: color.amber }}>
      {inferred ? UNREACHABLE_MESSAGE : LOCKED_MESSAGE}
    </div>
  );
}
