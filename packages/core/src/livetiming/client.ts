import {
  TOPICS,
  type Topic,
  encodeHandshake,
  encodeSubscribe,
  parseFrames,
  parseNegotiate,
} from "./protocol";

const BASE_URL = "https://livetiming.formula1.com/signalrcore";
const NEGOTIATE_URL = `${BASE_URL}/negotiate?negotiateVersion=1`;
const WS_URL = BASE_URL.replace(/^https/, "wss");
const MAX_BACKOFF_MS = 30_000;
// The server pings every 15s (observed), so 30s without any inbound frame means a dead link.
// Client pings follow SignalR Core's default keepalive; the F1 server tolerated 80s without them.
const PING_INTERVAL_MS = 15_000;
const SERVER_TIMEOUT_MS = 30_000;
const PING = '{"type":6}\x1e';
// Matches the ASP.NET Core SignalR client's default HandshakeTimeout.
const HANDSHAKE_TIMEOUT_MS = 15_000;

export interface SocketHandlers {
  onOpen(): void;
  onMessage(data: string): void;
  onClose(): void;
  onError(error: Error): void;
}
export interface SocketConnection {
  send(data: string): void;
  close(): void;
}
export type SocketFactory = (
  url: string,
  headers: Record<string, string>,
  handlers: SocketHandlers,
) => SocketConnection;

export type TopicMessage =
  | { source: "snapshot"; topic: Topic; payload: unknown }
  | { source: "feed"; topic: Topic; payload: unknown; timestamp: string };

export interface SignalRClientEventArgs {
  raw: [data: string];
  topic: [message: TopicMessage];
  connected: [];
  disconnected: [];
  error: [error: Error];
}
export type SignalRClientEvents = {
  [E in keyof SignalRClientEventArgs]: (...args: SignalRClientEventArgs[E]) => void;
};

export interface SignalRClientOptions {
  socket: SocketFactory;
  fetch?: typeof fetch;
  topics?: readonly Topic[];
  autoReconnect?: boolean;
}

type Timer = ReturnType<typeof setTimeout>;
type AttemptToken = object;

type ConnectionState =
  | { status: "idle" }
  | {
      status: "connecting";
      token: AttemptToken;
      attempt: number;
      socket: SocketConnection | null;
      deadline: Timer;
      abort: AbortController;
    }
  | {
      status: "connected";
      token: AttemptToken;
      socket: SocketConnection;
      keepalive: ReturnType<typeof setInterval>;
      watchdog: Timer;
    }
  | { status: "reconnecting"; attempt: number; timer: Timer };

