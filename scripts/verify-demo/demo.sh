#!/usr/bin/env bash
# Lifecycle for a verification-owned instance of the @f1/demo Vite app.
#   demo.sh setup    one-time: build workspace packages + install playwright-core into the scratch cache
#   demo.sh up       start vite on $VERIFY_PORT (default 3137), wait until it serves the app
#   demo.sh doctor   read-only: is the instance on $VERIFY_PORT ours, up, and serving this checkout?
#   demo.sh down     kill only the vite process this script started
set -euo pipefail

REPO="${VERIFY_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PORT="${VERIFY_PORT:-3137}"
STATE="${TMPDIR:-/tmp}/verify-fastf1-demo-$PORT"
PIDFILE="$STATE/vite.pid"
LOG="$STATE/vite.log"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/verify-fastf1"
URL="http://127.0.0.1:$PORT/"

port_pid() { ss -ltnpH "sport = :$PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true; }

cmd_setup() {
  (cd "$REPO" && pnpm build)
  mkdir -p "$CACHE"
  [ -f "$CACHE/package.json" ] || echo '{"private":true}' >"$CACHE/package.json"
  [ -d "$CACHE/node_modules/playwright-core" ] || (cd "$CACHE" && npm i --silent --no-audit --no-fund playwright-core@1.63.0)
  echo "setup ok: packages built, playwright-core in $CACHE"
}

cmd_up() {
  if [ -n "$(port_pid)" ]; then
    echo "port $PORT already in use (pid $(port_pid)); refusing to double-drive. Run doctor, or pick VERIFY_PORT." >&2
    exit 1
  fi
  [ -f "$REPO/packages/react/dist/index.js" ] && [ -f "$REPO/packages/core/dist/index.js" ] ||
    { echo "packages not built; run: $0 setup" >&2; exit 1; }
  mkdir -p "$STATE"
  # setsid: own process group so `down` can kill pnpm + vite + esbuild without touching anything else.
  # setsid may fork, so $! is not reliable; record the listener's pgid once it is up.
  (cd "$REPO/packages/demo" && setsid pnpm exec vite --host 127.0.0.1 --port "$PORT" --strictPort >"$LOG" 2>&1 &)
  for _ in $(seq 1 60); do
    if curl -fsS "$URL" 2>/dev/null | grep -Eq '<title>(F1 Telemetry Demo|PITWALL[^<]*)</title>'; then
      ps -o pgid= -p "$(port_pid)" | tr -d ' ' >"$PIDFILE"
      echo "up: $URL (pgid $(cat "$PIDFILE"), log $LOG)"
      return 0
    fi
    sleep 0.5
  done
  echo "vite did not become ready; log follows" >&2
  cat "$LOG" >&2
  pkill -f -- "vite --host 127.0.0.1 --port $PORT --strictPort" || true  # exact argv we launched, never by bare name
  rm -rf "$STATE"
  exit 1
}

cmd_doctor() {
  local ok=1 pid lp
  pid="$(cat "$PIDFILE" 2>/dev/null || true)"
  lp="$(port_pid)"
  echo "repo:     $REPO @ $(git -C "$REPO" rev-parse --short HEAD)$(git -C "$REPO" diff --quiet || echo ' (dirty)')"
  echo "url:      $URL"
  if [ -z "$pid" ] || ! kill -0 -- "-$pid" 2>/dev/null; then echo "process:  NOT RUNNING (no live pgid in $PIDFILE)"; ok=0
  else echo "process:  pgid $pid alive"; fi
  if [ -z "$lp" ]; then echo "port:     nothing listening"; ok=0
  elif [ -n "$pid" ] && [ "$(ps -o pgid= -p "$lp" | tr -d ' ')" = "$pid" ]; then echo "port:     owned by our vite (pid $lp)"
  else echo "port:     owned by pid $lp, NOT ours — do not drive"; ok=0; fi
  if curl -fsS "$URL" 2>/dev/null | grep -Eq '<title>(F1 Telemetry Demo|PITWALL[^<]*)</title>'; then echo "http:     serves the demo page"
  else echo "http:     no F1 Telemetry Demo at $URL"; ok=0; fi
  if [ -f "$REPO/packages/react/dist/index.js" ]; then echo "build:    @f1/react dist present ($(date -r "$REPO/packages/react/dist/index.js" '+%F %T'))"
  else echo "build:    @f1/react dist MISSING — run setup"; ok=0; fi
  if [ -d "$CACHE/node_modules/playwright-core" ]; then echo "driver:   playwright-core $(node -p "require('$CACHE/node_modules/playwright-core/package.json').version")"
  else echo "driver:   playwright-core MISSING — run setup"; ok=0; fi
  # Upstreams are hit from the browser, so probe the same endpoints the page loads first.
  local code body warn=0
  code="$(curl -sS -o /dev/null -m 10 -w '%{http_code}' 'https://api.jolpi.ca/ergast/f1/2025.json' 2>/dev/null || echo 000)"
  if [ "$code" = 200 ]; then echo "upstream: jolpi.ca (Ergast) 200 — schedule/results panels drivable"
  else echo "upstream: jolpi.ca (Ergast) HTTP $code — schedule/results panels NOT verifiable now"; warn=1; fi
  body="$(curl -sS -m 10 -w '\n%{http_code}' 'https://api.openf1.org/v1/sessions?meeting_key=1276' 2>/dev/null || echo 000)"
  code="${body##*$'\n'}"
  if [ "$code" = 200 ]; then echo "upstream: openf1.org 200 — speed-comparison features drivable"
  elif grep -q 'Live F1 session in progress' <<<"$body"; then
    echo "upstream: openf1.org 401 LIVE-SESSION LOCKOUT — OpenF1 blocks unauthenticated access during live F1 sessions;"
    echo "          speed-comparison features NOT verifiable until the session ends (browser shows it as a CORS error)"; warn=1
  else echo "upstream: openf1.org HTTP $code — speed-comparison features NOT verifiable now"; warn=1; fi
  if [ "$ok" != 1 ]; then echo "DOCTOR FAIL"; exit 1; fi
  [ "$warn" = 1 ] && echo "DOCTOR OK (with upstream WARN — see above for which features are blocked)" || echo "DOCTOR OK"
}

cmd_down() {
  local pid
  pid="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 -- "-$pid" 2>/dev/null; then
    kill -- "-$pid"
    for _ in $(seq 1 20); do kill -0 -- "-$pid" 2>/dev/null || break; sleep 0.25; done
    echo "down: killed pgid $pid"
  else
    echo "down: nothing of ours running on $PORT"
  fi
  rm -rf "$STATE"
}

case "${1:-}" in
  setup) cmd_setup ;;
  up) cmd_up ;;
  doctor) cmd_doctor ;;
  down) cmd_down ;;
  *) echo "usage: $0 {setup|up|doctor|down}   (env: VERIFY_PORT, default 3137)" >&2; exit 2 ;;
esac
