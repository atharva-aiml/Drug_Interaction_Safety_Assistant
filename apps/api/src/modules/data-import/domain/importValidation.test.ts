import { describe, expect, it } from "vitest";
import { assertNoPII, detectPII, parseRelationshipList, parseTextList, PIIDetectedError, validateDrugRow } from "./importValidation.js";

describe("detectPII", () => {
  it("flags an SSN-shaped value", () => {
    expect(detectPII("123-45-6789")).toContain("SSN-like");
  });

  it("flags an MRN-labeled value", () => {
    expect(detectPII("MRN-1234567")).toContain("medical-record-number");
    expect(detectPII("MRN: 987654")).toContain("medical-record-number");
  });

  it("does not flag an ordinary drug name or class", () => {
    expect(detectPII("Warfarin")).toBeUndefined();
    expect(detectPII("anticoagulant")).toBeUndefined();
  });

  it("does not flag a UUID (superficially numeric-and-dashes, but not SSN-shaped)", () => {
    expect(detectPII("85d79e2f-0bd2-4660-ae42-d0bada08f36d")).toBeUndefined();
  });
});

describe("assertNoPII — fixture of known-bad records (NFR-003)", () => {
  it("does not throw for a clean row", () => {
    expect(() =>
      assertNoPII({ name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet" })
    ).not.toThrow();
  });

  it("throws when an SSN-shaped value is hiding in an unexpected field", () => {
    expect(() =>
      assertNoPII({ name: "123-45-6789", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet" })
    ).toThrow(PIIDetectedError);
  });

  it("throws and reports the exact offending field", () => {
    try {
      assertNoPII({ name: "Warfarin", genericName: "warfarin sodium", drugClass: "MRN-4455667", dosageForm: "tablet" });
      expect.fail("expected assertNoPII to throw");
    } catch (err) {
      expect((err as PIIDetectedError).field).toBe("drugClass");
    }
  });
});

describe("validateDrugRow", () => {
  it("accepts a complete, PII-free row", () => {
    const result = validateDrugRow({
      name: "Ibuprofen",
      genericName: "ibuprofen",
      drugClass: "NSAID",
      dosageForm: "tablet",
    });
    expect(result.accepted).toBe(true);
  });

  it("rejects — never silently drops — a row with an SSN-shaped value, with a specific reason", () => {
    const result = validateDrugRow({
      name: "123-45-6789",
      genericName: "ibuprofen",
      drugClass: "NSAID",
      dosageForm: "tablet",
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("PII");
    expect(result.reason).toContain("SSN-like");
  });

  it("rejects a row missing required fields, with a specific reason", () => {
    const result = validateDrugRow({ name: "Ibuprofen", genericName: "", drugClass: "NSAID", dosageForm: "" });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("genericName");
    expect(result.reason).toContain("dosageForm");
  });

  it("checks PII before schema — a PII-containing row with missing fields is still rejected for PII", () => {
    const result = validateDrugRow({ name: "123-45-6789", genericName: "", drugClass: "", dosageForm: "" });
    expect(result.reason).toContain("PII");
  });

  it("accepts a row with no relationship columns — relationships default to empty", () => {
    const result = validateDrugRow({ name: "Ibuprofen", genericName: "ibuprofen", drugClass: "NSAID", dosageForm: "tablet" });
    expect(result.accepted).toBe(true);
    expect(result.relationships).toEqual({ interactsWith: [], containsAllergen: [], contraindicatedFor: [] });
  });

  it("parses a valid interactsWith column into the accepted row's relationships", () => {
    const result = validateDrugRow({
      name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet",
      interactsWith: "Aspirin:severe;Ibuprofen:moderate",
    });
    expect(result.accepted).toBe(true);
    expect(result.relationships?.interactsWith).toEqual([
      { name: "Aspirin", severity: "severe" },
      { name: "Ibuprofen", severity: "moderate" },
    ]);
  });

  it("rejects the row when a relationship entry has an invalid severity", () => {
    const result = validateDrugRow({
      name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet",
      interactsWith: "Aspirin:extreme",
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("interactsWith");
    expect(result.reason).toContain("severity");
  });

  it("rejects the row when a relationship entry is malformed (no colon)", () => {
    const result = validateDrugRow({
      name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet",
      containsAllergen: "Penicillin",
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("containsAllergen");
  });

  it("attaches matching risks/tips onto interactsWith entries, by drug name", () => {
    const result = validateDrugRow({
      name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet",
      interactsWith: "Aspirin:severe;Ibuprofen:moderate",
      risks: "Aspirin:Raises bleeding risk.;Ibuprofen:Adds to bleeding risk and stomach irritation.",
      tips: "Aspirin:Watch for bruising.;Ibuprofen:Take with food.",
    });
    expect(result.accepted).toBe(true);
    expect(result.relationships?.interactsWith).toEqual([
      { name: "Aspirin", severity: "severe", risk: "Raises bleeding risk.", tip: "Watch for bruising." },
      { name: "Ibuprofen", severity: "moderate", risk: "Adds to bleeding risk and stomach irritation.", tip: "Take with food." },
    ]);
  });

  it("leaves risk/tip undefined for an interactsWith entry with no matching risks/tips row", () => {
    const result = validateDrugRow({
      name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet",
      interactsWith: "Aspirin:severe",
      risks: "SomeOtherDrug:unrelated text.",
    });
    expect(result.accepted).toBe(true);
    expect(result.relationships?.interactsWith).toEqual([{ name: "Aspirin", severity: "severe" }]);
  });

  it("rejects the row when the risks column is malformed", () => {
    const result = validateDrugRow({
      name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet",
      interactsWith: "Aspirin:severe",
      risks: "Aspirin",
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("risks");
  });
});

describe("parseRelationshipList", () => {
  it("treats an absent/blank column as no relationships", () => {
    expect(parseRelationshipList(undefined)).toEqual({ ok: true, entries: [] });
    expect(parseRelationshipList("  ")).toEqual({ ok: true, entries: [] });
  });

  it("parses multiple ';'-separated 'Name:severity' pairs, trimming whitespace", () => {
    expect(parseRelationshipList(" Aspirin:severe ; Ibuprofen : moderate ")).toEqual({
      ok: true,
      entries: [
        { name: "Aspirin", severity: "severe" },
        { name: "Ibuprofen", severity: "moderate" },
      ],
    });
  });

  it("rejects an unknown severity word", () => {
    const result = parseRelationshipList("Aspirin:extreme");
    expect(result.ok).toBe(false);
  });

  it("rejects an entry missing a colon", () => {
    const result = parseRelationshipList("Aspirin");
    expect(result.ok).toBe(false);
  });
});

describe("parseTextList", () => {
  it("treats an absent/blank column as no entries", () => {
    expect(parseTextList(undefined)).toEqual({ ok: true, entries: [] });
    expect(parseTextList("  ")).toEqual({ ok: true, entries: [] });
  });

  it("parses multiple ';'-separated 'Name:free text' pairs, splitting only on the first colon", () => {
    expect(parseTextList("Aspirin:Raises bleeding risk, even at low doses.;Ibuprofen:Adds GI risk.")).toEqual({
      ok: true,
      entries: [
        { name: "Aspirin", text: "Raises bleeding risk, even at low doses." },
        { name: "Ibuprofen", text: "Adds GI risk." },
      ],
    });
  });

  it("rejects an entry missing a colon", () => {
    expect(parseTextList("Aspirin").ok).toBe(false);
  });

  it("rejects an entry with an empty name or empty text", () => {
    expect(parseTextList(":no name").ok).toBe(false);
    expect(parseTextList("Aspirin:").ok).toBe(false);
  });
});
