import { describe, expect, it } from "vitest";
import { buildPrescriptionMessage, normalizeMedicationNames } from "./prescriptionMessage.js";

describe("normalizeMedicationNames", () => {
  it("trims, drops empties, and dedupes case-insensitively", () => {
    expect(normalizeMedicationNames([" Aspirin ", "warfarin", "ASPIRIN", "", "  "])).toEqual([
      "Aspirin",
      "warfarin",
    ]);
  });
});

describe("buildPrescriptionMessage", () => {
  it("returns an empty string for no medications", () => {
    expect(buildPrescriptionMessage([])).toBe("");
  });

  it("phrases a single medication", () => {
    expect(buildPrescriptionMessage(["Aspirin"])).toBe(
      "I am taking Aspirin, according to my uploaded prescription."
    );
  });

  it("phrases multiple medications with an Oxford-free 'and'", () => {
    expect(buildPrescriptionMessage(["Aspirin", "Warfarin", "Ibuprofen"])).toBe(
      "I am taking Aspirin, Warfarin and Ibuprofen, according to my uploaded prescription."
    );
  });
});
