import { useMemo } from "react";
import type { PanelProps } from "../../app/types";
import { combine, useAsync, useOpenF1 } from "../../data/useOpenF1";
import { indexLocations, LOCATION_LAG_MS, positionAt, useWindowedRows } from "../../data/windows";
import { AsyncView, PanelFrame, useLayoutMode } from "../../ui/primitives";
import { color, type } from "../../ui/tokens";
import { blockFilter, getCircuit } from "./data";
import { runningOrder } from "./order";
import { buildTrackGeometry, carPositions, pickReferenceLap, trackView, withRealPositions, yellowsDuring, type Point } from "./track";
import { TrackMapLegend, TrackMapView } from "./TrackMapView";

export default function TrackMap(props: PanelProps) {
  const { session, lap, playing, focus, drivers, lapWindow } = props;
  const big = useLayoutMode() === "wall";
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
  const now = props.at;
  const location = useWindowedRows("location", { from: now - LOCATION_LAG_MS - 1_000, to: now }, playing);
  const tracks = useMemo(() => (location.status === "ok" ? indexLocations(location.data) : null), [location]);
  const real = new Map<number, Point>();
  for (const [driver, track] of tracks ?? []) {
    const p = positionAt(track, now - LOCATION_LAG_MS, now);
    if (p) real.set(driver, p);
  }
  const info = circuit.status === "ok" ? circuit.data : null;
  const at = lapWindow ? new Date(props.at).toISOString() : null;
  const yellows =
    raceControl.status === "ok" && lapWindow && at ? yellowsDuring(raceControl.data, lapWindow.start, at) : new Map<number, never>();

  return (
    <PanelFrame
      num="02"
      title="Track"
      right={
        <>
          <TrackMapLegend big={big} />
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
                  positions: at ? withRealPositions(carPositions(allLaps, at, geometry), real, geometry.points) : [],
                  focus,
                  order: runningOrder(allLaps, lap),
                })}
                drivers={drivers}
                big={big}
              />
            )
          }
        </AsyncView>
      )}
      <div style={{ padding: "0 12px 10px", font: type.label, color: color.dim }}>
        {real.size ? "CAR POSITIONS · LOCATION DATA" : "CAR POSITIONS ≈ FROM SECTOR TIMES · ±70 M VS LOCATION DATA"}
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
