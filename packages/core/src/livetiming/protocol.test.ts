import { describe, expect, it } from "vitest";
import { frames } from "./__fixtures__/frames";
import { negotiate } from "./__fixtures__/negotiate";
import { encodeHandshake, encodeSubscribe, parseFrames, parseNegotiate } from "./protocol";

describe("parseFrames on recorded frames", () => {
  it("parses the handshake ack and ping", () => {
    expect(parseFrames(frames.handshake)).toEqual([{ kind: "handshake" }]);
    expect(parseFrames(frames.ping)).toEqual([{ kind: "ping" }]);
  });

  it("parses a single feed record", () => {
    expect(parseFrames(frames.feed)).toEqual([
      {
        kind: "feed",
        topic: "TimingData",
        payload: { Lines: { "10": { Sectors: { "2": { Segments: { "0": { Status: 2048 } } } } } } },
        timestamp: "2026-09-24T12:54:39.455Z",
      },
    ]);
  });

  it("splits a batched message on the record separator", () => {
    expect(parseFrames(frames.feedBatch)).toEqual([
      {
        kind: "feed",
        topic: "TimingData",
        payload: {
          Lines: {
            "30": {
              NumberOfLaps: 20,
              Sectors: { "2": { Value: "25.197" } },
              Speeds: { FL: { Value: "318" } },
              LastLapTime: { Value: "1:50.132" },
            },
          },
        },
        timestamp: "2026-09-24T12:54:41.643Z",
      },
      {
        kind: "feed",
        topic: "TimingAppData",
        payload: { Lines: { "30": { Stints: { "2": { LapTime: "1:50.132", LapNumber: 20 } } } } },
        timestamp: "2026-09-24T12:54:41.643Z",
      },
    ]);
  });

  it("parses the subscribe completion into a per-topic snapshot", () => {
    const [frame] = parseFrames(frames.subscribeResult);
    if (frame?.kind !== "snapshot") throw new Error(`expected snapshot, got ${frame?.kind}`);
    expect(frame.invocationId).toBe("0");
    expect(Object.keys(frame.topics)).toEqual([
      "Heartbeat",
      "SessionInfo",
      "TrackStatus",
      "WeatherData",
    ]);
    expect(frame.topics.TrackStatus).toEqual({ Status: "1", Message: "AllClear", _kf: true });
    expect(frame.topics.WeatherData).toEqual({
      AirTemp: "29.1",
      Humidity: "54.2",
      Pressure: "1014.8",
      Rainfall: "0",
      TrackTemp: "42.3",
      WindDirection: "243",
      WindSpeed: "1.2",
      _kf: true,
    });
  });
});

describe("parseFrames on malformed and control records", () => {
  it("reports invalid records instead of throwing", () => {
    const bogusFeed = '{"type":1,"target":"feed","arguments":["Bogus",{},"t"]}';
    expect(parseFrames(`not json\x1e${bogusFeed}\x1e{"type":2}\x1e`)).toEqual([
      { kind: "invalid", record: "not json", reason: "bad JSON" },
      { kind: "invalid", record: bogusFeed, reason: "feed with unknown topic Bogus" },
      { kind: "invalid", record: '{"type":2}', reason: "unknown type 2" },
    ]);
  });

  it("parses server close, handshake failure, and invocation failure", () => {
    expect(
      parseFrames(
        '{"type":7,"error":"bye","allowReconnect":true}\x1e{"error":"nope"}\x1e{"type":3,"invocationId":"4","error":"bad topic"}\x1e',
      ),
    ).toEqual([
      { kind: "close", error: "bye", allowReconnect: true },
      { kind: "handshake-error", error: "nope" },
      { kind: "invocation-error", invocationId: "4", error: "bad topic" },
    ]);
  });
});

describe("encoders and negotiate", () => {
  it("encodes the handshake and a subscribe invocation", () => {
    expect(encodeHandshake()).toBe('{"protocol":"json","version":1}\x1e');
    expect(encodeSubscribe(["Heartbeat", "WeatherData"], "0")).toBe(
      '{"type":1,"target":"Subscribe","arguments":[["Heartbeat","WeatherData"]],"invocationId":"0"}\x1e',
    );
  });

  it("extracts the connection token from the recorded negotiate body", () => {
    expect(parseNegotiate(negotiate)).toEqual({ connectionToken: "mRlt-w2l8Px1JEJYeVItfA" });
    expect(parseNegotiate({})).toEqual({ error: "negotiate response has no connectionToken" });
  });
});
