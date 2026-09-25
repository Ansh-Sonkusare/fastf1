import type { DriverNumber, Focus } from "./types";

export interface ReplayState {
  readonly lap: number;
  readonly totalLaps: number;
  readonly playing: boolean;
  readonly focus: Focus;
}

export type ReplayAction =
  | { readonly type: "load"; readonly totalLaps: number }
  | { readonly type: "seek"; readonly lap: number }
  | { readonly type: "tick" }
  | { readonly type: "toggle" }
  | { readonly type: "pick"; readonly driver: DriverNumber; readonly compare: boolean }
  | { readonly type: "focus"; readonly focus: Focus };

const clampLap = (lap: number, total: number) => Math.min(Math.max(1, Math.round(lap)), Math.max(1, total));

export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case "load":
      return { ...state, totalLaps: action.totalLaps, lap: clampLap(state.lap, action.totalLaps) };
    case "seek":
      return { ...state, lap: clampLap(action.lap, state.totalLaps) };
    case "tick": {
      if (!state.playing) return state;
      const lap = clampLap(state.lap + 1, state.totalLaps);
      return { ...state, lap, playing: lap < state.totalLaps };
    }
    case "toggle":
      return {
        ...state,
        playing: !state.playing,
        lap: !state.playing && state.lap >= state.totalLaps ? 1 : state.lap,
      };
    case "pick":
      return { ...state, focus: pick(state.focus, action.driver, action.compare) };
    case "focus":
      return { ...state, focus: action.focus };
  }
}

/** Click sets A (B swaps to the old A if it collided). Shift-click sets B unless it's A. */
export function pick(focus: Focus, driver: DriverNumber, compare: boolean): Focus {
  if (compare) return driver === focus.a ? focus : { a: focus.a, b: driver };
  return { a: driver, b: focus.b === driver ? focus.a : focus.b };
}
