import React, { useState } from "react";
import type { RaceEvent, RaceControlCategory, RaceEventType } from "./shape";
import {
  filterRaceEventsByCategory,
  filterRaceEventsByType,
} from "./shape";

export interface RaceControlProps {
  /**
   * Array of race events (race control + team radio merged) to display.
   * Events should be pre-filtered to the current lap or earlier.
   */
  events: RaceEvent[];

  /**
   * Optional driver number to filter to a specific driver's radio messages.
   * If provided, other events are still shown but driver-specific ones are highlighted.
   */
  focusDriverNumber?: number;

  /**
   * Callback when an event is clicked (e.g., to play radio audio)
   */
  onEventClick?: (event: RaceEvent) => void;
}

/**
 * Race Control & Team Radio feed component.
 * Displays a merged, time-ordered feed of race control messages and team radio communications.
 * Includes filtering buttons for different event types and a scrollable list.
 *
 * Matches reference panel-09.png layout with filters: ALL, RC, RADIO, OVT
 *
 * This is a phase 1 presentational component.
 * In phase 2, it will be wired to receive shaped data from the OpenF1 gate.
 */
export const RaceControl: React.FC<RaceControlProps> = ({
  events,
  focusDriverNumber,
  onEventClick,
}) => {
  // Track which filter is active: 'all', 'rc' (race-control), 'radio', 'ovt' (overtake)
  const [filterMode, setFilterMode] = useState<"all" | "rc" | "radio" | "ovt">("all");

  // Apply filter
  let filteredEvents = events;
  if (filterMode === "rc") {
    filteredEvents = events.filter((e) => e.type === "race-control");
  } else if (filterMode === "radio") {
    filteredEvents = events.filter((e) => e.type === "radio");
  } else if (filterMode === "ovt") {
    filteredEvents = events.filter((e) => e.category === "CarEvent"); // Overtake-like events
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minWidth: 0,
      }}
    >
      {/* Header with filter buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderBottom: "1px solid #1f242b" }}>
        <span
          style={{
            font: '600 11px/1 "IBM Plex Mono", monospace',
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "#e4e7eb",
          }}
        >
          09 Race control &amp; radio
        </span>
        <div style={{ flex: 1 }} />
        <FilterButton
          label="All"
          active={filterMode === "all"}
          onClick={() => setFilterMode("all")}
        />
        <FilterButton
          label="RC"
          active={filterMode === "rc"}
          onClick={() => setFilterMode("rc")}
        />
        <FilterButton
          label="Radio"
          active={filterMode === "radio"}
          onClick={() => setFilterMode("radio")}
        />
        <FilterButton
          label="OVT"
          active={filterMode === "ovt"}
          onClick={() => setFilterMode("ovt")}
        />
      </div>

      {/* Scrollable feed */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          maxHeight: "540px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {filteredEvents.length === 0 ? (
          <div
            style={{
              padding: "12px",
              color: "#8b939e",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            No events to display
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <RaceEventItem
              key={`${event.date}-${index}`}
              event={event}
              isFocusDriver={event.driverNumber === focusDriverNumber}
              onClick={() => onEventClick?.(event)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "5px 8px",
      borderRadius: "3px",
      border: "none",
      background: active ? "#2a5a5e" : "#1a1f25",
      color: active ? "#3ecf6e" : "#8b939e",
      font: '600 10px/1 "IBM Plex Mono", monospace',
      cursor: "pointer",
      transition: "background-color 0.2s",
    }}
  >
    {label}
  </button>
);

interface RaceEventItemProps {
  event: RaceEvent;
  isFocusDriver: boolean;
  onClick: () => void;
}

/**
 * Individual race event item.
 * Displays lap, event type/category badge, message, and optional driver info.
 * Matches reference panel-09.png styling.
 */
const RaceEventItem: React.FC<RaceEventItemProps> = ({
  event,
  isFocusDriver,
  onClick,
}) => {
  const { categoryColor, badgeLabel } = getBadgeStyle(event);
  const bgColor = isFocusDriver
    ? "rgba(62, 207, 110, 0.1)"
    : "transparent";

  // Extract lap number from event
  const lapNumber = event.lapNumber || "—";

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "34px 52px minmax(0, 1fr)",
        gap: "8px",
        padding: "9px 12px",
        borderBottom: "1px solid #181c21",
        alignItems: "start",
        background: bgColor,
        cursor: event.type === "radio" ? "pointer" : "default",
      }}
    >
      {/* Lap number */}
      <span
        style={{
          font: '500 11px/1.4 "IBM Plex Mono", monospace',
          color: "#5b636e",
        }}
      >
        L{lapNumber}
      </span>

      {/* Event type/category badge */}
      <span
        style={{
          font: '700 9px/1 "IBM Plex Mono", monospace',
          padding: "4px 0",
          textAlign: "center",
          borderRadius: "2px",
          background: categoryColor,
          color: "#0b0d10",
          textTransform: "uppercase",
        }}
      >
        {badgeLabel}
      </span>

      {/* Message and optional driver info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          minWidth: 0,
        }}
      >
        {event.driverNumber !== undefined && event.type === "radio" && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: ".04em",
              color: "#c3c9d1",
            }}
          >
            <span
              style={{
                width: "3px",
                height: "11px",
                background: getDriverBarColor(event.driverNumber),
              }}
            />
            {getDriverInitials(event.driverNumber)}
          </span>
        )}
        <span
          style={{
            fontSize: "13px",
            lineHeight: 1.35,
            color: "#c3c9d1",
            wordWrap: "break-word",
          }}
        >
          {event.message}
        </span>

        {/* Radio playback link if available - only shown on hover/click */}
        {event.type === "radio" && event.recordingUrl && (
          <audio
            controls
            style={{
              marginTop: "6px",
              maxWidth: "100%",
              height: "20px",
              display: "none", // Hide in phase 1, will enable in phase 2
            }}
          >
            <source src={event.recordingUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        )}
      </div>
    </div>
  );
};

