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

export interface SignalRClientEvents {
  raw: (data: string) => void;
  topic: (message: TopicMessage) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
}

export interface SignalRClientOptions {
  socket: SocketFactory;
  fetch?: typeof fetch;
  topics?: readonly Topic[];
  autoReconnect?: boolean;
}

type ConnectionState =
  | { status: "idle" }
  | { status: "connecting"; attempt: number; socket: SocketConnection | null }
  | { status: "connected"; socket: SocketConnection }
  | { status: "reconnecting"; attempt: number; timer: ReturnType<typeof setTimeout> };

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

export class SignalRClient {
  private state: ConnectionState = { status: "idle" };
  private pending: PendingConnect | null = null;
  private readonly topics: Set<Topic>;
  private readonly listeners = new Map<
    keyof SignalRClientEvents,
    Set<(...args: never[]) => void>
  >();
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

  on<E extends keyof SignalRClientEvents>(event: E, handler: SignalRClientEvents[E]): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler);
    this.listeners.set(event, set);
    return () => set.delete(handler);
  }

  connect(): Promise<void> {
    if (this.pending) return this.pending.promise;
    if (this.state.status !== "idle") return Promise.resolve();
    let resolve = () => {};
    let reject: (error: Error) => void = () => {};
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.pending = { promise, resolve, reject };
    void this.open(0);
    return promise;
  }

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
    if (prev.status === "reconnecting") clearTimeout(prev.timer);
    if (prev.status === "connecting" || prev.status === "connected") prev.socket?.close();
    this.pending?.reject(new Error("disconnected before the connection was established"));
    this.pending = null;
    if (prev.status === "connected") this.emit("disconnected");
  }

  private emit<E extends keyof SignalRClientEvents>(
    event: E,
    ...args: Parameters<SignalRClientEvents[E]>
  ): void {
    for (const handler of this.listeners.get(event) ?? []) {
      (handler as (...a: Parameters<SignalRClientEvents[E]>) => void)(...args);
    }
  }

  private async open(attempt: number): Promise<void> {
    const attemptState: ConnectionState = { status: "connecting", attempt, socket: null };
    this.state = attemptState;
    let token: string;
    let headers: Record<string, string>;
    try {
      const response = await this.fetchFn(NEGOTIATE_URL, { method: "POST" });
      if (!response.ok) throw new Error(`negotiate failed with HTTP ${response.status}`);
      const negotiated = parseNegotiate(await response.json());
      if ("error" in negotiated) throw new Error(negotiated.error);
      token = negotiated.connectionToken;
      headers = cookieHeader(response);
    } catch (error) {
      if (this.state === attemptState)
        this.fail(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    if (this.state !== attemptState) return;

    const isCurrent = () =>
      (this.state.status === "connecting" || this.state.status === "connected") &&
      this.state.socket === socket;
    const socket: SocketConnection = this.socketFactory(
      `${WS_URL}?id=${encodeURIComponent(token)}`,
      headers,
      {
        onOpen: () => {
          if (!isCurrent()) return;
          socket.send(encodeHandshake());
          socket.send(encodeSubscribe([...this.topics], String(this.nextInvocationId++)));
        },
        onMessage: (data) => {
          if (isCurrent()) this.handleMessage(socket, data);
        },
        onClose: () => {
          if (isCurrent()) this.fail(null);
        },
        onError: (error) => {
          if (isCurrent()) this.fail(error);
        },
      },
    );
    this.state = { status: "connecting", attempt, socket };
  }

  private handleMessage(socket: SocketConnection, data: string): void {
    this.emit("raw", data);
    for (const frame of parseFrames(data)) {
      switch (frame.kind) {
        case "handshake":
          this.state = { status: "connected", socket };
          this.pending?.resolve();
          this.pending = null;
          this.emit("connected");
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
        case "handshake-error":
        case "invocation-error":
          this.emit("error", new Error(`SignalR ${frame.kind}: ${frame.error}`));
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
          );
          return;
        case "ping":
          break;
        default:
          frame satisfies never;
      }
    }
  }

  private fail(error: Error | null): void {
    const prev = this.state;
    if (prev.status !== "connecting" && prev.status !== "connected") return;
    if (this.autoReconnect) {
      const attempt = prev.status === "connecting" ? prev.attempt + 1 : 1;
      const timer = setTimeout(() => void this.open(attempt), backoffDelay(attempt));
      this.state = { status: "reconnecting", attempt, timer };
    } else {
      this.state = { status: "idle" };
    }
    prev.socket?.close();
    if (error) this.emit("error", error);
    if (prev.status === "connected") this.emit("disconnected");
    if (this.state.status === "idle") {
      this.pending?.reject(error ?? new Error("connection closed"));
      this.pending = null;
    }
  }
}
