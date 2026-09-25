import type { ComponentType } from "react";
import type { PanelProps } from "../app/types";

/** The Undercut Terminal areas. Wall mode renders only header/timing/strategy/track/race-control. */
export type PanelSlot = "header" | "timing" | "strategy" | "track" | "race-control" | "analysis";

/** Which Analysis tab shows a panel. Only set when `slot` is "analysis". */
export type AnalysisTab = "compare" | "tyres" | "sectors" | "stops";

export interface PanelDef {
  readonly num: string;
  readonly title: string;
  readonly slot: PanelSlot;
  readonly tab?: AnalysisTab;
  /** Chunk loader. The shell wraps it in React.lazy and re-creates it on retry. */
  readonly load: () => Promise<{ default: ComponentType<PanelProps> }>;
}

export const PANELS: readonly PanelDef[] = [
  { num: "01", title: "Timing tower", slot: "timing", load: () => import("./tower/TimingTower") },
  { num: "10", title: "Strategy predictor", slot: "strategy", load: () => import("./strategy/StrategyPredictor") },
  { num: "02", title: "Track map", slot: "track", load: () => import("./car/TrackMap") },
  { num: "09", title: "Race control & radio", slot: "race-control", load: () => import("./conditions/RaceControl") },
  { num: "03", title: "Telemetry compare", slot: "analysis", tab: "compare", load: () => import("./car/Telemetry") },
  { num: "04", title: "Lap times", slot: "analysis", tab: "compare", load: () => import("./race/LapTimes") },
  { num: "05", title: "Sectors", slot: "analysis", tab: "sectors", load: () => import("./car/Sectors") },
  { num: "06", title: "Tyre strategy", slot: "analysis", tab: "tyres", load: () => import("./race/TyreStrategy") },
  { num: "07", title: "Pit stops", slot: "analysis", tab: "stops", load: () => import("./race/PitStops") },
  { num: "08", title: "Weather", slot: "header", load: () => import("./conditions/Weather") },
];

/** The Analysis area's tab strip, in the reference's order and hotkeys. */
export const ANALYSIS_TABS: readonly { readonly id: AnalysisTab; readonly key: string; readonly label: string }[] = [
  { id: "compare", key: "6", label: "Compare A/B" },
  { id: "tyres", key: "7", label: "Tyre strategy" },
  { id: "sectors", key: "8", label: "Sectors" },
  { id: "stops", key: "9", label: "Pit stops" },
];
