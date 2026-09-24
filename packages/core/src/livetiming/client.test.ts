import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frames } from "./__fixtures__/frames";
import { negotiate } from "./__fixtures__/negotiate";
import { SignalRClient, type SocketHandlers, type TopicMessage } from "./client";
import type { Topic } from "./protocol";

const HANDSHAKE = '{"protocol":"json","version":1}\x1e';
const NEGOTIATE_URL = "https://livetiming.formula1.com/signalrcore/negotiate?negotiateVersion=1";

interface FakeSocket {
  url: string;
  headers: Record<string, string>;
  handlers: SocketHandlers;
  sent: string[];
  closed: boolean;
}

function okNegotiate(): Response {
  return new Response(JSON.stringify(negotiate), {
    status: 200,
    headers: [
      ["set-cookie", "AWSALB=abc; Path=/"],
      ["set-cookie", "AWSALBCORS=def; Path=/; Secure"],
    ],
  });
}

interface SetupOptions {
  topics?: readonly Topic[];
  autoReconnect?: boolean;
  insideFactory?: (handlers: SocketHandlers) => void;
}

function setup({ topics = ["Heartbeat"], autoReconnect, insideFactory }: SetupOptions = {}) {
  const sockets: FakeSocket[] = [];
  const fetchCalls: {
    url: string;
    method: string | undefined;
    at: number;
    signal: AbortSignal | null | undefined;
  }[] = [];
  let negotiateStatus: number | "hang" = 200;
  const fetchFake = async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({
      url: String(input),
      method: init?.method,
      at: Date.now(),
      signal: init?.signal,
    });
    if (negotiateStatus === "hang") {
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))),
      );
    }
    return negotiateStatus === 200 ? okNegotiate() : new Response("", { status: negotiateStatus });
  };
  const client = new SignalRClient({
    topics,
    autoReconnect,
    fetch: fetchFake as typeof fetch,
    socket: (url, headers, handlers) => {
      insideFactory?.(handlers);
      const socket: FakeSocket = { url, headers, handlers, sent: [], closed: false };
      sockets.push(socket);
      return {
        send: (data) => socket.sent.push(data),
        close: () => {
          socket.closed = true;
        },
      };
    },
  });
  const messages: TopicMessage[] = [];
  client.on("topic", (message) => messages.push(message));
  const errors: string[] = [];
  client.on("error", (error) => errors.push(error.message));
  return {
    client,
    sockets,
    fetchCalls,
    messages,
    errors,
    setNegotiateStatus: (status: number | "hang") => {
      negotiateStatus = status;
    },
  };
}

