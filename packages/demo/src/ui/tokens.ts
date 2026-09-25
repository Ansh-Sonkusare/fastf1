/** Design tokens lifted from docs/design/undercut-terminal.dc.html. */
export const color = {
  bg: "#070b14",
  panel: "#0b1220",
  panelRaised: "#101a2c",
  panelHeader: "#101a2c",
  border: "#1b2740",
  /** Buttons and toggles that sit inside a panel (not the grid divider). */
  borderMuted: "#26334f",
  borderPredicted: "#26445a",
  rowDivider: "#142036",
  text: "#e8edf6",
  textSoft: "#c9d2e1",
  textMuted: "#aab5c7",
  label: "#8a97ad",
  dim: "#56637b",
  /** Brand mark and active-state fill. */
  accent: "#c6ff3d",
  /** Predicted / ≈ values, and links. */
  predicted: "#6fd3e8",
  predictedBorder: "#3d6d78",
  overall: "#b06cff",
  personal: "#3ecf6e",
  drs: "#3ecf6e",
  /** Flag pill / SC. */
  yellow: "#f5d020",
  /** Slower-than-personal sector. */
  slower: "#e6c229",
  amber: "#ffb547",
  red: "#ff5a4f",
} as const;

export const tyre: Readonly<Record<string, { code: string; color: string }>> = {
  SOFT: { code: "S", color: "#ee4a3f" },
  MEDIUM: { code: "M", color: "#f2c230" },
  HARD: { code: "H", color: "#e8e8e3" },
  INTERMEDIATE: { code: "I", color: "#3fb56a" },
  WET: { code: "W", color: "#4a9eff" },
};
export const tyreOf = (compound: string | null | undefined) =>
  tyre[(compound ?? "").toUpperCase()] ?? { code: "?", color: color.label };

export const font = {
  sans: "'Barlow Semi Condensed', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

/** `font` shorthands used across the reference. */
export const type = {
  label: `500 10px/1 ${font.mono}`,
  panelTitle: `600 12px/1 ${font.sans}`,
  cell: `500 12.5px/1 ${font.mono}`,
  big: `600 20px/1 ${font.mono}`,
} as const;

/** Hatched fill that marks a predicted region. */
export const predictedHatch =
  "repeating-linear-gradient(135deg,rgba(111,211,232,.45) 0 2px,transparent 2px 5px)";
export const predictedHatchFaint =
  "repeating-linear-gradient(135deg,rgba(111,211,232,.035) 0 2px,transparent 2px 7px)";
/** Marks the replay's unplayed laps on the timeline scrubber. */
export const futureHatch =
  "repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 1px,transparent 1px 6px)";
