import { describe, expect, it } from "vitest";
import { SEVERITIES, Severity, RiskType } from "@disa/shared-types";
import { getPrecautions } from "./safetyTips.js";

const RISK_TYPES: RiskType[] = ["interaction", "allergy", "contraindication"];

describe("getPrecautions", () => {
  it("returns two non-empty tips for every type/severity combination", () => {
    for (const type of RISK_TYPES) {
      for (const severity of SEVERITIES) {
        const tips = getPrecautions(type, severity as Severity);
        expect(tips).toHaveLength(2);
        for (const tip of tips) expect(tip.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("escalates language for contraindicated vs minor", () => {
    const minorTips = getPrecautions("interaction", "minor").join(" ");
    const contraindicatedTips = getPrecautions("interaction", "contraindicated").join(" ");
    expect(minorTips).not.toEqual(contraindicatedTips);
  });

});
