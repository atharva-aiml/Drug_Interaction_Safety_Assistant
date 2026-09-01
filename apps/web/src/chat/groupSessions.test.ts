import { describe, expect, it } from "vitest";
import { groupSessionsByPinned } from "./groupSessions";

describe("groupSessionsByPinned", () => {
  it("splits sessions into pinned/unpinned, preserving order within each group", () => {
    const sessions = [
      { id: "1", pinned: false },
      { id: "2", pinned: true },
      { id: "3", pinned: false },
      { id: "4", pinned: true },
    ];

    expect(groupSessionsByPinned(sessions)).toEqual({
      pinned: [{ id: "2", pinned: true }, { id: "4", pinned: true }],
      unpinned: [{ id: "1", pinned: false }, { id: "3", pinned: false }],
    });
  });

  it("returns empty arrays for an empty list, and an empty pinned group when nothing is pinned", () => {
    expect(groupSessionsByPinned([])).toEqual({ pinned: [], unpinned: [] });
    expect(groupSessionsByPinned([{ id: "1", pinned: false }])).toEqual({ pinned: [], unpinned: [{ id: "1", pinned: false }] });
  });
});
