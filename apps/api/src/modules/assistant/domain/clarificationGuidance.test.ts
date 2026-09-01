import { describe, expect, it } from "vitest";
import { buildClarificationDroppedNote, buildClarificationQuestion, PendingClarification } from "./clarificationGuidance.js";

describe("buildClarificationQuestion", () => {
  it("asks a yes/no confirmation question for a single close match", () => {
    const pending: PendingClarification[] = [
      { category: "medications", action: "add", kind: "confirm", queryName: "pennicilin", candidate: { id: "d1", name: "Penicillin" } },
    ];
    const text = buildClarificationQuestion(pending);
    expect(text).toContain('"Penicillin"');
    expect(text).toContain('"pennicilin"');
    expect(text.toLowerCase()).toContain("yes/no");
  });

  it("asks the user to choose between candidates for an ambiguous match", () => {
    const pending: PendingClarification[] = [
      {
        category: "medications",
        action: "add",
        kind: "disambiguate",
        queryName: "metfor",
        candidates: [
          { id: "d4", name: "Metformin" },
          { id: "d5", name: "Metoprolol" },
        ],
      },
    ];
    const text = buildClarificationQuestion(pending);
    expect(text).toContain("Metformin");
    expect(text).toContain("Metoprolol");
    expect(text).toContain("or");
  });

  it("combines multiple pending clarifications into one question", () => {
    const pending: PendingClarification[] = [
      { category: "medications", action: "add", kind: "confirm", queryName: "pennicilin", candidate: { id: "d1", name: "Penicillin" } },
      { category: "allergies", action: "add", kind: "confirm", queryName: "aspirn", candidate: { id: "a1", name: "Aspirin" } },
    ];
    const text = buildClarificationQuestion(pending);
    expect(text).toContain("Penicillin");
    expect(text).toContain("Aspirin");
  });
});

describe("buildClarificationDroppedNote", () => {
  it("names the dropped item and invites re-mention by exact name", () => {
    const text = buildClarificationDroppedNote("pennicilin");
    expect(text).toContain("pennicilin");
    expect(text.toLowerCase()).toContain("exact name");
  });
});
