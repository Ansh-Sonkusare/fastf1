export const TOPICS = [
  "Heartbeat",
  "SessionInfo",
  "SessionData",
  "TrackStatus",
  "TimingData",
  "LapCount",
  "TimingAppData",
  "WeatherData",
] as const;
export type Topic = (typeof TOPICS)[number];

export type Frame =
  | { kind: "handshake" }
  | { kind: "handshake-error"; error: string }
  | { kind: "feed"; topic: Topic; payload: unknown; timestamp: string }
  | { kind: "snapshot"; invocationId: string; topics: Partial<Record<Topic, unknown>> }
  | { kind: "invocation-error"; invocationId: string; error: string }
  | { kind: "ping" }
  | { kind: "close"; error: string | null; allowReconnect: boolean }
  | { kind: "invalid"; record: string; reason: string };

const RECORD_SEPARATOR = "\x1e";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isTopic(x: unknown): x is Topic {
  return typeof x === "string" && (TOPICS as readonly string[]).includes(x);
}

function parseRecord(record: string): Frame {
  const invalid = (reason: string): Frame => ({ kind: "invalid", record, reason });
  let msg: unknown;
  try {
    msg = JSON.parse(record);
  } catch {
    return invalid("bad JSON");
  }
  if (!isRecord(msg)) return invalid("not an object");

  switch (msg.type) {
    case undefined:
      return typeof msg.error === "string"
        ? { kind: "handshake-error", error: msg.error }
        : { kind: "handshake" };
    case 1: {
      const args = msg.arguments;
      if (msg.target !== "feed" || !Array.isArray(args) || args.length !== 3) {
        return invalid("malformed feed");
      }
      const [topic, payload, timestamp] = args;
      if (!isTopic(topic)) return invalid(`feed with unknown topic ${String(topic)}`);
      if (typeof timestamp !== "string") return invalid("feed without timestamp");
      return { kind: "feed", topic, payload, timestamp };
    }
    case 3: {
      if (typeof msg.invocationId !== "string") return invalid("completion without invocationId");
      if (typeof msg.error === "string") {
        return { kind: "invocation-error", invocationId: msg.invocationId, error: msg.error };
      }
      if (!isRecord(msg.result)) return invalid("completion without result");
      const topics: Partial<Record<Topic, unknown>> = {};
      for (const [key, value] of Object.entries(msg.result)) {
        if (isTopic(key)) topics[key] = value;
      }
      return { kind: "snapshot", invocationId: msg.invocationId, topics };
    }
    case 6:
      return { kind: "ping" };
    case 7:
      return {
        kind: "close",
        error: typeof msg.error === "string" ? msg.error : null,
        allowReconnect: msg.allowReconnect === true,
      };
    default:
      return invalid(`unknown type ${String(msg.type)}`);
  }
}

export function parseFrames(data: string): Frame[] {
  return data
    .split(RECORD_SEPARATOR)
    .filter((record) => record !== "")
    .map(parseRecord);
}

export function encodeHandshake(): string {
  return JSON.stringify({ protocol: "json", version: 1 }) + RECORD_SEPARATOR;
}

export function encodeSubscribe(topics: readonly Topic[], invocationId: string): string {
  return (
    JSON.stringify({ type: 1, target: "Subscribe", arguments: [topics], invocationId }) +
    RECORD_SEPARATOR
  );
}

export function parseNegotiate(body: unknown): { connectionToken: string } | { error: string } {
  if (isRecord(body) && typeof body.connectionToken === "string") {
    return { connectionToken: body.connectionToken };
  }
  return { error: "negotiate response has no connectionToken" };
}
