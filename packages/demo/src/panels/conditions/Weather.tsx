import type { PanelProps } from "../../app/types";
import { Label } from "../../ui/primitives";

/** Header-strip panel: no frame, sits at the right of the header bar. */
export default function Weather({ lap }: PanelProps) {
  return <Label>08 Weather · lap {lap} · stub, lane E</Label>;
}
