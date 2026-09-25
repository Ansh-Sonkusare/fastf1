/** Design tokens lifted from docs/design/pitwall-console.dc.html. */
export const color = {
  bg: "#0b0d10",
  panel: "#12151a",
  panelRaised: "#1a1f25",
  border: "#1f242b",
  borderPredicted: "#2a3a40",
  rowDivider: "#181c21",
  text: "#e4e7eb",
  textSoft: "#c3c9d1",
  textMuted: "#aeb5bf",
  label: "#8b939e",
  dim: "#5b636e",
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
  sans: "'IBM Plex Sans Condensed', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

/** `font` shorthands used across the reference. */
export const type = {
  label: `500 10px/1 ${font.mono}`,
  panelTitle: `600 11px/1 ${font.mono}`,
  cell: `500 12.5px/1 ${font.mono}`,
  big: `600 20px/1 ${font.mono}`,
} as const;

/** Hatched fill that marks a predicted region. */
export const predictedHatch =
  "repeating-linear-gradient(135deg,rgba(111,211,232,.45) 0 2px,transparent 2px 5px)";
export const predictedHatchFaint =
  "repeating-linear-gradient(135deg,rgba(111,211,232,.035) 0 2px,transparent 2px 7px)";
