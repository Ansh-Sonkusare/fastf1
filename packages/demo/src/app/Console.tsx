import type { Race } from "@f1/core";
import { useF1Schedule } from "@f1/react";
import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import type { DemoInitialData } from "../data/initial";
import { cut, OMNISCIENT } from "../data/cutoff";
import { getRaceSessions, isLocked } from "../data/openf1";
import { CursorContext, RaceSourceContext, replaySource } from "../data/source";
import { combine, useAsync, useOpenF1 } from "../data/useOpenF1";
import { PANELS, type AnalysisTab } from "../panels/registry";
import { buildTower } from "../panels/tower/shape";
import { formatClock } from "../ui/format";
import { Label, LayoutModeProvider, LockedNote, PanelFrame, useHotkey, type LayoutMode } from "../ui/primitives";
import { color, font, type } from "../ui/tokens";
import { Analysis } from "./Analysis";
import { formatDeepLink, parseDeepLink } from "./deepLink";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PanelSlot } from "./PanelSlot";
import { replayReducer, resolveFocus } from "./replay";
import { SeasonDrawer, buttonStyle } from "./SeasonDrawer";
import { classificationOrder, pickSession, sessionTitle, toConsoleSessions, toDriverMap } from "./session";
import {
  buildTimeline,
  driverLapBlock,
  driverLapWindow,
  flagAt,
  flagBands,
  lapAt,
  lapCrossings,
  ownLap,
  pitLanePassLaps,
  cursorAt,
  lapFraction,
  realPitStops,
} from "./timeline";
import { TimelineBar } from "./TimelineBar";
import type { ConsoleSession, PanelProps } from "./types";

