import type { ComponentType } from "react";
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
  /** Chunk loader. The shell wraps it in React.lazy and re-creates it on retry. */
  readonly load: () => Promise<{ default: ComponentType<PanelProps> }>;
}

export const PANELS: readonly PanelDef[] = [
  { num: "01", title: "Timing tower", slot: "top-left", load: () => import("./tower/TimingTower") },
  { num: "10", title: "Strategy predictor", slot: "top-center", load: () => import("./strategy/StrategyPredictor") },
  { num: "02", title: "Track map", slot: "top-right", load: () => import("./car/TrackMap") },
  { num: "09", title: "Race control & radio", slot: "top-right", load: () => import("./conditions/RaceControl") },
  { num: "03", title: "Telemetry compare", slot: "mid-left", load: () => import("./car/Telemetry") },
  { num: "04", title: "Lap times", slot: "mid-right", load: () => import("./race/LapTimes") },
  { num: "05", title: "Sectors", slot: "bottom-left", load: () => import("./car/Sectors") },
  { num: "06", title: "Tyre strategy", slot: "bottom-center", load: () => import("./race/TyreStrategy") },
  { num: "07", title: "Pit stops", slot: "bottom-right", load: () => import("./race/PitStops") },
  { num: "08", title: "Weather", slot: "header", load: () => import("./conditions/Weather") },
];
