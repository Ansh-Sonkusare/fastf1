import type { PanelProps } from "../../app/types";
import { PanelFrame } from "../../ui/primitives";

export default function TimingTower({ lap }: PanelProps) {
  return (
    <PanelFrame num="01" title="Timing tower">
      <div style={{ padding: 16, opacity: 0.5 }}>Lap {lap}. Stub, owned by lane B.</div>
    </PanelFrame>
  );
}