const YEAR = 2025;
/** Panels re-render at 4 Hz while playing; the track map paints between ticks from its own clock. */
const TICK_MS = 250;
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
  const [pickedRound, setPickedRound] = useState<number | null>(null);
  const session = pickSession(sessions, sessionKey, pickedRound);
  const source = useMemo(() => session && replaySource(session.sessionKey), [session]);

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

  const offline = offlineStatus(rawSessions);
  if (offline) {
    const today = new Date().toISOString().slice(0, 10);
    const races = (schedule?.Races ?? []).filter((r) => r.date < today);
    return (
      <LockedConsole
        races={races}
        status={offline}
        round={pickedRound ?? Number(races.at(-1)?.round ?? 1)}
        onRound={(round) => {
          setPickedRound(round);
          setSessionKey(null);
        }}
        drawer={drawer}
      />
    );
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
  if (!session || !source) return <Fullscreen>LOADING SESSIONS…</Fullscreen>;
  return (
    <RaceSourceContext value={source}>
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
    </RaceSourceContext>
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
  const [mode, setMode] = useState<LayoutMode>("desk");
  const [atab, setAtab] = useState<AnalysisTab>("compare");
  const driversQ = useOpenF1("drivers", session.sessionKey);
  const lapsQ = useOpenF1("laps", session.sessionKey);
  const raceControlQ = useOpenF1("race_control", session.sessionKey);
  const resultQ = useOpenF1("session_result", session.sessionKey);
  const pitQ = useOpenF1("pit", session.sessionKey);
  const stintsQ = useOpenF1("stints", session.sessionKey);
  const base = combine(driversQ, lapsQ);
  const [state, dispatch] = useReducer(replayReducer, {
    at: 0,
    start: 0,
    end: 0,
    speed: 1,
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

  const lap = derived ? lapAt(derived.timeline, state.at) : 1;
  const totalLaps = derived?.timeline.totalLaps ?? 1;
  const lapStart = (n: number) => {
    const w = derived?.timeline.windows[Math.min(Math.max(n, 1), totalLaps) - 1];
    return w ? Date.parse(w.start) : state.at;
  };
  const nudge = (e: KeyboardEvent, sign: number) => dispatch({ type: "seek", at: state.at + sign * (e.shiftKey ? 60_000 : 10_000) });

  useHotkey(" ", () => dispatch({ type: "toggle" }));
  useHotkey("ArrowLeft", (e) => nudge(e, -1));
  useHotkey("ArrowRight", (e) => nudge(e, 1));
  useHotkey("l", () => dispatch({ type: "seek", at: state.end }));
  useHotkey("m", () => setMode((m) => (m === "desk" ? "wall" : "desk")));
  useHotkey("6", () => setAtab("compare"));
  useHotkey("7", () => setAtab("tyres"));
  useHotkey("8", () => setAtab("sectors"));
  useHotkey("9", () => setAtab("stops"));

  const classified = useMemo(
    () => (resultQ.status === "loading" ? null : resultQ.status === "ok" ? resultQ.data : []),
    [resultQ],
  );
  useEffect(() => {
    if (!derived || classified === null) return;
    const { crossings, timeline, laps, drivers } = derived;
    const start = timeline.raceStart ?? 0;
    const end = Date.parse(timeline.windows.at(-1)?.end ?? timeline.windows.at(-1)?.start ?? new Date(start).toISOString());
    const linkedLap = link.lap === null ? null : timeline.windows[Math.min(link.lap, timeline.totalLaps) - 1];
    const at = link.t !== null ? start + link.t * 1000 : linkedLap ? Date.parse(linkedLap.start) : end;
    dispatch({ type: "load", start, end, at });
    const order =
      at >= end && classified.length
        ? classificationOrder(classified)
        : buildTower({ lap: lapAt(timeline, at), crossings, laps, stints: [], stops: [], retired: null }).map((r) => r.driver);
    dispatch({ type: "focus", focus: resolveFocus(link, new Set(drivers.keys()), order) });
  }, [derived, classified, link]);

  useEffect(() => {
    if (!state.playing) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", elapsedMs: now - last });
      last = now;
    }, TICK_MS);
    return () => clearInterval(id);
  }, [state.playing]);

  const raceStart = derived?.timeline.raceStart ?? null;
  useEffect(() => {
    if (raceStart === null || state.end === 0) return;
    const t = (state.at - raceStart) / 1000;
    const search = formatDeepLink({ session: session.sessionKey, lap: null, t, a: state.focus.a, b: state.focus.b });
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, [raceStart, session.sessionKey, state.at, state.end, state.focus]);

  const cursor = useMemo(() => (derived ? cursorAt(derived.crossings, derived.timeline, state.at) : null), [derived, state.at]);

  const scrub = useMemo(() => {
    if (!derived || !cursor || raceControlQ.status !== "ok" || pitQ.status !== "ok" || stintsQ.status !== "ok")
      return { bands: [], pitLaps: [] };
    const bands = flagBands(derived.timeline, raceControlQ.data, cursor.at);
    const stops = realPitStops(cut("pit", pitQ.data, cursor), cut("stints", stintsQ.data, cursor), pitLanePassLaps(raceControlQ.data));
    return { bands, pitLaps: stops.map((s) => s.lap) };
  }, [derived, cursor, raceControlQ, pitQ, stintsQ]);

  const lapWindow = derived?.timeline.windows[lap - 1] ?? null;
  const flag =
    raceControlQ.status === "ok" && derived && cursor
      ? flagAt(cut("race_control", raceControlQ.data, cursor), new Date(state.at).toISOString(), lap, (at) => lapAt(derived.timeline, at))
      : null;
  const position = lapWindow ? lap - 1 + lapFraction(lapWindow, state.at) : 0;

  const props: PanelProps | null = derived && {
    session,
    at: state.at,
    lap,
    completedLap: cursor?.finished ? lap : lap - 1,
    totalLaps,
    playing: state.playing,
    focus: state.focus,
    drivers: derived.drivers,
    lapWindow,
    ownLapOf: (driver, lap) => ownLap(derived.crossings, driver, lap),
    lapWindowOf: (driver, lap) => driverLapWindow(derived.crossings, driver, lap),
    lapBlockOf: (driver, lap) => driverLapBlock(derived.crossings, driver, lap),
    setFocus: (focus) => dispatch({ type: "focus", focus }),
  };
  const timelineBar = (label: ReactNode) => (
    <TimelineBar
      mode={mode}
      label={label}
      lap={lap}
      position={position}
      totalLaps={totalLaps}
      playing={state.playing}
      speed={state.speed}
      onToggle={() => dispatch({ type: "toggle" })}
      onSeek={(n) => dispatch({ type: "seek", at: lapStart(n) })}
      onSpeed={(speed) => dispatch({ type: "speed", speed })}
      bands={scrub.bands}
      pitLaps={scrub.pitLaps}
    />
  );

  return (
    <CursorContext value={cursor ?? OMNISCIENT}>
    <LayoutModeProvider value={mode}>
      <div style={{ height: "100vh", minWidth: 1600, display: "flex", flexDirection: "column", gap: 1, background: color.border }}>
        <Header
          mode={mode}
          onModeChange={setMode}
          sessionSelect={
            <select aria-label="Session" value={session.sessionKey} onChange={(e) => onSession(Number(e.target.value))} style={selectStyle}>
              {sessions.map((s) => (
                <option key={s.sessionKey} value={s.sessionKey} style={{ background: color.panel }}>
                  {sessionTitle(s)}
                </option>
              ))}
            </select>
          }
          lap={lap}
          totalLaps={totalLaps}
          onPrev={() => dispatch({ type: "seek", at: lapStart(lap - 1) })}
          onNext={() => dispatch({ type: "seek", at: lapStart(lap + 1) })}
          clock={raceStart !== null ? formatClock(Math.max(0, state.at - raceStart) / 1000) : "—"}
          flag={flag}
          weatherSlot={props && <PanelSlot def={PANELS.find((p) => p.slot === "header")!} props={props} />}
          onSeason={() => setDrawerOpen(true)}
        />
        {mode === "desk" && timelineBar(<TimelineLabel lap={lap} totalLaps={totalLaps} />)}
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: mode === "desk" ? "minmax(0,1fr) 342px" : "1fr", gap: 1, background: color.border }}>
          {base.status === "error" && isLocked(base.error) && <LockedNote inferred={base.error.inferred} />}
          {base.status === "error" && !isLocked(base.error) && <Fullscreen tone={color.red}>OpenF1 failed · {base.error.message}</Fullscreen>}
          {!props && base.status === "loading" && <Fullscreen>LOADING SESSION…</Fullscreen>}
          {props && (mode === "desk" ? <DeskMain props={props} /> : <WallMain props={props} />)}
          {props && mode === "desk" && <Analysis props={props} atab={atab} onTab={setAtab} />}
        </div>
        {mode === "desk" ? (
          <Footer onWall={() => setMode("wall")} />
        ) : (
          timelineBar(<RaceLabel />)
        )}
      </div>
      {drawerOpen && drawer(() => setDrawerOpen(false))}
    </LayoutModeProvider>
    </CursorContext>
  );
}

