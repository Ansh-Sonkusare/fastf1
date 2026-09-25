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
 * Includes filtering buttons for different event categories and a scrollable list.
 *
 * This is a phase 1 presentational component.
 * In phase 2, it will be wired to receive shaped data from the OpenF1 gate.
 */
export const RaceControl: React.FC<RaceControlProps> = ({
  events,
  focusDriverNumber,
  onEventClick,
}) => {
  // Track which filters are active
  const [activeFilters, setActiveFilters] = useState<
    Set<RaceEventType | RaceControlCategory>
  >(new Set(["race-control", "radio"]));

  // Filter events based on active filters
  let filteredEvents = events.filter((event) => activeFilters.has(event.type));
  // Also filter by active categories
  const activeCategories = Array.from(activeFilters).filter(
    (f) => f !== "race-control" && f !== "radio"
  ) as RaceControlCategory[];
  if (activeCategories.length > 0) {
    filteredEvents = filterRaceEventsByCategory(filteredEvents, activeCategories);
  }

  const toggleFilter = (
    filter: RaceEventType | RaceControlCategory
  ) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setActiveFilters(newFilters);
  };

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
          Feed
        </span>
        <div style={{ flex: 1 }} />
        <FilterButton
          label="All"
          active={activeFilters.size === 2}
          onClick={() => setActiveFilters(new Set(["race-control", "radio"]))}
        />
        <FilterButton
          label="Flags"
          active={activeFilters.has("Flag")}
          onClick={() => toggleFilter("Flag")}
        />
        <FilterButton
          label="DRS"
          active={activeFilters.has("Drs")}
          onClick={() => toggleFilter("Drs")}
        />
        <FilterButton
          label="Radio"
          active={activeFilters.has("radio")}
          onClick={() => toggleFilter("radio")}
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
 * Displays lap, event type/category, message, and optional driver info.
 */
const RaceEventItem: React.FC<RaceEventItemProps> = ({
  event,
  isFocusDriver,
  onClick,
}) => {
  const categoryColor = getCategoryColor(event.category);
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
        {event.type === "radio" ? "RADIO" : event.category.slice(0, 3)}
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
              color: "#3ecf6e",
            }}
          >
            <span
              style={{
                width: "3px",
                height: "11px",
                background: "#3ecf6e",
              }}
            />
            Driver {event.driverNumber}
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

        {/* Radio playback link if available */}
        {event.type === "radio" && event.recordingUrl && (
          <audio
            controls
            style={{
              marginTop: "6px",
              maxWidth: "100%",
              height: "20px",
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
 * Maps event category to a background color for the badge.
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case "Flag":
      return "#f5d020"; // Yellow for flags
    case "Drs":
      return "#3ecf6e"; // Green for DRS
    case "Penalty":
      return "#ff6b6b"; // Red for penalties
    case "SessionStatus":
      return "#6fd3e8"; // Cyan for session status
    case "SafetyCar":
      return "#ffa500"; // Orange for safety car
    case "CarEvent":
      return "#8b939e"; // Gray for car events
    case "radio":
      return "#6fd3e8"; // Cyan for radio messages
    default:
      return "#5b636e"; // Default gray
  }
}

export default RaceControl;
