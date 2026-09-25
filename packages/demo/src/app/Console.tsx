import type { Race } from "@f1/core";
import { useF1Schedule } from "@f1/react";
import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import type { DemoInitialData } from "../data/initial";
import { getRaceSessions, isLocked } from "../data/openf1";
import { combine, useAsync, useOpenF1 } from "../data/useOpenF1";
import { PANELS, type PanelSlot as Slot } from "../panels/registry";
import { buildTower } from "../panels/tower/shape";
import { formatClock } from "../ui/format";
import { Label, LockedNote, PanelFrame } from "../ui/primitives";
import { PanelSlot } from "./PanelSlot";
import { color, font, type } from "../ui/tokens";
import { formatDeepLink, parseDeepLink } from "./deepLink";
import { replayReducer, resolveFocus } from "./replay";
import { SeasonDrawer, buttonStyle } from "./SeasonDrawer";
import { classificationOrder, sessionTitle, toConsoleSessions, toDriverMap } from "./session";
import {
  buildTimeline,
  driverLapBlock,
  driverLapWindow,
  flagAt,
  lapAt,
  lapCrossings,
  ownLap,
  raceClockAt,
  type FlagKind,
} from "./timeline";
import type { ConsoleSession, PanelProps } from "./types";

const YEAR = 2025;
const TICK_MS = 1500;
const NO_LINK = parseDeepLink("");

export function Console({ initialData }: { initialData?: DemoInitialData }) {
  const link = useMemo(() => parseDeepLink(window.location.search), []);
  const { data: schedule } = useF1Schedule(YEAR, { initialData: initialData?.schedule });
  const rawSessions = useAsync(`sessions:${YEAR}`, (signal) => getRaceSessions(YEAR, signal));
  const sessions = useMemo(
    () => (rawSessions.status === "ok" ? toConsoleSessions(rawSessions.data, schedule?.Races ?? [], Date.now()) : []),
    [rawSessions, schedule],
  );
  const [sessionKey, setSessionKey] = useState<number | null>(link.session);
  const session = sessions.find((s) => s.sessionKey === sessionKey) ?? sessions.at(-1);

  const drawer = (round: number, close: () => void, pick?: (round: number) => void) => (
    <SeasonDrawer
      year={YEAR}
      schedule={schedule}
      round={round}
      initialData={initialData}
      onPickRound={(r) => {
        pick?.(r);
        close();
      }}
      onClose={close}
    />
  );

  if (rawSessions.status === "error" && isLocked(rawSessions.error)) {
    const today = new Date().toISOString().slice(0, 10);
    return <LockedConsole races={(schedule?.Races ?? []).filter((r) => r.date < today)} drawer={drawer} />;
  }
  if (rawSessions.status === "error")
    return (
      <Fullscreen tone={color.red}>
        OpenF1 sessions failed · {rawSessions.error.message}{" "}
        <button type="button" onClick={rawSessions.retry} style={buttonStyle}>
          RETRY
        </button>
      </Fullscreen>
    );
  if (!session) return <Fullscreen>LOADING SESSIONS…</Fullscreen>;
  return (
    <SessionConsole
      key={session.sessionKey}
      session={session}
      sessions={sessions}
      link={session.sessionKey === link.session ? link : NO_LINK}
      onSession={setSessionKey}
      drawer={(close) =>
        drawer(session.round ?? initialData?.latestRound ?? 1, close, (round) => {
          const next = sessions.find((s) => s.round === round);
          if (next) setSessionKey(next.sessionKey);
        })
      }
    />
  );
}