function TimelineLabel({ lap, totalLaps }: { lap: number; totalLaps: number }) {
  return (
    <span style={{ font: type.label, letterSpacing: ".06em", color: color.dim, width: 90, whiteSpace: "nowrap" }}>
      LAP {lap}/{totalLaps}
    </span>
  );
}

function RaceLabel() {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 9, font: type.panelTitle, letterSpacing: ".07em", textTransform: "uppercase", color: color.text, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, background: color.accent }} />
      Race
    </span>
  );
}

/** Desk's 440px / 1fr / 520px main row: timing, strategy, and track above race control. */
function DeskMain({ props }: { props: PanelProps }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "440px minmax(0,1fr) 520px", gap: 1, minHeight: 0, background: color.border }}>
      <SlotView slot="timing" props={props} />
      <SlotView slot="strategy" props={props} />
      <div style={{ display: "grid", gridTemplateRows: "370px minmax(0,1fr)", gap: 1, minHeight: 0, background: color.border }}>
        <SlotView slot="track" props={props} />
        <SlotView slot="race-control" props={props} />
      </div>
    </div>
  );
}

/** Wall's 600px / 1fr / 640px row: running order, track above race control, and the strategy call. */
function WallMain({ props }: { props: PanelProps }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "600px minmax(0,1fr) 640px", gap: 1, minHeight: 0, background: color.border }}>
      <SlotView slot="timing" props={props} />
      <div style={{ display: "grid", gridTemplateRows: "520px minmax(0,1fr)", gap: 1, minHeight: 0, background: color.border }}>
        <SlotView slot="track" props={props} />
        <SlotView slot="race-control" props={props} />
      </div>
      <SlotView slot="strategy" props={props} />
    </div>
  );
}

