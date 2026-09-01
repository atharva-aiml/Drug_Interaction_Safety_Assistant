import { describe, expect, it } from "vitest";
import { filterSessionsByTitle } from "./filterSessions";

const SESSIONS = [{ title: "Aspirin and warfarin interaction" }, { title: "Penicillin allergy question" }, { title: "New chat" }];

describe("filterSessionsByTitle", () => {
  it("returns every session when the query is blank", () => {
    expect(filterSessionsByTitle(SESSIONS, "")).toEqual(SESSIONS);
    expect(filterSessionsByTitle(SESSIONS, "   ")).toEqual(SESSIONS);
  });

  it("matches a case-insensitive substring of the title", () => {
    expect(filterSessionsByTitle(SESSIONS, "aspirin")).toEqual([SESSIONS[0]]);
    expect(filterSessionsByTitle(SESSIONS, "PENICILLIN")).toEqual([SESSIONS[1]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterSessionsByTitle(SESSIONS, "ibuprofen")).toEqual([]);
  });
});
