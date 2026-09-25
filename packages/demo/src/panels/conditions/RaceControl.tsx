import type { PanelProps } from "../../app/types";
import { PanelFrame } from "../../ui/primitives";

export default function RaceControl({ lap }: PanelProps) {
  return (
    <PanelFrame num="09" title="Race control & radio">
      <div style={{ padding: 16, opacity: 0.5 }}>Lap {lap}. Stub, owned by lane E.</div>
    </PanelFrame>
  );
}
