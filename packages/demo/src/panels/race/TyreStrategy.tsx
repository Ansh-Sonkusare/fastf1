import type { PanelProps } from "../../app/types";
import { useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, Label, PanelFrame, Swatch } from "../../ui/primitives";
import { color, tyreOf } from "../../ui/tokens";
import { getUniqueCompounds, shapeTyreStints, type TyreStintViewModel } from "./tyreStrategy";

export default function TyreStrategy({ session, lap, totalLaps, drivers }: PanelProps) {
  const stints = useOpenF1("stints", session.sessionKey);

  return (
    <PanelFrame
      num="06"
      title="Tyre strategy"
      right={
        <>
          <Swatch tone={tyreOf("SOFT").color}>SOFT</Swatch>
          <Swatch tone={tyreOf("MEDIUM").color}>MEDIUM</Swatch>
          <Swatch tone={tyreOf("HARD").color}>HARD</Swatch>
        </>
      }
    >
      <AsyncView state={stints} isEmpty={(rows) => rows.length === 0}>
        {(rows) => {
          const viewModels = shapeTyreStints(rows, session.sessionKey);
          const compounds = getUniqueCompounds(viewModels);
          return (
            <Gantt
              viewModels={viewModels}
              lap={lap}
              totalLaps={totalLaps}
              drivers={drivers}
              extraCompounds={compounds}
            />
          );
        }}
      </AsyncView>
    </PanelFrame>
  );
}

function Gantt({
  viewModels,
  lap,
  totalLaps,
  drivers,
  extraCompounds,
}: {
  viewModels: TyreStintViewModel[];
  lap: number;
  totalLaps: number;
  drivers: PanelProps["drivers"];
  extraCompounds: string[];
}) {
  const byDriver = new Map<number, TyreStintViewModel[]>();
  for (const s of viewModels) {
    if (!byDriver.has(s.driverNumber)) byDriver.set(s.driverNumber, []);
    byDriver.get(s.driverNumber)!.push(s);
  }
  // Includes any compound this race used that isn't SOFT/MEDIUM/HARD (e.g. rain).
  const rest = extraCompounds.filter((c) => !["SOFT", "MEDIUM", "HARD"].includes(c));

  return (
    <div style={{ padding: "8px 12px", overflowY: "auto", flex: 1 }}>
      {rest.length > 0 && (
        <div style={{ display: "flex", gap: 10, paddingBottom: 6 }}>
          {rest.map((c) => (
            <Swatch key={c} tone={tyreOf(c).color}>
              {c}
            </Swatch>
          ))}
        </div>
      )}
      {[...drivers.values()].map((driver) => {
        const stints = byDriver.get(driver.number) ?? [];
        return (
          <div key={driver.number} style={{ display: "flex", alignItems: "center", gap: 8, height: 21 }}>
            <Label>{driver.code}</Label>
            <div style={{ position: "relative", flex: 1, height: 12, background: color.rowDivider, borderRadius: 2 }}>
              {stints
                .filter((s) => s.lapStart <= lap)
                .map((s) => {
                  const end = Math.min(s.lapEnd, lap);
                  const leftPct = (s.lapStart / totalLaps) * 100;
                  const widthPct = ((end - s.lapStart + 1) / totalLaps) * 100;
                  return (
                    <div
                      key={s.stintNumber}
                      title={`${s.compound} · L${s.lapStart}-${end}`}
                      style={{
                        position: "absolute",
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: 0,
                        bottom: 0,
                        background: tyreOf(s.compound).color,
                        borderRadius: 2,
                      }}
                    />
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
