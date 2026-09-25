import type { PanelProps } from "../../app/types";
import { useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, Label, Measured, PanelFrame } from "../../ui/primitives";
import { color } from "../../ui/tokens";
import { getMaxPitDuration, shapePitStops, type PitStopViewModel } from "./pitStops";

export default function PitStops({ session, lap, drivers }: PanelProps) {
  const pits = useOpenF1("pit", session.sessionKey);

  return (
    <PanelFrame num="07" title="Pit stops">
      <AsyncView state={pits} isEmpty={(rows) => rows.length === 0}>
        {(rows) => {
          const viewModels = shapePitStops(rows, session.sessionKey).filter((s) => s.lapNumber <= lap);
          return <PitStopsList viewModels={viewModels} drivers={drivers} />;
        }}
      </AsyncView>
    </PanelFrame>
  );
}

function PitStopsList({
  viewModels,
  drivers,
}: {
  viewModels: PitStopViewModel[];
  drivers: PanelProps["drivers"];
}) {
  if (viewModels.length === 0) {
    return <div style={{ padding: 16, opacity: 0.5, color: color.dim }}>No stops completed yet.</div>;
  }
  const max = getMaxPitDuration(viewModels);
  const fastest = viewModels[0]?.stationaryDuration;

  return (
    <div style={{ padding: "8px 12px", overflowY: "auto", flex: 1 }}>
      {viewModels.map((s) => {
        const driver = drivers.get(s.driverNumber);
        const isFastest = s.stationaryDuration === fastest;
        const tone = isFastest ? color.overall : color.text;
        return (
          <div key={`${s.driverNumber}-${s.lapNumber}`} style={{ display: "flex", alignItems: "center", gap: 8, height: 30 }}>
            <Label>{s.rank}</Label>
            <span style={{ width: 3, height: 14, background: driver?.color ?? color.dim, display: "inline-block" }} />
            <Label tone={color.text}>{driver?.code ?? s.driverNumber}</Label>
            <div style={{ flex: 1, height: 8, background: color.rowDivider, borderRadius: 2 }}>
              <div
                style={{
                  width: `${(s.stationaryDuration / max) * 100}%`,
                  height: "100%",
                  background: tone,
                  borderRadius: 2,
                }}
              />
            </div>
            <Label>L{s.lapNumber}</Label>
            <Measured tone={tone}>{s.stationaryDuration.toFixed(2)}</Measured>
            <Label>{s.laneDuration?.toFixed(1) ?? "—"}</Label>
          </div>
        );
      })}
    </div>
  );
}
