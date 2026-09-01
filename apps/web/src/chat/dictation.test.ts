import { describe, expect, it } from "vitest";
import { DICTATION_PAUSE_MS, shouldFinalizeDictation } from "./dictation";

describe("shouldFinalizeDictation", () => {
  it("returns false immediately after speech (no pause yet)", () => {
    expect(shouldFinalizeDictation(1000, 1000)).toBe(false);
  });

  it("returns false when the pause is shorter than the threshold", () => {
    expect(shouldFinalizeDictation(1000, 1000 + DICTATION_PAUSE_MS - 1)).toBe(false);
  });

  it("returns true once the pause reaches exactly the threshold", () => {
    expect(shouldFinalizeDictation(1000, 1000 + DICTATION_PAUSE_MS)).toBe(true);
  });

  it("returns true once the pause exceeds the threshold", () => {
    expect(shouldFinalizeDictation(1000, 1000 + DICTATION_PAUSE_MS + 500)).toBe(true);
  });

  it("honors a custom pause duration", () => {
    expect(shouldFinalizeDictation(1000, 1500, 1000)).toBe(false);
    expect(shouldFinalizeDictation(1000, 2000, 1000)).toBe(true);
  });
});