async function openLatest(sockets: FakeSocket[]): Promise<FakeSocket> {
  await vi.advanceTimersByTimeAsync(0);
  const socket = sockets.at(-1);
  if (!socket) throw new Error("no socket was created");
  socket.handlers.onOpen();
  socket.handlers.onMessage(frames.handshake);
  return socket;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SignalRClient", () => {
  it("negotiates, connects with the token and cookies, then sends handshake and subscribe", async () => {
    const { client, sockets, fetchCalls } = setup({ topics: ["Heartbeat", "WeatherData"] });
    const connected = client.connect();
    const socket = await openLatest(sockets);
    await connected;

    expect(fetchCalls.map(({ url, method }) => ({ url, method }))).toEqual([
      { url: NEGOTIATE_URL, method: "POST" },
    ]);
    expect(socket.url).toBe("wss://livetiming.formula1.com/signalrcore?id=mRlt-w2l8Px1JEJYeVItfA");
    expect(socket.headers).toEqual({ Cookie: "AWSALB=abc; AWSALBCORS=def" });
    expect(socket.sent).toEqual([
      HANDSHAKE,
      '{"type":1,"target":"Subscribe","arguments":[["Heartbeat","WeatherData"]],"invocationId":"0"}\x1e',
    ]);
    expect(client.status).toBe("connected");
  });

  it("emits snapshot and feed topic messages", async () => {
    const { client, sockets, messages } = setup();
    void client.connect();
    const socket = await openLatest(sockets);
    socket.handlers.onMessage(frames.subscribeResult);
    socket.handlers.onMessage(frames.feedBatch);

    expect(messages.map((m) => `${m.source}:${m.topic}`)).toEqual([
      "snapshot:Heartbeat",
      "snapshot:SessionInfo",
      "snapshot:TrackStatus",
      "snapshot:WeatherData",
      "feed:TimingData",
      "feed:TimingAppData",
    ]);
    expect(messages[5]).toEqual({
      source: "feed",
      topic: "TimingAppData",
      payload: { Lines: { "30": { Stints: { "2": { LapTime: "1:50.132", LapNumber: 20 } } } } },
      timestamp: "2026-09-24T12:54:41.643Z",
    });
  });

  it("subscribes only to newly added topics on the live connection", async () => {
    const { client, sockets } = setup();
    void client.connect();
    const socket = await openLatest(sockets);
    client.subscribe(["Heartbeat", "LapCount"]);

    expect(socket.sent.at(-1)).toBe(
      '{"type":1,"target":"Subscribe","arguments":[["LapCount"]],"invocationId":"1"}\x1e',
    );
  });

  it("backs off exponentially up to 30s, re-negotiating on each attempt", async () => {
    const { client, fetchCalls, errors, setNegotiateStatus } = setup();
    setNegotiateStatus(500);
    client.connect().catch(() => {});
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchCalls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1 + 2000 + 4000 + 8000 + 16000 + 30000 + 30000);

    const gaps = fetchCalls.slice(1).map((call, i) => call.at - (fetchCalls[i]?.at ?? 0));
    expect(gaps).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
    expect(errors[0]).toBe("negotiate failed with HTTP 500");
    expect(client.status).toBe("reconnecting");
    client.disconnect();
  });

  it("reconnects after a drop, re-subscribes, and resets the backoff", async () => {
    const { client, sockets, fetchCalls } = setup();
    const events: string[] = [];
    client.on("connected", () => events.push("connected"));
    client.on("disconnected", () => events.push("disconnected"));
    void client.connect();
    const first = await openLatest(sockets);
    first.handlers.onClose();
    expect(client.status).toBe("reconnecting");

    await vi.advanceTimersByTimeAsync(1000);
    const second = await openLatest(sockets);
    expect(second.sent).toEqual([
      HANDSHAKE,
      '{"type":1,"target":"Subscribe","arguments":[["Heartbeat"]],"invocationId":"1"}\x1e',
    ]);
    second.handlers.onClose();
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchCalls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchCalls).toHaveLength(3);
    expect(events).toEqual(["connected", "disconnected", "connected", "disconnected"]);
    client.disconnect();
  });

  it("ignores messages from a replaced socket", async () => {
    const { client, sockets, messages } = setup();
    void client.connect();
    const first = await openLatest(sockets);
    first.handlers.onClose();
    await vi.advanceTimersByTimeAsync(1000);
    await openLatest(sockets);

    first.handlers.onMessage(frames.feed);
    expect(messages).toEqual([]);
    expect(first.closed).toBe(true);
  });

  it("disconnect cancels a pending reconnect", async () => {
    const { client, sockets, fetchCalls } = setup();
    void client.connect();
    const socket = await openLatest(sockets);
    socket.handlers.onError(new Error("network down"));
    expect(client.status).toBe("reconnecting");

    client.disconnect();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchCalls).toHaveLength(1);
    expect(client.status).toBe("idle");
  });

  it("emits disconnected before a throwing error listener runs", async () => {
    const { client, sockets } = setup();
    const events: string[] = [];
    client.on("disconnected", () => events.push("disconnected"));
    client.on("error", () => {
      throw new Error("listener bug");
    });
    void client.connect();
    const socket = await openLatest(sockets);

    expect(() => socket.handlers.onError(new Error("reset"))).toThrow("listener bug");
    expect(events).toEqual(["disconnected"]);
    expect(client.status).toBe("reconnecting");
    client.disconnect();
  });

  it("clears every timer when disconnected while connected", async () => {
    const { client, sockets } = setup();
    void client.connect();
    await openLatest(sockets);
    expect(vi.getTimerCount()).toBe(2);
    client.disconnect();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a repeated handshake without leaking timers", async () => {
    const { client, sockets, errors } = setup();
    void client.connect();
    const socket = await openLatest(sockets);
    socket.handlers.onMessage(frames.handshake);

    expect(errors).toEqual(["SignalR unexpected handshake on an open connection"]);
    expect(vi.getTimerCount()).toBe(2);
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(20_000);
      socket.handlers.onMessage(frames.ping);
    }
    expect(client.status).toBe("connected");
    expect(errors).toHaveLength(1);
    client.disconnect();
  });

  it("times out an attempt whose negotiate never answers", async () => {
    const { client, fetchCalls, errors, setNegotiateStatus } = setup();
    setNegotiateStatus("hang");
    client.connect().catch(() => {});
    await vi.advanceTimersByTimeAsync(14_999);
    expect(client.status).toBe("connecting");
    await vi.advanceTimersByTimeAsync(1);

    expect(client.status).toBe("reconnecting");
    expect(errors).toEqual(["handshake not completed within 15000ms"]);
    expect(fetchCalls[0]?.signal?.aborted).toBe(true);
    client.disconnect();
  });

  it("times out an attempt whose handshake ack never arrives", async () => {
    const { client, sockets, errors } = setup();
    client.connect().catch(() => {});
    await vi.advanceTimersByTimeAsync(0);
    sockets[0]?.handlers.onOpen();
    await vi.advanceTimersByTimeAsync(15_000);

    expect(client.status).toBe("reconnecting");
    expect(errors).toEqual(["handshake not completed within 15000ms"]);
    expect(sockets[0]?.closed).toBe(true);
    client.disconnect();
  });

  it("rejects connect when disconnected before the handshake", async () => {
    const { client } = setup();
    const connected = client.connect();
    client.disconnect();
    await expect(connected).rejects.toThrow("disconnected before the connection was established");
  });

  it("retries when the socket factory throws", async () => {
    let throws = true;
    const { client, sockets, errors } = setup({
      insideFactory: () => {
        if (throws) throw new Error("factory boom");
      },
    });
    const connected = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(client.status).toBe("reconnecting");
    expect(errors).toEqual(["factory boom"]);

    throws = false;
    await vi.advanceTimersByTimeAsync(1000);
    await openLatest(sockets);
    await connected;
    expect(client.status).toBe("connected");
  });

  it("handles socket events fired synchronously inside the factory", async () => {
    const { client, sockets, errors } = setup({
      insideFactory: (handlers) => {
        handlers.onOpen();
        handlers.onError(new Error("sync failure"));
      },
    });
    client.connect().catch(() => {});
    await vi.advanceTimersByTimeAsync(0);

    expect(sockets[0]?.sent).toEqual([HANDSHAKE]);
    expect(sockets[0]?.closed).toBe(true);
    expect(errors).toEqual(["sync failure"]);
    expect(client.status).toBe("reconnecting");
    client.disconnect();
  });

  it("pings every 15s and treats 30s of server silence as a drop", async () => {
    const { client, sockets, errors } = setup();
    void client.connect();
    const socket = await openLatest(sockets);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(socket.sent.at(-1)).toBe('{"type":6}\x1e');
    socket.handlers.onMessage(frames.ping);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(client.status).toBe("connected");
    await vi.advanceTimersByTimeAsync(1);
    expect(client.status).toBe("reconnecting");
    expect(errors).toEqual(["no message from server within 30000ms"]);
    expect(socket.closed).toBe(true);
    const sentAtDrop = socket.sent.length;
    await vi.advanceTimersByTimeAsync(45_000);
    expect(socket.sent).toHaveLength(sentAtDrop);
    client.disconnect();
  });

  it("goes idle on a server close that forbids reconnecting", async () => {
    const { client, sockets, fetchCalls, errors } = setup();
    void client.connect();
    const socket = await openLatest(sockets);
    socket.handlers.onMessage('{"type":7,"error":"bye","allowReconnect":false}\x1e');

    await vi.advanceTimersByTimeAsync(60_000);
    expect(client.status).toBe("idle");
    expect(fetchCalls).toHaveLength(1);
    expect(errors).toEqual(["SignalR server closed: bye"]);
  });

  it("does not reconnect after a drop when autoReconnect is false", async () => {
    const { client, sockets, fetchCalls } = setup({ autoReconnect: false });
    const events: string[] = [];
    client.on("disconnected", () => events.push("disconnected"));
    void client.connect();
    const socket = await openLatest(sockets);
    socket.handlers.onClose();
    expect(vi.getTimerCount()).toBe(0);
    const sentAtDrop = socket.sent.length;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(client.status).toBe("idle");
    expect(fetchCalls).toHaveLength(1);
    expect(socket.sent).toHaveLength(sentAtDrop);
    expect(events).toEqual(["disconnected"]);
  });

  it("includes topics added during the handshake in the first Subscribe", async () => {
    const { client, sockets } = setup();
    void client.connect();
    await vi.advanceTimersByTimeAsync(0);
    const socket = sockets[0];
    if (!socket) throw new Error("no socket was created");
    socket.handlers.onOpen();
    client.subscribe(["LapCount"]);
    socket.handlers.onMessage(frames.handshake);

    expect(socket.sent).toEqual([
      HANDSHAKE,
      '{"type":1,"target":"Subscribe","arguments":[["Heartbeat","LapCount"]],"invocationId":"0"}\x1e',
    ]);
  });

  it("fails the attempt on a handshake error", async () => {
    const { client, sockets, errors } = setup();
    client.connect().catch(() => {});
    await vi.advanceTimersByTimeAsync(0);
    sockets[0]?.handlers.onOpen();
    sockets[0]?.handlers.onMessage('{"error":"unsupported protocol"}\x1e');

    expect(client.status).toBe("reconnecting");
    expect(errors).toEqual(["SignalR handshake-error: unsupported protocol"]);
    client.disconnect();
  });

  it("stops processing a message once a listener disconnects", async () => {
    const { client, sockets, messages } = setup();
    client.on("topic", () => client.disconnect());
    void client.connect();
    const socket = await openLatest(sockets);
    socket.handlers.onMessage(frames.feedBatch);

    expect(messages.map((m) => m.topic)).toEqual(["TimingData"]);
    expect(client.status).toBe("idle");
  });

  it("rejects connect before a throwing error listener runs", async () => {
    const { client, sockets } = setup({ autoReconnect: false });
    client.on("error", () => {
      throw new Error("listener bug");
    });
    const connected = client.connect();
    await vi.advanceTimersByTimeAsync(0);

    expect(() => sockets[0]?.handlers.onError(new Error("reset"))).toThrow("listener bug");
    await expect(connected).rejects.toThrow("reset");
    expect(client.status).toBe("idle");
  });

  it("connect() during reconnect resolves on the next handshake", async () => {
    const { client, sockets } = setup();
    void client.connect();
    const first = await openLatest(sockets);
    first.handlers.onClose();

    let settled = false;
    const next = client.connect().then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(settled).toBe(false);
    await openLatest(sockets);
    await next;
    expect(settled).toBe(true);
  });
});
