import { useState } from "react";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, PanelFrame } from "../../ui/primitives";
import { color, type } from "../../ui/tokens";
import { blockFilter } from "./data";
import { buildTrace, readout, telemetryView } from "./telemetry";
import { TelemetryHeader, TelemetryView } from "./TelemetryView";

const note = (text: string) => <div style={{ padding: 16, font: type.label, color: color.dim }}>{text}</div>;

export default function Telemetry(props: PanelProps) {
  const { session, lap, focus, drivers } = props;
  const sk = session.sessionKey;
  const [hover, setHover] = useState<number | null>(null);
  const laps = useOpenF1("laps", sk);
  const carA = useOpenF1("car_data", sk, blockFilter(props, focus.a, lap));
  const carB = useOpenF1("car_data", sk, blockFilter(props, focus.b, lap));

  const a = focus.a == null ? undefined : drivers.get(focus.a);
  const b = focus.b == null ? undefined : drivers.get(focus.b);
  const colorA = a?.color ?? color.text;
  const colorB = !b || b.color === colorA ? color.text : b.color;
  const lapOf = (rows: typeof laps, n: number | null) =>
    rows.status === "ok" ? rows.data.find((l) => l.lap_number === lap && l.driver_number === n) : undefined;
  const lapA = lapOf(laps, focus.a);
  const lapB = lapOf(laps, focus.b);
  const all = combine(carA, carB);
  const ta = all.status === "ok" && lapA ? buildTrace(lapA, all.data[0]) : null;
  const tb = all.status === "ok" && lapB ? buildTrace(lapB, all.data[1]) : null;

  return (
    <PanelFrame
      num="03"
      title={`Telemetry compare · lap ${lap}`}
      right={
        a &&
        b && <TelemetryHeader codeA={a.code} codeB={b.code} colorA={colorA} colorB={colorB} text={ta && tb ? readout(ta, tb, hover) : ""} />
      }
    >
      {!a || !b ? (
        note("CLICK A DRIVER FOR A · SHIFT-CLICK FOR B")
      ) : (
        <AsyncView state={combine(laps, all)}>
          {() =>
            ta && tb && lapA ? (
              <div style={{ padding: "8px 10px 10px" }}>
                <TelemetryView view={telemetryView(ta, tb, lapA)} colorA={colorA} colorB={colorB} hover={hover} onHover={setHover} />
              </div>
            ) : (
              note(`NO TIMED LAP ${lap} FOR ${!ta ? a.code : b.code}`)
            )
          }
        </AsyncView>
      )}
    </PanelFrame>
  );
}
