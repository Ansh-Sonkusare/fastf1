import { useState } from "react";
import type { DriverInfo, DriverNumber } from "../../../app/types";
import { color, font } from "../../../ui/tokens";
import type { RaceEvent } from "./shape";

export interface RaceControlProps {
  /** Race control + team radio, merged and time-ordered, cut off at the replay's current lap. */
  events: RaceEvent[];
  /** Highlights this driver's events (the tower's focus A). */
  focusDriverNumber?: number;
  /** Real driver codes and team colors, keyed by number — used for the radio sender bar. */
  drivers: ReadonlyMap<DriverNumber, DriverInfo>;
  /** Wall mode: latest two only, bigger rows, no history. */
  big?: boolean;
  /** Owned by the panel wrapper (the H hotkey lives there, next to the header's toggle button). */
  historyOpen?: boolean;
}

type FeedFilter = "ALL" | "RC" | "RADIO" | "OVT";
const FEED_FILTERS: readonly FeedFilter[] = ["ALL", "RC", "RADIO", "OVT"];

/** RC bucket is everything that isn't radio or an overtake — matches undercut-terminal.dc.html's grouping. */
function matchesFilter(event: RaceEvent, filter: FeedFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "RADIO") return event.type === "radio";
  if (filter === "OVT") return event.category === "CarEvent";
  return event.type !== "radio" && event.category !== "CarEvent";
}

/**
 * Race control & team radio feed. Desk shows the latest two events, plus an
 * optional full history (owner-controlled `historyOpen`) with ALL/RC/RADIO/OVT
 * filter tabs. Wall always shows just the latest two, bigger, no filters.
 *
 * Purely presentational: `panels/conditions/RaceControl.tsx` is the actual
 * registry stub (panel 09) — it fetches through B's gate, shapes the rows
 * via `./shape`, owns the H hotkey, and wraps this component in
 * `<PanelFrame num="09">`, which is why this component doesn't render its
 * own numbered title, only the feed body.
 */
export function RaceControl({ events, focusDriverNumber, drivers, big = false, historyOpen = false }: RaceControlProps) {
  const [filter, setFilter] = useState<FeedFilter>("ALL");
  const latest = [...events].slice(-2).reverse();
  const history = historyOpen ? [...events].filter((e) => matchesFilter(e, filter)).reverse() : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      {latest.length === 0 ? (
        <div style={{ padding: 12, font: `500 12px/1 ${font.mono}`, color: color.dim, textAlign: "center" }}>NO EVENTS YET</div>
      ) : (
        latest.map((event, i) => <EventRow key={`${event.date}-${i}`} event={event} drivers={drivers} focusDriverNumber={focusDriverNumber} big={big} />)
      )}
      {!big && historyOpen && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4, height: 28, padding: "0 12px", background: color.panelHeader, borderBottom: `1px solid ${color.border}` }}>
            <span style={{ font: `500 11px/1 ${font.sans}`, letterSpacing: ".07em", textTransform: "uppercase", color: color.dim, marginRight: 6 }}>
              History
            </span>
            {FEED_FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} style={filterTabStyle(filter === f)}>
                {f}
              </button>
            ))}
          </div>
          {history.map((event, i) => (
            <EventRow key={`${event.date}-h${i}`} event={event} drivers={drivers} focusDriverNumber={focusDriverNumber} compact />
          ))}
        </>
      )}
    </div>
  );
}

function filterTabStyle(active: boolean) {
  return {
    height: 20,
    padding: "0 8px",
    border: "none",
    background: active ? color.text : "transparent",
    color: active ? color.bg : color.label,
    font: `600 10px/1 ${font.mono}`,
    cursor: "pointer",
  } as const;
}

/** Badge kind, color and driver-bar color for one event. */
function eventStyle(event: RaceEvent, drivers: ReadonlyMap<DriverNumber, DriverInfo>) {
  const driver = event.driverNumber !== undefined ? drivers.get(event.driverNumber) : undefined;
  const who = driver?.code ?? (event.driverNumber !== undefined ? String(event.driverNumber) : undefined);
  const whoColor = driver?.color ?? color.dim;
  if (event.type === "radio") return { kind: "RADIO", kindColor: color.label, who, whoColor };
  switch (event.category) {
    case "Flag":
      return { kind: "FLAG", kindColor: color.yellow, who, whoColor };
    case "CarEvent":
      return { kind: "OVT", kindColor: color.personal, who, whoColor };
    case "Drs":
      return { kind: "DRS", kindColor: color.personal, who, whoColor };
    default:
      return { kind: "RC", kindColor: color.label, who, whoColor };
  }
}

function EventRow({
  event,
  drivers,
  focusDriverNumber,
  big,
  compact,
}: {
  event: RaceEvent;
  drivers: ReadonlyMap<DriverNumber, DriverInfo>;
  focusDriverNumber?: number;
  big?: boolean;
  compact?: boolean;
}) {
  const { kind, kindColor, who, whoColor } = eventStyle(event, drivers);
  const isFocus = event.driverNumber !== undefined && event.driverNumber === focusDriverNumber;
  const lapFont = big ? 18 : compact ? 11 : 12;
  const badgeFont = big ? 14 : compact ? 9 : 10;
  const whoFont = big ? 18 : compact ? 11 : 13;
  const textFont = big ? 23 : compact ? 13 : 15;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${big ? 60 : compact ? 36 : 40}px ${big ? 76 : compact ? 48 : 54}px minmax(0,1fr)`,
        gap: 12,
        padding: big ? "18px 20px" : compact ? "8px 12px" : "12px 12px",
        borderBottom: `1px solid ${color.rowDivider}`,
        alignItems: "start",
        background: isFocus ? "rgba(198,255,61,.08)" : "transparent",
      }}
    >
      <span style={{ font: `500 ${lapFont}px/1.35 ${font.mono}`, color: color.dim }}>{event.lapNumber !== undefined ? `L${event.lapNumber}` : ""}</span>
      <span
        style={{
          font: `700 ${badgeFont}px/1 ${font.mono}`,
          padding: "4px 0",
          textAlign: "center",
          background: kindColor,
          color: color.bg,
        }}
      >
        {kind}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        {who && (
          <span style={{ display: "flex", alignItems: "center", gap: 7, font: `700 ${whoFont}px/1 ${font.mono}` }}>
            <span style={{ width: 3, height: whoFont, background: whoColor }} />
            {who}
          </span>
        )}
        {event.message && (
          <span style={{ font: `400 ${textFont}px/1.35 ${font.sans}`, color: event.type === "radio" ? color.text : color.textSoft }}>{event.message}</span>
        )}
        {event.type === "radio" && event.recordingUrl && (
          <audio controls style={{ marginTop: 6, maxWidth: "100%", height: 24 }}>
            <source src={event.recordingUrl} type="audio/mpeg" />
          </audio>
        )}
      </div>
    </div>
  );
}

export default RaceControl;
