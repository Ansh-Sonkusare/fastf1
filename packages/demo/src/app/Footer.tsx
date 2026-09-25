import { TabStrip } from "../ui/primitives";
import { color, font } from "../ui/tokens";

/**
 * Desk mode's key-hint bar. D/H/L are placeholders for tower detail, race-control history and
 * "go live" — later PRs wire their state; only M (wall/desk) is functional here.
 */
export function Footer({ onWall }: { onWall: () => void }) {
  return (
    <TabStrip
      tabs={[
        { key: "D", label: "Tower detail", active: false },
        { key: "H", label: "Full history", active: false },
        { key: "L", label: "Go live", active: false },
        { key: "M", label: "Wall / desk", active: false, onClick: onWall },
      ]}
      right={
        <span style={{ display: "flex", alignItems: "center", gap: 18, padding: "0 14px", font: `500 11px/1 ${font.mono}`, letterSpacing: ".06em", color: color.dim }}>
          <span>1–5 EVIDENCE</span>
          <span>6–9 ANALYSIS</span>
          <span>SPACE PLAY/PAUSE</span>
          <span>←/→ PREV/NEXT LAP</span>
        </span>
      }
    />
  );
}
