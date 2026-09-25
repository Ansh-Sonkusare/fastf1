import type { PanelProps } from "../../app/types";
import { PanelFrame } from "../../ui/primitives";

export default function PitStops({ lap }: PanelProps) {
  return (
    <PanelFrame num="07" title="Pit stops">
      <div style={{ padding: 16, opacity: 0.5 }}>Lap {lap}. Stub, owned by lane D.</div>
    </PanelFrame>
  );
}
