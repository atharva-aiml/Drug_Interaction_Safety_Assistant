import { describe, expect, it } from "vitest";
import { shouldAutoScroll } from "./autoScroll";

describe("shouldAutoScroll", () => {
  it("returns true when scrolled all the way to the bottom", () => {
    expect(shouldAutoScroll({ scrollTop: 920, scrollHeight: 1000, clientHeight: 80 })).toBe(true);
  });

  it("returns true when within the near-bottom threshold", () => {
    expect(shouldAutoScroll({ scrollTop: 870, scrollHeight: 1000, clientHeight: 80 })).toBe(true);
  });

  it("returns false when scrolled well above the bottom", () => {
    expect(shouldAutoScroll({ scrollTop: 200, scrollHeight: 1000, clientHeight: 80 })).toBe(false);
  });

  it("returns true when the content doesn't overflow the viewport at all", () => {
    expect(shouldAutoScroll({ scrollTop: 0, scrollHeight: 400, clientHeight: 800 })).toBe(true);
  });
});
