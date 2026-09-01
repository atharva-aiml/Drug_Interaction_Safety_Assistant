import { describe, expect, it } from "vitest";
import {
  AlreadyDeletedError,
  assertNotAlreadyDeleted,
  assertReferencesExist,
  normalizeProfileInput,
  ProfileValidationError,
} from "./patientProfile.js";

describe("normalizeProfileInput", () => {
  it("trims the display name and passes reference lists through", () => {
    const result = normalizeProfileInput({
      displayName: "  Jane Synthetic  ",
      medicationIds: ["drug-1"],
      allergyIds: ["allergen-1"],
      conditionIds: ["disease-1"],
    });
    expect(result.displayName).toBe("Jane Synthetic");
    expect(result.medicationIds).toEqual(["drug-1"]);
  });

  it("rejects a blank display name", () => {
    expect(() =>
      normalizeProfileInput({ displayName: "   ", medicationIds: [], allergyIds: [], conditionIds: [] })
    ).toThrow(ProfileValidationError);
  });

  it("de-duplicates each reference list", () => {
    const result = normalizeProfileInput({
      displayName: "Jane",
      medicationIds: ["drug-1", "drug-1", "drug-2"],
      allergyIds: ["allergen-1", "allergen-1"],
      conditionIds: [],
    });
    expect(result.medicationIds).toEqual(["drug-1", "drug-2"]);
    expect(result.allergyIds).toEqual(["allergen-1"]);
  });
});

describe("assertReferencesExist", () => {
  const existing = {
    drugIds: new Set(["drug-1", "drug-2"]),
    allergenIds: new Set(["allergen-1"]),
    conditionIds: new Set(["disease-1"]),
  };

  it("does not throw when every referenced id exists", () => {
    expect(() =>
      assertReferencesExist(
        { displayName: "Jane", medicationIds: ["drug-1"], allergyIds: ["allergen-1"], conditionIds: ["disease-1"] },
        existing
      )
    ).not.toThrow();
  });

  it("throws DRUG_NOT_FOUND when a medication id is unknown", () => {
    try {
      assertReferencesExist(
        { displayName: "Jane", medicationIds: ["drug-999"], allergyIds: [], conditionIds: [] },
        existing
      );
      expect.fail("expected assertReferencesExist to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect((err as ProfileValidationError).code).toBe("DRUG_NOT_FOUND");
    }
  });

  it("throws ALLERGEN_NOT_FOUND when an allergy id is unknown", () => {
    try {
      assertReferencesExist(
        { displayName: "Jane", medicationIds: [], allergyIds: ["allergen-999"], conditionIds: [] },
        existing
      );
      expect.fail("expected assertReferencesExist to throw");
    } catch (err) {
      expect((err as ProfileValidationError).code).toBe("ALLERGEN_NOT_FOUND");
    }
  });

  it("throws CONDITION_NOT_FOUND when a condition id is unknown", () => {
    try {
      assertReferencesExist(
        { displayName: "Jane", medicationIds: [], allergyIds: [], conditionIds: ["disease-999"] },
        existing
      );
      expect.fail("expected assertReferencesExist to throw");
    } catch (err) {
      expect((err as ProfileValidationError).code).toBe("CONDITION_NOT_FOUND");
    }
  });

  it("checks drugs before allergens/conditions when multiple are unknown", () => {
    try {
      assertReferencesExist(
        { displayName: "Jane", medicationIds: ["drug-999"], allergyIds: ["allergen-999"], conditionIds: [] },
        existing
      );
      expect.fail("expected assertReferencesExist to throw");
    } catch (err) {
      expect((err as ProfileValidationError).code).toBe("DRUG_NOT_FOUND");
    }
  });
});

describe("assertNotAlreadyDeleted", () => {
  const base = { id: "p1", displayName: "Jane", createdAt: "2026-01-01T00:00:00.000Z", medicationIds: [], allergyIds: [], conditionIds: [] };

  it("does not throw for an active patient", () => {
    expect(() => assertNotAlreadyDeleted(base)).not.toThrow();
  });

  it("throws AlreadyDeletedError when deletedAt is already set", () => {
    expect(() => assertNotAlreadyDeleted({ ...base, deletedAt: "2026-01-02T00:00:00.000Z" })).toThrow(
      AlreadyDeletedError
    );
  });
});
