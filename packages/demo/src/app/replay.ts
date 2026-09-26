import type { DriverNumber, Focus } from "./types";

export const SPEEDS = [1, 2, 4, 8, 16] as const;
export type Speed = (typeof SPEEDS)[number];

/** The replay cursor. `at` is epoch ms inside [start, end]: lights out to the flag. */
export interface ReplayState {
  readonly at: number;
  readonly start: number;
  readonly end: number;
  readonly speed: Speed;
  readonly playing: boolean;
  readonly focus: Focus;
}

export type ReplayAction =
  | { readonly type: "load"; readonly start: number; readonly end: number; readonly at: number }
  | { readonly type: "seek"; readonly at: number }
  | { readonly type: "tick"; readonly elapsedMs: number }
  | { readonly type: "toggle" }
  | { readonly type: "speed"; readonly speed: Speed }
  | { readonly type: "focus"; readonly focus: Focus };

const clamp = (at: number, s: ReplayState) => Math.min(Math.max(s.start, at), s.end);

export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case "load": {
      const loaded = { ...state, start: action.start, end: action.end };
      return { ...loaded, at: clamp(action.at, loaded) };
    }
    case "seek":
      return { ...state, at: clamp(action.at, state) };
    case "tick": {
      if (!state.playing) return state;
      const at = clamp(state.at + action.elapsedMs * state.speed, state);
      return { ...state, at, playing: at < state.end };
    }
    case "toggle":
      return {
        ...state,
        playing: !state.playing,
        at: !state.playing && state.at >= state.end ? state.start : state.at,
      };
    case "speed":
      return { ...state, speed: action.speed };
    case "focus":
      return { ...state, focus: action.focus };
  }
}

/** Click sets A (B swaps to the old A if it collided). Shift-click sets B unless it's A. */
export function pick(focus: Focus, driver: DriverNumber, compare: boolean): Focus {
  if (compare) return driver === focus.a ? focus : { a: focus.a, b: driver };
  return { a: driver, b: focus.b === driver ? focus.a : focus.b };
}

/**
 * Focus from a deep link, validated against the session: unknown drivers are dropped, B never equals A,
 * and missing slots default to the first drivers in `order` (the classification).
 */
export function resolveFocus(
  link: { readonly a: DriverNumber | null; readonly b: DriverNumber | null },
  known: ReadonlySet<DriverNumber>,
  order: readonly DriverNumber[],
): Focus {
  const a = link.a !== null && known.has(link.a) ? link.a : (order[0] ?? null);
  const b =
    link.b !== null && known.has(link.b) && link.b !== a ? link.b : (order.find((d) => d !== a) ?? null);
  return { a, b };
}
