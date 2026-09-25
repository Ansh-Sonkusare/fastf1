import type { ReactNode } from "react";
import { ANALYSIS_TABS, PANELS, type AnalysisTab } from "../panels/registry";
import { TabStrip } from "../ui/primitives";
import { color, font } from "../ui/tokens";
import { PanelSlot } from "./PanelSlot";
import type { PanelProps } from "./types";

/**
 * The Analysis area: one tab strip (hotkeys 6-9) swapping in the panels registered for that tab.
 * "Compare" holds two panels (telemetry + lap times) side by side; the rest hold one.
 */
export function Analysis({ props, atab, onTab }: { props: PanelProps; atab: AnalysisTab; onTab: (t: AnalysisTab) => void }) {
  const defs = PANELS.filter((p) => p.slot === "analysis" && p.tab === atab);
  const a = props.focus.a != null ? props.drivers.get(props.focus.a) : undefined;
  const b = props.focus.b != null ? props.drivers.get(props.focus.b) : undefined;
  return (
    <div style={{ background: color.panel, border: `1px solid ${color.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TabStrip
        tabs={ANALYSIS_TABS.map((t) => ({ key: t.key, label: t.label, active: t.id === atab, onClick: () => onTab(t.id) }))}
        right={
          atab === "compare" ? (
            <span style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 12px", font: `500 11px/1 ${font.mono}`, color: color.label }}>
              <LineSwatch tone={a?.color ?? color.dim}>A {a?.code ?? "—"}</LineSwatch>
              <LineSwatch tone={b?.color ?? color.dim} dashed>
                B {b?.code ?? "—"}
              </LineSwatch>
            </span>
          ) : undefined
        }
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: defs.length > 1 ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)",
          gap: 1,
          background: color.border,
        }}
      >
        {defs.map((def) => (
          <PanelSlot key={def.num} def={def} props={props} />
        ))}
      </div>
    </div>
  );
}

function LineSwatch({ tone, dashed, children }: { tone: string; dashed?: boolean; children: ReactNode }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 16, height: 0, borderTop: `2px ${dashed ? "dashed" : "solid"} ${tone}` }} />
      {children}
    </span>
  );
}
