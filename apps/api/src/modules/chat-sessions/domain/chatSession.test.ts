import { describe, expect, it } from "vitest";
import { buildActivePath, findRegenerationTarget, NothingToRegenerateError, planHistoryWindow, withSiblingMetadata } from "./chatSession.js";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function msg(id: string, role: "user" | "assistant", text: string): Msg {
  return { id, role, text };
}

describe("findRegenerationTarget", () => {
  it("returns the last user/assistant pair when the transcript ends in an assistant reply", () => {
    const messages = [msg("1", "user", "hi"), msg("2", "assistant", "hello"), msg("3", "user", "aspirin?"), msg("4", "assistant", "no risks found")];

    const { userMessage, assistantMessage } = findRegenerationTarget(messages);

    expect(userMessage.id).toBe("3");
    expect(assistantMessage.id).toBe("4");
  });

  it("throws when the session has fewer than two messages", () => {
    expect(() => findRegenerationTarget([msg("1", "user", "hi")])).toThrow(NothingToRegenerateError);
    expect(() => findRegenerationTarget([])).toThrow(NothingToRegenerateError);
  });

  it("throws when the transcript ends on a user message with no reply yet", () => {
    const messages = [msg("1", "user", "hi"), msg("2", "assistant", "hello"), msg("3", "user", "still there?")];
    expect(() => findRegenerationTarget(messages)).toThrow(NothingToRegenerateError);
  });
});

describe("planHistoryWindow (improvements.md #3.3, Build Plan V2.3.2)", () => {
  const nums = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("needs no summarization when the conversation is within the window", () => {
    const plan = planHistoryWindow(nums(5), 0, 10);
    expect(plan.needsSummarization).toBe(false);
    expect(plan.messagesToSummarize).toEqual([]);
    expect(plan.recentMessages).toEqual(nums(5));
  });

  it("needs no summarization when exactly at the window boundary", () => {
    const plan = planHistoryWindow(nums(10), 0, 10);
    expect(plan.needsSummarization).toBe(false);
    expect(plan.recentMessages).toEqual(nums(10));
  });

  it("summarizes the overflow the first time the window is exceeded", () => {
    const plan = planHistoryWindow(nums(13), 0, 10);
    expect(plan.needsSummarization).toBe(true);
    expect(plan.messagesToSummarize).toEqual([0, 1, 2]);
    expect(plan.recentMessages).toEqual(nums(13).slice(-10));
  });

  it("only summarizes the NEWLY-overflowed messages, never re-summarizing ones already covered", () => {
    // Already summarized the first 3 (from a prior turn); one more message has since aged out of the window.
    const plan = planHistoryWindow(nums(14), 3, 10);
    expect(plan.needsSummarization).toBe(true);
    expect(plan.messagesToSummarize).toEqual([3]);
    expect(plan.recentMessages).toEqual(nums(14).slice(-10));
  });

  it("does not re-trigger summarization when nothing new has aged out since the last summary", () => {
    // 13 messages, already summarized through index 3 — but only 3 have overflowed the window, so no new work.
    const plan = planHistoryWindow(nums(13), 3, 10);
    expect(plan.needsSummarization).toBe(false);
    expect(plan.messagesToSummarize).toEqual([]);
  });
});

interface TreeMsg {
  id: string;
  parentId?: string;
  activeChildId?: string;
  createdAt: string;
}

function node(id: string, createdAt: string, opts: { parentId?: string; activeChildId?: string } = {}): TreeMsg {
  return { id, createdAt, ...opts };
}

