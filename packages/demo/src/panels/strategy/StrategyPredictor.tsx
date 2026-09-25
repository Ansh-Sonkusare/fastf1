import type { PanelProps } from "../../app/types";
import { PanelFrame } from "../../ui/primitives";

export default function StrategyPredictor({ lap }: PanelProps) {
  return (
    <PanelFrame num="10" title="Strategy predictor">
      <div style={{ padding: 16, opacity: 0.5 }}>Lap {lap}. Stub, owned by lane F.</div>
    </PanelFrame>
  );
}