/**
 * OpenF1 is locked (live session): no session keys, so no panel data. Everything Jolpica-backed
 * still works: the race list and the season drawer. Panels keep their frames and say why.
 */
type OfflineStatus = "connecting" | "unreachable" | "locked";

/** The shell renders from Jolpica alone until OpenF1's session list arrives. */
function offlineStatus(q: { status: string; error?: unknown }): OfflineStatus | null {
  if (q.status === "loading") return "connecting";
  if (q.status === "error" && isLocked(q.error)) return q.error.inferred ? "unreachable" : "locked";
  return null;
}

function LockedConsole({
  races,
  status,
  round,
  onRound,
  drawer,
}: {
  races: readonly Race[];
  status: OfflineStatus;
  round: number;
  onRound: (round: number) => void;
  drawer: (round: number, close: () => void) => ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<LayoutMode>("desk");
  return (
    <LayoutModeProvider value={mode}>
      <div style={{ minHeight: "100vh", minWidth: 1600, display: "flex", flexDirection: "column", gap: 1, background: color.border }}>
        <Header
          mode={mode}
          onModeChange={setMode}
          sessionSelect={
            <select aria-label="Session" value={round} onChange={(e) => onRound(Number(e.target.value))} style={selectStyle}>
              {races.map((r) => (
                <option key={r.round} value={r.round} style={{ background: color.panel }}>
                  Round {r.round} · {r.raceName} · Race
                </option>
              ))}
            </select>
          }
          lap={null}
          totalLaps={null}
          statusPill={
            status !== "connecting" && (
              <div aria-label="Track status" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", background: color.amber, color: color.bg, font: `700 12px/1 ${type.label}` }}>
                {status === "unreachable" ? "OPENF1 UNREACHABLE · RETRYING" : "OPENF1 LOCKED · LIVE SESSION"}
              </div>
            )
          }
          onSeason={() => setDrawerOpen(true)}
        />
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexWrap: "wrap", gap: 1, background: color.border, padding: 1 }}>
          {PANELS.filter((p) => p.slot !== "header").map((p) => (
            <PanelFrame key={p.num} num={p.num} title={p.title} style={{ flex: "1 1 420px", minHeight: 240 }}>
              {status === "connecting" ? <Label tone={color.dim}>Connecting to OpenF1…</Label> : <LockedNote inferred={status === "unreachable"} />}
            </PanelFrame>
          ))}
        </div>
      </div>
      {drawerOpen && drawer(round, () => setDrawerOpen(false))}
    </LayoutModeProvider>
  );
}

function SlotView({ slot, props }: { slot: (typeof PANELS)[number]["slot"]; props: PanelProps }) {
  return (
    <>
      {PANELS.filter((p) => p.slot === slot).map((def) => (
        <PanelSlot key={def.num} def={def} props={props} />
      ))}
    </>
  );
}

function Fullscreen({ children, tone = color.dim }: { children: ReactNode; tone?: string }) {
  return <div style={{ padding: 40, font: type.label, letterSpacing: ".08em", color: tone }}>{children}</div>;
}

const selectStyle = {
  fontSize: 13,
  fontWeight: 500,
  fontFamily: font.mono,
  background: "transparent",
  color: color.text,
  border: "none",
  padding: 0,
  cursor: "pointer",
} as const;
