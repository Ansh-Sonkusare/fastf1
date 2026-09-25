import { Swatch } from "../../ui/primitives";
import { color, font } from "../../ui/tokens";
import type { MiniMark, SectorRow } from "./sectors";

const MARK: Record<MiniMark, string> = {
  overall: color.overall,
  personal: color.personal,
  slower: "#e6c229",
  pit: "#3a414a",
  none: "#3a414a",
};
const COLUMNS = "40px 54px 54px 54px minmax(0,1fr) 38px 38px 38px";

interface SectorGridViewProps {
  readonly rows: readonly SectorRow[];
  readonly drivers: ReadonlyMap<number, { readonly code: string; readonly color: string }>;
  readonly focus: { readonly a: number | null; readonly b: number | null };
  readonly showMinis: boolean;
}

export function SectorGridView({ rows, drivers, focus, showMinis }: SectorGridViewProps) {
  const miniCount = Math.max(0, ...rows.map((r) => r.minis.reduce((n, m) => n + m.length, 0)));
  return (
    <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLUMNS,
          gap: 6,
          font: `500 10px/1 ${font.mono}`,
          color: color.dim,
          paddingBottom: 6,
        }}
      >
        <span>DRV</span>
        <span style={{ textAlign: "right" }}>S1</span>
        <span style={{ textAlign: "right" }}>S2</span>
        <span style={{ textAlign: "right" }}>S3</span>
        <span style={{ textAlign: "center" }}>{showMinis && miniCount > 0 ? `MINI-SECTORS 1–${miniCount}` : ""}</span>
        <span style={{ textAlign: "right" }}>I1</span>
        <span style={{ textAlign: "right" }}>I2</span>
        <span style={{ textAlign: "right" }}>ST</span>
      </div>
      {rows.map((row) => {
        const driver = drivers.get(row.driver);
        const focused = row.driver === focus.a || row.driver === focus.b;
        return (
          <div
            key={row.driver}
            style={{
              display: "grid",
              gridTemplateColumns: COLUMNS,
              gap: 6,
              alignItems: "center",
              height: 21,
              font: `500 11.5px/1 ${font.mono}`,
              background: focused ? "rgba(255,255,255,.05)" : "transparent",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: font.sans,
                fontWeight: 700,
                fontSize: 12.5,
              }}
            >
              <span style={{ width: 3, height: 12, background: driver?.color ?? "#3a414a" }} />
              {driver?.code ?? row.driver}
            </span>
            {row.sectors.map((s, i) => (
              <span key={i} style={{ textAlign: "right", color: MARK[s.mark] }}>
                {s.seconds == null ? "—" : s.seconds.toFixed(3)}
              </span>
            ))}
            <div style={{ display: "flex", gap: 4, height: 12, minWidth: 0 }}>
              {showMinis &&
                row.minis.map((group, g) => (
                  <div key={g} style={{ display: "flex", gap: 1, flex: group.length, minWidth: 0 }}>
                    {group.map((m, k) => (
                      <span key={k} style={{ flex: 1, background: MARK[m], opacity: m === "slower" ? 0.55 : 1 }} />
                    ))}
                  </div>
                ))}
            </div>
            {[row.traps.i1, row.traps.i2, row.traps.st].map((t, i) => (
              <span key={i} style={{ textAlign: "right", color: t.fastest ? MARK.overall : color.textMuted }}>
                {t.kmh ?? "—"}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function SectorLegend() {
  return (
    <>
      {(["overall", "personal", "slower"] as const).map((m) => (
        <Swatch key={m} tone={MARK[m]} shape="square">
          {m.toUpperCase()}
        </Swatch>
      ))}
    </>
  );
}
