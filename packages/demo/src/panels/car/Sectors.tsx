import type { PanelProps } from "../../app/types";
import { useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, PanelFrame } from "../../ui/primitives";
import { runningOrder } from "./order";
import { sectorGrid } from "./sectors";
import { SectorGridView, SectorLegend } from "./SectorGridView";

export default function Sectors({ session, lap, focus, drivers }: PanelProps) {
  const laps = useOpenF1("laps", session.sessionKey);
  return (
    <PanelFrame num="05" title={`Sectors · lap ${lap}`} right={<SectorLegend />}>
      <AsyncView state={laps} isEmpty={(rows) => rows.length === 0}>
        {(rows) => <SectorGridView rows={sectorGrid(rows, lap, runningOrder(rows, lap))} drivers={drivers} focus={focus} showMinis />}
      </AsyncView>
    </PanelFrame>
  );
}
