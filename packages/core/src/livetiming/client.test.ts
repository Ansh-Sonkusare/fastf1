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

function setup(topics: readonly Topic[] = ["Heartbeat"]) {
  const sockets: FakeSocket[] = [];
  const fetchCalls: { url: string; method: string | undefined; at: number }[] = [];
  let negotiateStatus = 200;
  const fetchFake = async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(input), method: init?.method, at: Date.now() });
    return negotiateStatus === 200 ? okNegotiate() : new Response("", { status: negotiateStatus });
  };
  const client = new SignalRClient({
    topics,
    fetch: fetchFake as typeof fetch,
    socket: (url, headers, handlers) => {
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
    setNegotiateStatus: (status: number) => {
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
    const { client, sockets, fetchCalls } = setup(["Heartbeat", "WeatherData"]);
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
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchCalls).toHaveLength(1);
    expect(client.status).toBe("idle");
  });

  it("rejects connect when disconnected before the handshake", async () => {
    const { client } = setup();
    const connected = client.connect();
    client.disconnect();
    await expect(connected).rejects.toThrow("disconnected before the connection was established");
  });
});