function SessionConsole({
  session,
  sessions,
  link,
  onSession,
  drawer,
}: {
  session: ConsoleSession;
  sessions: readonly ConsoleSession[];
  link: ReturnType<typeof parseDeepLink>;
  onSession: (key: number) => void;
  drawer: (close: () => void) => ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const driversQ = useOpenF1("drivers", session.sessionKey);
  const lapsQ = useOpenF1("laps", session.sessionKey);
  const raceControlQ = useOpenF1("race_control", session.sessionKey);
  const resultQ = useOpenF1("session_result", session.sessionKey);
  const base = combine(driversQ, lapsQ);
  const [state, dispatch] = useReducer(replayReducer, {
    lap: link.lap ?? 1,
    totalLaps: link.lap ?? 1,
    playing: false,
    focus: { a: null, b: null },
  });

  const derived = useMemo(() => {
    if (driversQ.status !== "ok" || lapsQ.status !== "ok") return null;
    const laps = lapsQ.data;
    const crossings = lapCrossings(laps);
    const timeline = buildTimeline(crossings);
    return { drivers: toDriverMap(driversQ.data), crossings, timeline, laps };
  }, [driversQ, lapsQ]);

  const classified = useMemo(
    () => (resultQ.status === "loading" ? null : resultQ.status === "ok" ? resultQ.data : []),
    [resultQ],
  );
  useEffect(() => {
    if (!derived || classified === null) return;
    const { crossings, timeline, laps, drivers } = derived;
    const order = classified.length
      ? classificationOrder(classified)
      : buildTower({ lap: timeline.totalLaps, crossings, laps, stints: [], stops: [], retired: null }).map((r) => r.driver);
    dispatch({ type: "load", totalLaps: timeline.totalLaps });
    if (link.lap === null) dispatch({ type: "seek", lap: timeline.totalLaps });
    dispatch({ type: "focus", focus: resolveFocus(link, new Set(drivers.keys()), order) });
  }, [derived, classified, link]);

  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.playing]);

  useEffect(() => {
    if (!derived) return;
    const search = formatDeepLink({ session: session.sessionKey, lap: state.lap, a: state.focus.a, b: state.focus.b });
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, [derived, session.sessionKey, state.lap, state.focus]);

  const lapWindow = derived?.timeline.windows[state.lap - 1] ?? null;
  const flag =
    raceControlQ.status === "ok" && lapWindow
      ? flagAt(raceControlQ.data, lapWindow.end ?? lapWindow.start, state.lap, (at) =>
          derived ? lapAt(derived.timeline, at) : state.lap,
        )
      : null;

  const props: PanelProps | null = derived && {
    session,
    lap: state.lap,
    totalLaps: state.totalLaps,
    playing: state.playing,
    focus: state.focus,
    drivers: derived.drivers,
    lapWindow,
    ownLapOf: (driver, lap) => ownLap(derived.crossings, driver, lap),
    lapWindowOf: (driver, lap) => driverLapWindow(derived.crossings, driver, lap),
    lapBlockOf: (driver, lap) => driverLapBlock(derived.crossings, driver, lap),
    setFocus: (focus) => dispatch({ type: "focus", focus }),
  };

  return (
    <div style={{ minWidth: 1600, padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
      <header style={headerStyle}>
        <Wordmark />
        <Stat label="Session">
          <select
            aria-label="Session"
            value={session.sessionKey}
            onChange={(e) => onSession(Number(e.target.value))}
            style={selectStyle}
          >
            {sessions.map((s) => (
              <option key={s.sessionKey} value={s.sessionKey} style={{ background: color.panel }}>
                {sessionTitle(s)}
              </option>
            ))}
          </select>
        </Stat>
        <Stat label="Lap">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-label="Current lap" style={{ font: type.big }}>
              {state.lap}
              <span style={{ color: color.dim }}>/{state.totalLaps}</span>
            </span>
            <button type="button" aria-label="Previous lap" onClick={() => dispatch({ type: "seek", lap: state.lap - 1 })} style={stepStyle}>
              ‹
            </button>
            <input
              type="range"
              aria-label="Lap scrubber"
              min={1}
              max={state.totalLaps}
              value={state.lap}
              onChange={(e) => dispatch({ type: "seek", lap: Number(e.target.value) })}
              style={{ width: 160, accentColor: color.predicted }}
            />
            <button type="button" aria-label="Next lap" onClick={() => dispatch({ type: "seek", lap: state.lap + 1 })} style={stepStyle}>
              ›
            </button>
            <button type="button" aria-label={state.playing ? "Pause" : "Play"} onClick={() => dispatch({ type: "toggle" })} style={buttonStyle}>
              {state.playing ? "❚❚ PAUSE" : "▶ PLAY"}
            </button>
          </span>
        </Stat>
        <Stat label="Race time">
          <span style={{ font: `500 20px/1 ${font.mono}` }}>
            {derived ? formatClock(raceClockAt(derived.timeline, state.lap)) : "—"}
          </span>
        </Stat>
        {flag && <FlagPill kind={flag.kind} label={flag.label} />}
        <div style={{ flex: 1 }} />
        {props && <SlotView slot="header" props={props} />}
        <button type="button" onClick={() => setDrawerOpen(true)} style={buttonStyle}>
          SEASON
        </button>
      </header>
      {base.status === "error" && isLocked(base.error) && <LockedNote />}
      {base.status === "error" && !isLocked(base.error) && (
        <Fullscreen tone={color.red}>OpenF1 failed · {base.error.message}</Fullscreen>
      )}
      {!props && base.status === "loading" && <Fullscreen>LOADING SESSION…</Fullscreen>}
      {props && <PanelGrid render={(slot) => <SlotView slot={slot} props={props} />} />}
      {drawerOpen && drawer(() => setDrawerOpen(false))}
    </div>
  );
}

/** The reference grid; `render` fills each slot. */
function PanelGrid({ render }: { render: (slot: Slot) => ReactNode }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "440px minmax(0,1fr) 420px", gap: 10 }}>
        {render("top-left")}
        {render("top-center")}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>{render("top-right")}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
        {render("mid-left")}
        {render("mid-right")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1.15fr) minmax(0,.6fr)", gap: 10 }}>
        {render("bottom-left")}
        {render("bottom-center")}
        {render("bottom-right")}
      </div>
    </>
  );
}

