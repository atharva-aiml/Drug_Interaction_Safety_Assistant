import { describe, expect, it } from "vitest";
import { AllergyLink } from "@disa/shared-types";
import { assertValidSeverity, AllergyLinkValidationError, toRisk } from "./allergyLink.js";

describe("assertValidSeverity", () => {
  it("accepts each of the four defined severities", () => {
    for (const severity of ["minor", "moderate", "severe", "contraindicated"]) {
      expect(() => assertValidSeverity(severity)).not.toThrow();
    }
  });

  it("rejects a missing severity", () => {
    expect(() => assertValidSeverity(undefined)).toThrow(AllergyLinkValidationError);
  });

  it("rejects a severity outside the defined set", () => {
    try {
      assertValidSeverity("catastrophic");
      expect.fail("expected assertValidSeverity to throw");
    } catch (err) {
      expect((err as AllergyLinkValidationError).code).toBe("SEVERITY_REQUIRED");
    }
  });
});

describe("toRisk", () => {
  it("builds a summary using only data present on the link", () => {
    const link: AllergyLink = {
      id: "link-1",
      drug: { id: "drug-1", name: "Amoxicillin" },
      allergen: { id: "allergen-1", name: "Penicillin" },
      severity: "contraindicated",
    };
    const risk = toRisk(link);
    expect(risk.type).toBe("allergy");
    expect(risk.severity).toBe("contraindicated");
    expect(risk.drugsInvolved).toEqual([link.drug]);
    expect(risk.summary).toBe("Amoxicillin contains Penicillin, which this patient is allergic to.");
  });
});
