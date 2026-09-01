import { describe, expect, it } from "vitest";
import { buildStructuredMessage, hasAnyInput, parseList } from "./buildStructuredMessage";

describe("parseList", () => {
  it("splits on commas and newlines, trimming blanks", () => {
    expect(parseList("aspirin, warfarin\nibuprofen")).toEqual(["aspirin", "warfarin", "ibuprofen"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseList("   ,  \n ")).toEqual([]);
  });
});

describe("hasAnyInput", () => {
  it("is false when every field is empty", () => {
    expect(hasAnyInput({ medications: [], conditions: [], allergies: [] })).toBe(false);
  });

  it("is true when any field has a value", () => {
    expect(hasAnyInput({ medications: ["aspirin"], conditions: [], allergies: [] })).toBe(true);
  });
});

describe("buildStructuredMessage", () => {
  it("builds a sentence from all three fields", () => {
    expect(
      buildStructuredMessage({ medications: ["warfarin", "aspirin"], conditions: ["hypertension"], allergies: ["penicillin"] })
    ).toBe("I am taking warfarin and aspirin. I have hypertension. I am allergic to penicillin.");
  });

  it("uses an Oxford-style list for three or more names", () => {
    expect(buildStructuredMessage({ medications: ["a", "b", "c"], conditions: [], allergies: [] })).toBe(
      "I am taking a, b and c."
    );
  });

  it("omits fields that are empty", () => {
    expect(buildStructuredMessage({ medications: [], conditions: [], allergies: ["latex"] })).toBe(
      "I am allergic to latex."
    );
  });

  it("returns an empty string when there is nothing to say", () => {
    expect(buildStructuredMessage({ medications: [], conditions: [], allergies: [] })).toBe("");
  });
});