/**
 * OpenF1 is locked (live session): no session keys, so no panel data. Everything Jolpica-backed
 * still works: the race list and the season drawer. Panels keep their frames and say why.
 */
function LockedConsole({
  races,
  drawer,
}: {
  races: readonly Race[];
  drawer: (round: number, close: () => void) => ReactNode;
}) {
  const [round, setRound] = useState(Number(races.at(-1)?.round ?? 1));
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div style={{ minWidth: 1600, padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
      <header style={headerStyle}>
        <Wordmark />
        <Stat label="Session">
          <select aria-label="Session" value={round} onChange={(e) => setRound(Number(e.target.value))} style={selectStyle}>
            {races.map((r) => (
              <option key={r.round} value={r.round} style={{ background: color.panel }}>
                Round {r.round} · {r.raceName} · Race
              </option>
            ))}
          </select>
        </Stat>
        <Stat label="Lap">
          <span style={{ font: type.big, color: color.dim }}>—</span>
        </Stat>
        <div aria-label="Track status" style={{ ...pillStyle, background: color.amber, color: color.bg }}>
          OPENF1 LOCKED · LIVE SESSION
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => setDrawerOpen(true)} style={buttonStyle}>
          SEASON
        </button>
      </header>
      <PanelGrid
        render={(slot) =>
          PANELS.filter((p) => p.slot === slot).map((p) => (
            <PanelFrame key={p.num} num={p.num} title={p.title}>
              <LockedNote />
            </PanelFrame>
          ))
        }
      />
      {drawerOpen && drawer(round, () => setDrawerOpen(false))}
    </div>
  );
}

function SlotView({ slot, props }: { slot: Slot; props: PanelProps }) {
  return (
    <>
      {PANELS.filter((p) => p.slot === slot).map((def) => (
        <PanelSlot key={def.num} def={def} props={props} />
      ))}
    </>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const flagColors: Record<FlagKind, { bg: string; fg: string }> = {
  green: { bg: "rgba(62,207,110,.14)", fg: color.personal },
  yellow: { bg: color.yellow, fg: color.bg },
  sc: { bg: color.yellow, fg: color.bg },
  vsc: { bg: color.yellow, fg: color.bg },
  red: { bg: color.red, fg: color.bg },
  chequered: { bg: color.text, fg: color.bg },
};

function FlagPill({ kind, label }: { kind: FlagKind; label: string }) {
  const c = flagColors[kind];
  return (
    <div aria-label="Track status" style={{ ...pillStyle, background: c.bg, color: c.fg }}>
      <span style={{ width: 8, height: 8, background: c.fg, borderRadius: "50%" }} />
      {label}
    </div>
  );
}

function Fullscreen({ children, tone = color.dim }: { children: ReactNode; tone?: string }) {
  return <div style={{ padding: 40, font: type.label, letterSpacing: ".08em", color: tone }}>{children}</div>;
}

const stepStyle = { ...buttonStyle, padding: "4px 8px" } as const;

const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 22,
  padding: "10px 16px",
  background: color.panel,
  border: `1px solid ${color.border}`,
  borderRadius: 4,
} as const;

const selectStyle = {
  fontSize: 15,
  fontWeight: 600,
  fontFamily: font.sans,
  background: "transparent",
  color: color.text,
  border: "none",
  padding: 0,
  cursor: "pointer",
} as const;

const pillStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 3,
  font: `700 12px/1 ${font.mono}`,
  letterSpacing: ".06em",
  whiteSpace: "nowrap",
  flexShrink: 0,
} as const;

function Wordmark() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 21, letterSpacing: ".16em" }}>PITWALL</span>
        <span style={{ font: type.label, letterSpacing: ".1em", color: color.label }}>STRATEGY CONSOLE</span>
      </div>
      <div style={{ width: 1, alignSelf: "stretch", background: color.border }} />
    </>
  );
}