describe("buildActivePath (Build Plan V2.6)", () => {
  it("walks a plain linear conversation exactly in order, same as before branching existed", () => {
    const all = [
      node("u1", "1"),
      node("a1", "2", { parentId: "u1" }),
      node("u2", "3", { parentId: "a1" }),
      node("a2", "4", { parentId: "u2" }),
    ];
    expect(buildActivePath(all).map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("returns an empty path for a session with no messages yet", () => {
    expect(buildActivePath([])).toEqual([]);
  });

  it("follows the edited branch when a later message was edited, skipping the stale branch entirely", () => {
    // u1 -> a1 -> u2 (edited to u2b) -> a2 / a2b
    const all = [
      node("u1", "1"),
      node("a1", "2", { parentId: "u1", activeChildId: "u2b" }),
      node("u2", "3", { parentId: "a1" }),
      node("a2", "4", { parentId: "u2" }),
      node("u2b", "5", { parentId: "a1" }),
      node("a2b", "6", { parentId: "u2b" }),
    ];
    expect(buildActivePath(all).map((m) => m.id)).toEqual(["u1", "a1", "u2b", "a2b"]);
  });

  it("switching back to the original branch resumes it, unaffected by the edit having happened", () => {
    const all = [
      node("u1", "1"),
      node("a1", "2", { parentId: "u1", activeChildId: "u2" }), // switched back
      node("u2", "3", { parentId: "a1" }),
      node("a2", "4", { parentId: "u2" }),
      node("u2b", "5", { parentId: "a1" }),
      node("a2b", "6", { parentId: "u2b" }),
    ];
    expect(buildActivePath(all).map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("follows a whole new branch when the FIRST message itself was edited", () => {
    // Original: u1 -> a1 -> u2 -> a2. Edited u1 to u1b, a fresh branch with nothing after it yet.
    const all = [
      node("u1", "1"),
      node("a1", "2", { parentId: "u1" }),
      node("u2", "3", { parentId: "a1" }),
      node("a2", "4", { parentId: "u2" }),
      node("u1b", "5"),
      node("a1b", "6", { parentId: "u1b" }),
    ];
    expect(buildActivePath(all, "u1b").map((m) => m.id)).toEqual(["u1b", "a1b"]);
    // and switching the root pointer back resumes the original branch
    expect(buildActivePath(all, "u1").map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("defaults to the newest root when no active-first-message pointer is set yet", () => {
    // Each root has its own child so this isn't the all-parentless legacy-flat shape below.
    const all = [node("u1", "1"), node("a1", "2", { parentId: "u1" }), node("u1b", "3"), node("a1b", "4", { parentId: "u1b" })];
    expect(buildActivePath(all).map((m) => m.id)).toEqual(["u1b", "a1b"]);
  });

  it("falls back to plain chronological order for a real pre-feature session where no message has a parentId at all", () => {
    const all = [node("u1", "1"), node("a1", "2"), node("u2", "3"), node("a2", "4")];
    expect(buildActivePath(all).map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });
});

describe("withSiblingMetadata (Build Plan V2.6)", () => {
  it("attaches no metadata to messages with no siblings", () => {
    const all = [node("u1", "1"), node("a1", "2", { parentId: "u1" })];
    const decorated = withSiblingMetadata(buildActivePath(all), all);
    expect(decorated.every((m) => m.editIndex === undefined && m.editCount === undefined)).toBe(true);
  });

  it("reports position/count/sibling-ids for an edited message, but not for its unedited assistant reply", () => {
    const all = [
      node("u1", "1"),
      node("a1", "2", { parentId: "u1", activeChildId: "u2b" }),
      node("u2", "3", { parentId: "a1" }),
      node("a2", "4", { parentId: "u2" }),
      node("u2b", "5", { parentId: "a1" }),
      node("a2b", "6", { parentId: "u2b" }),
    ];
    const decorated = withSiblingMetadata(buildActivePath(all), all);
    const u2bDecorated = decorated.find((m) => m.id === "u2b")!;
    expect(u2bDecorated.editIndex).toBe(2);
    expect(u2bDecorated.editCount).toBe(2);
    expect(u2bDecorated.siblingIds).toEqual(["u2", "u2b"]);

    const a2bDecorated = decorated.find((m) => m.id === "a2b")!;
    expect(a2bDecorated.editIndex).toBeUndefined();
  });

  it("counts a switched-away sibling correctly even though it isn't on the active path", () => {
    const all = [
      node("u1", "1"),
      node("a1", "2", { parentId: "u1", activeChildId: "u2" }), // active branch is the ORIGINAL, not the edit
      node("u2", "3", { parentId: "a1" }),
      node("a2", "4", { parentId: "u2" }),
      node("u2b", "5", { parentId: "a1" }),
      node("a2b", "6", { parentId: "u2b" }),
    ];
    const decorated = withSiblingMetadata(buildActivePath(all), all);
    const u2Decorated = decorated.find((m) => m.id === "u2")!;
    expect(u2Decorated.editIndex).toBe(1);
    expect(u2Decorated.editCount).toBe(2);
    expect(u2Decorated.siblingIds).toEqual(["u2", "u2b"]);
  });
});
