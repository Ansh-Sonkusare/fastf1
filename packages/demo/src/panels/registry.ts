import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { PanelProps } from "../app/types";

/** Where the shell mounts a panel. Mirrors the reference grid. */
export type PanelSlot =
  | "header"
  | "top-left"
  | "top-center"
  | "top-right"
  | "mid-left"
  | "mid-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface PanelDef {
  readonly num: string;
  readonly title: string;
  readonly slot: PanelSlot;
  readonly component: LazyExoticComponent<ComponentType<PanelProps>>;
}

export const PANELS: readonly PanelDef[] = [
  { num: "01", title: "Timing tower", slot: "top-left", component: lazy(() => import("./tower/TimingTower")) },
  { num: "10", title: "Strategy predictor", slot: "top-center", component: lazy(() => import("./strategy/StrategyPredictor")) },
  { num: "02", title: "Track map", slot: "top-right", component: lazy(() => import("./car/TrackMap")) },
  { num: "09", title: "Race control & radio", slot: "top-right", component: lazy(() => import("./conditions/RaceControl")) },
  { num: "03", title: "Telemetry compare", slot: "mid-left", component: lazy(() => import("./car/Telemetry")) },
  { num: "04", title: "Lap times", slot: "mid-right", component: lazy(() => import("./race/LapTimes")) },
  { num: "05", title: "Sectors", slot: "bottom-left", component: lazy(() => import("./car/Sectors")) },
  { num: "06", title: "Tyre strategy", slot: "bottom-center", component: lazy(() => import("./race/TyreStrategy")) },
  { num: "07", title: "Pit stops", slot: "bottom-right", component: lazy(() => import("./race/PitStops")) },
  { num: "08", title: "Weather", slot: "header", component: lazy(() => import("./conditions/Weather")) },
];
