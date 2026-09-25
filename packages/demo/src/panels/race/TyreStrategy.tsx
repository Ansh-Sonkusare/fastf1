import type { PanelProps } from "../../app/types";
import { PanelFrame } from "../../ui/primitives";

export default function TyreStrategy({ lap }: PanelProps) {
  return (
    <PanelFrame num="06" title="Tyre strategy">
      <div style={{ padding: 16, opacity: 0.5 }}>Lap {lap}. Stub, owned by lane D.</div>
    </PanelFrame>
  );
}