interface PendingConnect {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

export function backoffDelay(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

function cookieHeader(response: Response): Record<string, string> {
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  return cookies.length > 0 ? { Cookie: cookies.join("; ") } : {};
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export class SignalRClient {
  private state: ConnectionState = { status: "idle" };
  private pending: PendingConnect | null = null;
  private readonly topics: Set<Topic>;
  private readonly listeners: {
    [E in keyof SignalRClientEventArgs]: Set<(...args: SignalRClientEventArgs[E]) => void>;
  } = {
    raw: new Set(),
    topic: new Set(),
    connected: new Set(),
    disconnected: new Set(),
    error: new Set(),
  };
  private readonly socketFactory: SocketFactory;
  private readonly fetchFn: typeof fetch;
  private readonly autoReconnect: boolean;
  private nextInvocationId = 0;

  constructor(options: SignalRClientOptions) {
    this.socketFactory = options.socket;
    this.fetchFn = options.fetch ?? ((input, init) => fetch(input, init));
    this.topics = new Set(options.topics ?? TOPICS);
    this.autoReconnect = options.autoReconnect ?? true;
  }

  get status(): ConnectionState["status"] {
    return this.state.status;
  }

  on<E extends keyof SignalRClientEventArgs>(
    event: E,
    handler: (...args: SignalRClientEventArgs[E]) => void,
  ): () => void {
    const set = this.listeners[event];
    set.add(handler);
    return () => set.delete(handler);
  }

  /**
   * Resolves on the next successful handshake. Failed attempts retry in the background with
   * backoff (when autoReconnect is on) and keep the promise pending; it rejects only when the
   * client goes idle first, via disconnect(), autoReconnect: false, or a server close that
   * forbids reconnecting.
   */
  connect(): Promise<void> {
    if (this.pending) return this.pending.promise;
    if (this.state.status === "connected") return Promise.resolve();
    let resolve = () => {};
    let reject: (error: Error) => void = () => {};
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.pending = { promise, resolve, reject };
    if (this.state.status === "idle") void this.open(0);
    return promise;
  }

  /** Adds topics. A live connection subscribes to the new ones immediately; otherwise they
   * are included in the Subscribe sent after the next handshake. */
  subscribe(topics: readonly Topic[]): void {
    const added = topics.filter((topic) => !this.topics.has(topic));
    for (const topic of added) this.topics.add(topic);
    if (this.state.status === "connected" && added.length > 0) {
      this.state.socket.send(encodeSubscribe(added, String(this.nextInvocationId++)));
    }
  }

  disconnect(): void {
    const prev = this.state;
    this.state = { status: "idle" };
    this.settle(new Error("disconnected before the connection was established"));
    this.release(prev);
    if (prev.status === "connected") this.emit("disconnected");
  }

  private emit<E extends keyof SignalRClientEventArgs>(
    event: E,
    ...args: SignalRClientEventArgs[E]
  ): void {
    for (const handler of this.listeners[event]) handler(...args);
  }

  private isCurrent(token: AttemptToken): boolean {
    return (
      (this.state.status === "connecting" || this.state.status === "connected") &&
      this.state.token === token
    );
  }

  private settle(error: Error | null): void {
    const pending = this.pending;
    this.pending = null;
    if (error) pending?.reject(error);
    else pending?.resolve();
  }

  private release(prev: ConnectionState): void {
    if (prev.status === "reconnecting") clearTimeout(prev.timer);
    if (prev.status === "connecting") {
      clearTimeout(prev.deadline);
      prev.abort.abort();
    }
    if (prev.status === "connected") {
      clearInterval(prev.keepalive);
      clearTimeout(prev.watchdog);
    }
    if (prev.status === "connecting" || prev.status === "connected") prev.socket?.close();
  }

  private async open(attempt: number): Promise<void> {
    const token: AttemptToken = {};
    const connecting = {
      status: "connecting" as const,
      token,
      attempt,
      socket: null,
      deadline: this.failAfter(token, HANDSHAKE_TIMEOUT_MS, "handshake not completed"),
      abort: new AbortController(),
    };
    this.state = connecting;
    try {
      const response = await this.fetchFn(NEGOTIATE_URL, {
        method: "POST",
        signal: connecting.abort.signal,
      });
      if (!response.ok) throw new Error(`negotiate failed with HTTP ${response.status}`);
      const negotiated = parseNegotiate(await response.json());
      if ("error" in negotiated) throw new Error(negotiated.error);
      if (!this.isCurrent(token)) return;

      // Socket events that fire before the factory returns are replayed once `socket` exists.
      let early: (() => void)[] | null = [];
      const run = (fn: () => void) => {
        if (early) early.push(fn);
        else if (this.isCurrent(token)) fn();
      };
      const socket = this.socketFactory(
        `${WS_URL}?id=${encodeURIComponent(negotiated.connectionToken)}`,
        cookieHeader(response),
        {
          onOpen: () => run(() => socket.send(encodeHandshake())),
          onMessage: (data) => run(() => this.handleMessage(token, socket, data)),
          onClose: () => run(() => this.fail(null)),
          onError: (error) => run(() => this.fail(error)),
        },
      );
      this.state = { ...connecting, socket };
      const queued = early;
      early = null;
      for (const fn of queued) run(fn);
    } catch (error) {
      if (this.isCurrent(token)) this.fail(toError(error));
    }
  }

  private handleMessage(token: AttemptToken, socket: SocketConnection, data: string): void {
    this.emit("raw", data);
    for (const frame of parseFrames(data)) {
      if (!this.isCurrent(token)) return;
      if (this.state.status === "connected") {
        clearTimeout(this.state.watchdog);
        this.state.watchdog = this.startWatchdog(token);
      }
      switch (frame.kind) {
        case "handshake":
          if (this.state.status !== "connecting") {
            this.emit("error", new Error("SignalR unexpected handshake on an open connection"));
            break;
          }
          clearTimeout(this.state.deadline);
          this.state = {
            status: "connected",
            token,
            socket,
            keepalive: setInterval(() => socket.send(PING), PING_INTERVAL_MS),
            watchdog: this.startWatchdog(token),
          };
          socket.send(encodeSubscribe([...this.topics], String(this.nextInvocationId++)));
          this.settle(null);
          this.emit("connected");
          break;
        case "handshake-error":
          this.fail(new Error(`SignalR handshake-error: ${frame.error}`));
          break;
        case "feed":
          this.emit("topic", {
            source: "feed",
            topic: frame.topic,
            payload: frame.payload,
            timestamp: frame.timestamp,
          });
          break;
        case "snapshot":
          for (const [topic, payload] of Object.entries(frame.topics) as [Topic, unknown][]) {
            this.emit("topic", { source: "snapshot", topic, payload });
          }
          break;
        case "invocation-error":
          this.emit("error", new Error(`SignalR invocation-error: ${frame.error}`));
          break;
        case "invalid":
          this.emit(
            "error",
            new Error(`SignalR invalid record (${frame.reason}): ${frame.record}`),
          );
          break;
        case "close":
          this.fail(
            frame.error === null ? null : new Error(`SignalR server closed: ${frame.error}`),
            frame.allowReconnect,
          );
          break;
        case "ping":
          break;
        default:
          frame satisfies never;
      }
    }
  }

  private startWatchdog(token: AttemptToken): Timer {
    return this.failAfter(token, SERVER_TIMEOUT_MS, "no message from server");
  }

  private failAfter(token: AttemptToken, ms: number, reason: string): Timer {
    return setTimeout(() => {
      if (this.isCurrent(token)) this.fail(new Error(`${reason} within ${ms}ms`));
    }, ms);
  }

  private fail(error: Error | null, allowReconnect = true): void {
    const prev = this.state;
    if (prev.status !== "connecting" && prev.status !== "connected") return;
    if (this.autoReconnect && allowReconnect) {
      const attempt = prev.status === "connecting" ? prev.attempt + 1 : 1;
      const timer = setTimeout(() => void this.open(attempt), backoffDelay(attempt));
      this.state = { status: "reconnecting", attempt, timer };
    } else {
      this.state = { status: "idle" };
      this.settle(error ?? new Error("connection closed"));
    }
    this.release(prev);
    // Lifecycle first: a throwing error listener must not hide the disconnect from link trackers.
    if (prev.status === "connected") this.emit("disconnected");
    if (error) this.emit("error", error);
  }
}
