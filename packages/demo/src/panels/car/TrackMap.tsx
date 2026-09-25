import { useMemo } from "react";
import type { PanelProps } from "../../app/types";
import { combine, useAsync, useOpenF1 } from "../../data/useOpenF1";
import { AsyncView, PanelFrame } from "../../ui/primitives";
import { color, type } from "../../ui/tokens";
import { blockFilter, getCircuit } from "./data";
import { runningOrder } from "./order";
import { buildTrackGeometry, carPositions, pickReferenceLap, trackView, yellowsDuring } from "./track";
import { TrackMapLegend, TrackMapView } from "./TrackMapView";

export default function TrackMap(props: PanelProps) {
  const { session, lap, playing, focus, drivers, lapWindow } = props;
  const sk = session.sessionKey;
  const laps = useOpenF1("laps", sk);
  const raceControl = useOpenF1("race_control", sk);
  const circuit = useAsync(`circuit:${sk}`, (signal) => getCircuit(session, signal));

  const ref = useMemo(() => (laps.status === "ok" ? pickReferenceLap(laps.data) : null), [laps]);
  const refFilter = blockFilter(props, ref?.driver_number, ref?.lap_number);
  const refLocation = useOpenF1("location", sk, refFilter);
  const refCar = useOpenF1("car_data", sk, refFilter);

  const geometry = useMemo(
    () => (ref && refLocation.status === "ok" && refCar.status === "ok" ? buildTrackGeometry(ref, refLocation.data, refCar.data) : null),
    [ref, refLocation, refCar],
  );
  const info = circuit.status === "ok" ? circuit.data : null;
  const at = lapWindow ? (lapWindow.end ?? lapWindow.start) : null;
  const yellows =
    raceControl.status === "ok" && lapWindow && at ? yellowsDuring(raceControl.data, lapWindow.start, at) : new Map<number, never>();

  return (
    <PanelFrame
      num="02"
      title="Track"
      right={
        <>
          <TrackMapLegend />
          <span style={{ font: type.label, color: color.dim }}>{playing ? "● REPLAY" : "PAUSED"}</span>
        </>
      }
    >
      {laps.status === "ok" && !ref ? (
        <div style={{ padding: 16, font: type.label, color: color.dim }}>NO COMPLETE RACING LAP TO TRACE</div>
      ) : (
        <AsyncView state={combine(laps, refLocation, refCar)}>
          {([allLaps]) =>
            geometry && (
              <TrackMapView
                view={trackView({
                  geometry,
                  rotationDeg: info?.rotation ?? 0,
                  marshalSectors: info?.marshalSectors ?? [],
                  yellows,
                  positions: at ? carPositions(allLaps, at, geometry) : [],
                  focus,
                  order: runningOrder(allLaps, lap),
                })}
                drivers={drivers}
              />
            )
          }
        </AsyncView>
      )}
      <div style={{ padding: "0 12px 10px", font: type.label, color: color.dim }}>
        CAR POSITIONS ≈ FROM SECTOR TIMES · ±70 M VS LOCATION DATA
      </div>
      {circuit.status === "ok" && !info && (
        <div
          style={{
            padding: "0 12px 10px",
            font: type.label,
            color: yellows.size ? color.yellow : color.dim,
          }}
        >
          MARSHAL SECTOR POSITIONS UNAVAILABLE
          {yellows.size ? ` · YELLOW IN MS ${[...yellows.keys()].join(", ")}` : ""}
        </div>
      )}
    </PanelFrame>
  );
}
