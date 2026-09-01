import { describe, expect, it } from "vitest";
import { DrugInteraction } from "@disa/shared-types";
import {
  assertDistinctDrugs,
  assertOnlyInvolvesDrug,
  assertValidSeverity,
  dedupeSymmetricPairs,
  IncrementalScopeError,
  InteractionValidationError,
  toRisk,
} from "./interaction.js";

describe("assertValidSeverity", () => {
  it("accepts each of the four defined severities", () => {
    for (const severity of ["minor", "moderate", "severe", "contraindicated"]) {
      expect(() => assertValidSeverity(severity)).not.toThrow();
    }
  });

  it("rejects a missing severity", () => {
    expect(() => assertValidSeverity(undefined)).toThrow(InteractionValidationError);
  });

  it("rejects a severity outside the defined set", () => {
    try {
      assertValidSeverity("catastrophic");
      expect.fail("expected assertValidSeverity to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InteractionValidationError);
      expect((err as InteractionValidationError).code).toBe("SEVERITY_REQUIRED");
    }
  });
});

describe("assertDistinctDrugs", () => {
  it("rejects a drug interacting with itself", () => {
    expect(() => assertDistinctDrugs("drug-1", "drug-1")).toThrow(InteractionValidationError);
  });

  it("allows two different drugs", () => {
    expect(() => assertDistinctDrugs("drug-1", "drug-2")).not.toThrow();
  });
});

describe("dedupeSymmetricPairs", () => {
  const drugA = { id: "drug-1", name: "Warfarin" };
  const drugB = { id: "drug-2", name: "Aspirin" };

  it("removes a reverse-direction duplicate of the same pair", () => {
    const interactions: DrugInteraction[] = [
      { id: "int-1", drugA, drugB, severity: "severe" },
      { id: "int-2", drugA: drugB, drugB: drugA, severity: "severe" },
    ];
    const result = dedupeSymmetricPairs(interactions);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("int-1");
  });

  it("keeps distinct pairs", () => {
    const drugC = { id: "drug-3", name: "Ibuprofen" };
    const interactions: DrugInteraction[] = [
      { id: "int-1", drugA, drugB, severity: "severe" },
      { id: "int-2", drugA, drugB: drugC, severity: "moderate" },
    ];
    expect(dedupeSymmetricPairs(interactions)).toHaveLength(2);
  });
});

describe("assertOnlyInvolvesDrug — the actual incremental-recheck business rule", () => {
  const NEW_DRUG = { id: "drug-new", name: "Aspirin" };
  const EXISTING_A = { id: "drug-1", name: "Warfarin" };
  const EXISTING_B = { id: "drug-2", name: "Ibuprofen" };

  it("does not throw when every interaction touches the new drug", () => {
    const interactions: DrugInteraction[] = [
      { id: "int-1", drugA: NEW_DRUG, drugB: EXISTING_A, severity: "severe" },
      { id: "int-2", drugA: EXISTING_B, drugB: NEW_DRUG, severity: "moderate" },
    ];
    expect(() => assertOnlyInvolvesDrug(interactions, NEW_DRUG.id)).not.toThrow();
  });

  it("catches an interaction that doesn't involve the new drug at all — the regression this rule exists to prevent", () => {
    const interactions: DrugInteraction[] = [
      { id: "int-1", drugA: NEW_DRUG, drugB: EXISTING_A, severity: "severe" },
      { id: "int-2", drugA: EXISTING_A, drugB: EXISTING_B, severity: "moderate" }, // pre-existing pair, should never appear
    ];
    expect(() => assertOnlyInvolvesDrug(interactions, NEW_DRUG.id)).toThrow(IncrementalScopeError);
  });

  it("reports exactly which interaction id(s) were out of scope", () => {
    const interactions: DrugInteraction[] = [
      { id: "int-1", drugA: EXISTING_A, drugB: EXISTING_B, severity: "moderate" },
    ];
    try {
      assertOnlyInvolvesDrug(interactions, NEW_DRUG.id);
      expect.fail("expected assertOnlyInvolvesDrug to throw");
    } catch (err) {
      expect((err as IncrementalScopeError).offendingInteractionIds).toEqual(["int-1"]);
    }
  });
});

describe("toRisk", () => {
  it("builds a summary using only data present on the interaction", () => {
    const interaction: DrugInteraction = {
      id: "int-1",
      drugA: { id: "drug-1", name: "Warfarin" },
      drugB: { id: "drug-2", name: "Aspirin" },
      severity: "severe",
    };
    const risk = toRisk(interaction);
    expect(risk.type).toBe("interaction");
    expect(risk.severity).toBe("severe");
    expect(risk.drugsInvolved).toEqual([interaction.drugA, interaction.drugB]);
    expect(risk.summary).toBe("Warfarin and Aspirin have a severe interaction.");
  });
});
