import { useState } from "react";
import type { PanelProps } from "../../app/types";
import { combine, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView } from "../../ui/primitives";
import { color, font, type } from "../../ui/tokens";
import { blockFilter } from "./data";
import { buildTrace, readout, telemetryView } from "./telemetry";
import { TelemetryView } from "./TelemetryView";

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
    <section data-panel="03" style={{ background: color.panel, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "10px 16px 0",
          font: `500 11px/1 ${font.sans}`,
          letterSpacing: ".07em",
          textTransform: "uppercase",
          color: color.label,
        }}
      >
        <span>Telemetry · lap {lap}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: color.textSoft, textTransform: "none", letterSpacing: 0 }}>
          {ta && tb ? readout(ta, tb, hover) : ""}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>
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
      </div>
    </section>
  );
}
