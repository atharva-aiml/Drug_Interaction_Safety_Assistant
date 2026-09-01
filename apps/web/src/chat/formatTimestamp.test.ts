import { describe, expect, it } from "vitest";
import { formatMessageTimestamp } from "./formatTimestamp";

const NOW = new Date("2026-08-22T12:00:00.000Z");

describe("formatMessageTimestamp", () => {
  it("returns 'Just now' for a message less than a minute old", () => {
    expect(formatMessageTimestamp("2026-08-22T11:59:30.000Z", NOW)).toBe("Just now");
  });

  it("returns minutes-ago for a message under an hour old", () => {
    expect(formatMessageTimestamp("2026-08-22T11:45:00.000Z", NOW)).toBe("15m ago");
  });

  it("returns hours-ago for a message under a day old, same calendar day", () => {
    expect(formatMessageTimestamp("2026-08-22T09:00:00.000Z", NOW)).toBe("3h ago");
  });

  it("falls back to an absolute date/time once it's a different calendar day", () => {
    const result = formatMessageTimestamp("2026-08-21T09:00:00.000Z", NOW);
    expect(result).not.toContain("ago");
    expect(result).toContain("Aug");
  });

  it("is deterministic given the same inputs", () => {
    const a = formatMessageTimestamp("2026-08-22T11:45:00.000Z", NOW);
    const b = formatMessageTimestamp("2026-08-22T11:45:00.000Z", NOW);
    expect(a).toBe(b);
  });
});
