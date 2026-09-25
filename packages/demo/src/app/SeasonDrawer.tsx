import type { RaceResult, RaceTable } from "@f1/core";
import { useF1Results } from "@f1/react";
import type { ReactNode } from "react";
import type { DemoInitialData, ResultsRace } from "../data/initial";
import { Label } from "../ui/primitives";
import { color, font, type } from "../ui/tokens";

/** Jolpica reports lapped cars with a status like "Lapped", not a lap count behind. */
export function timeOrStatus(result: RaceResult, leaderLaps: number): string {
  if (result.status === "Finished") return result.Time?.time ?? "—";
  const laps = Number(result.laps);
  if (Number.isFinite(laps) && leaderLaps > laps) {
    const down = leaderLaps - laps;
    return down === 1 ? "+1 Lap" : `+${down} Laps`;
  }
  return result.status ?? "—";
}

const cell = { padding: "6px 8px", borderBottom: `1px solid ${color.rowDivider}` } as const;

function Table({ head, rows }: { head: readonly string[]; rows: readonly (readonly ReactNode[])[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", font: `500 12px/1.3 ${font.mono}` }}>
      <thead>
        <tr style={{ font: type.label, color: color.dim, textAlign: "left" }}>
          {head.map((h) => (
            <th key={h} style={{ ...cell, borderBottomColor: color.border }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ color: color.textSoft }}>
            {r.map((c, j) => (
              <td key={j} style={cell}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SeasonDrawer({
  year,
  schedule,
  round,
  initialData,
  onPickRound,
  onClose,
}: {
  year: number;
  schedule: RaceTable | null;
  round: number;
  initialData?: DemoInitialData;
  onPickRound: (round: number) => void;
  onClose: () => void;
}) {
  const hydrated = initialData?.latestRound === round ? initialData.latestResults : undefined;
  const { data, isLoading, error } = useF1Results(year, round, { initialData: hydrated });
  const results = (data?.[0] as ResultsRace | undefined)?.Results ?? [];
  const leaderLaps = Math.max(0, ...results.map((r) => Number(r.laps) || 0));

  return (
    <aside
      aria-label="Season"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 560,
        overflowY: "auto",
        background: color.panel,
        borderLeft: `1px solid ${color.border}`,
        boxShadow: "-12px 0 32px rgba(0,0,0,.5)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <Label tone={color.text}>{year} Season</Label>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onClose} style={buttonStyle}>
          CLOSE
        </button>
      </div>
      <section>
        <Label>Race results · round {round}</Label>
        {error && <p style={{ color: color.red }}>Failed to load race results: {error.message}</p>}
        {isLoading && !data && <p style={{ color: color.dim }}>Loading race results…</p>}
        {data && (
          <Table
            head={["POS", "DRIVER", "CONSTRUCTOR", "TIME/STATUS", "PTS"]}
            rows={results.map((r) => [
              r.position || "—",
              r.Driver ? `${r.Driver.givenName ?? ""} ${r.Driver.familyName ?? ""}`.trim() : "—",
              r.Constructor?.name ?? "—",
              timeOrStatus(r, leaderLaps),
              r.points || "0",
            ])}
          />
        )}
      </section>
      <section>
        <Label>Schedule</Label>
        {!schedule && <p style={{ color: color.dim }}>Loading season schedule…</p>}
        {schedule && (
          <Table
            head={["RND", "DATE", "GRAND PRIX", "CIRCUIT"]}
            rows={schedule.Races.map((r) => [
              <button key="r" type="button" onClick={() => onPickRound(Number(r.round))} style={{ ...buttonStyle, padding: "2px 6px" }}>
                {r.round}
              </button>,
              r.date,
              r.raceName,
              r.Circuit.circuitName,
            ])}
          />
        )}
      </section>
    </aside>
  );
}

export const buttonStyle = {
  padding: "6px 10px",
  borderRadius: 3,
  border: `1px solid ${color.border}`,
  background: color.panelRaised,
  color: color.text,
  font: `600 11px/1 ${font.mono}`,
  letterSpacing: ".06em",
  cursor: "pointer",
} as const;
