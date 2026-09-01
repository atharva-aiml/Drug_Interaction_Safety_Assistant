import { describe, expect, it } from "vitest";
import { parseNdjsonChunk } from "./ndjsonStream";

describe("parseNdjsonChunk", () => {
  it("parses a single complete line with no remainder", () => {
    const { events, remainder } = parseNdjsonChunk("", '{"type":"chunk","text":"hi"}\n');
    expect(events).toEqual([{ type: "chunk", text: "hi" }]);
    expect(remainder).toBe("");
  });

  it("parses multiple complete lines delivered in one chunk", () => {
    const { events, remainder } = parseNdjsonChunk("", '{"type":"chunk","text":"a"}\n{"type":"chunk","text":"b"}\n');
    expect(events).toEqual([{ type: "chunk", text: "a" }, { type: "chunk", text: "b" }]);
    expect(remainder).toBe("");
  });

  it("holds back an incomplete trailing line as the remainder", () => {
    const { events, remainder } = parseNdjsonChunk("", '{"type":"chunk","text":"a"}\n{"type":"chunk"');
    expect(events).toEqual([{ type: "chunk", text: "a" }]);
    expect(remainder).toBe('{"type":"chunk"');
  });

  it("completes a line split across two chunks using the carried-over remainder", () => {
    const first = parseNdjsonChunk("", '{"type":"chu');
    expect(first.events).toEqual([]);
    expect(first.remainder).toBe('{"type":"chu');

    const second = parseNdjsonChunk(first.remainder, 'nk","text":"hi"}\n');
    expect(second.events).toEqual([{ type: "chunk", text: "hi" }]);
    expect(second.remainder).toBe("");
  });

  it("ignores blank lines", () => {
    const { events, remainder } = parseNdjsonChunk("", '{"type":"chunk","text":"a"}\n\n{"type":"chunk","text":"b"}\n');
    expect(events).toEqual([{ type: "chunk", text: "a" }, { type: "chunk", text: "b" }]);
    expect(remainder).toBe("");
  });

  it("returns no events and an empty remainder for an empty chunk", () => {
    const { events, remainder } = parseNdjsonChunk("", "");
    expect(events).toEqual([]);
    expect(remainder).toBe("");
  });
});