/**
 * Maps event category to badge styling (color and label).
 * Matches reference panel-09.png badge colors.
 */
function getBadgeStyle(event: RaceEvent): { categoryColor: string; badgeLabel: string } {
  if (event.type === "radio") {
    return {
      categoryColor: "#6fd3e8", // Cyan for radio
      badgeLabel: "RADIO",
    };
  }

  switch (event.category) {
    case "Flag":
      return {
        categoryColor: "#f5d020", // Yellow for flags
        badgeLabel: "FLAG",
      };
    case "Drs":
      return {
        categoryColor: "#3ecf6e", // Green for DRS
        badgeLabel: "DRS",
      };
    case "Penalty":
      return {
        categoryColor: "#ff6b6b", // Red for penalties
        badgeLabel: "PEN",
      };
    case "SessionStatus":
      return {
        categoryColor: "#6fd3e8", // Cyan for session status
        badgeLabel: "SES",
      };
    case "SafetyCar":
      return {
        categoryColor: "#ffa500", // Orange for safety car
        badgeLabel: "SC",
      };
    case "CarEvent":
      return {
        categoryColor: "#3ecf6e", // Green for overtakes/car events (OVT)
        badgeLabel: "OVT",
      };
    default:
      return {
        categoryColor: "#8b939e", // Gray for race control
        badgeLabel: "RC",
      };
  }
}

/**
 * Gets a consistent color bar for a driver number.
 * Uses a color palette to differentiate drivers.
 */
function getDriverBarColor(driverNumber: number): string {
  const colors = [
    "#ff4444", // Red
    "#44ff44", // Green
    "#4444ff", // Blue
    "#ffff44", // Yellow
    "#ff44ff", // Magenta
    "#44ffff", // Cyan
    "#ff8844", // Orange
    "#8844ff", // Purple
  ];
  return colors[driverNumber % colors.length];
}

/**
 * Gets driver initials from driver number.
 * In a real app, this would map to actual driver names.
 */
function getDriverInitials(driverNumber: number): string {
  const driverMap: Record<number, string> = {
    1: "VER",
    16: "LEC",
    44: "HAM",
    81: "PIA",
    55: "SAI",
  };
  return driverMap[driverNumber] || `D${driverNumber}`;
}

export default RaceControl;
