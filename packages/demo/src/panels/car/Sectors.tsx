import type { PanelProps } from "../../app/types";
import { PanelFrame } from "../../ui/primitives";

export default function Sectors({ lap }: PanelProps) {
  return (
    <PanelFrame num="05" title="Sectors">
      <div style={{ padding: 16, opacity: 0.5 }}>Lap {lap}. Stub, owned by lane C.</div>
    </PanelFrame>
  );
}
