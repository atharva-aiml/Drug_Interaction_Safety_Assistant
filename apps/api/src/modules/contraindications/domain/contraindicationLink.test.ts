import { describe, expect, it } from "vitest";
import { ContraindicationLink } from "@disa/shared-types";
import { assertValidSeverity, ContraindicationValidationError, toRisk } from "./contraindicationLink.js";

describe("assertValidSeverity", () => {
  it("accepts each of the four defined severities", () => {
    for (const severity of ["minor", "moderate", "severe", "contraindicated"]) {
      expect(() => assertValidSeverity(severity)).not.toThrow();
    }
  });

  it("rejects a missing severity", () => {
    expect(() => assertValidSeverity(undefined)).toThrow(ContraindicationValidationError);
  });

  it("rejects a severity outside the defined set", () => {
    try {
      assertValidSeverity("catastrophic");
      expect.fail("expected assertValidSeverity to throw");
    } catch (err) {
      expect((err as ContraindicationValidationError).code).toBe("SEVERITY_REQUIRED");
    }
  });
});

describe("toRisk", () => {
  it("builds a summary using only data present on the link", () => {
    const link: ContraindicationLink = {
      id: "link-1",
      drug: { id: "drug-1", name: "Ibuprofen" },
      disease: { id: "disease-1", name: "Chronic Kidney Disease" },
      severity: "severe",
    };
    const risk = toRisk(link);
    expect(risk.type).toBe("contraindication");
    expect(risk.severity).toBe("severe");
    expect(risk.drugsInvolved).toEqual([link.drug]);
    expect(risk.summary).toBe("Ibuprofen is contraindicated for this patient's Chronic Kidney Disease.");
  });
});
