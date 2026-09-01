import { describe, expect, it } from "vitest";
import type { Risk } from "@disa/shared-types";
import { compareSeverityDesc, filterBySeverity, meetsSeverityThreshold, sortBySeverityDesc } from "./severityOrder";

function risk(id: string, severity: Risk["severity"]): Risk {
  return { id, type: "interaction", severity, drugsInvolved: [], summary: id };
}

describe("meetsSeverityThreshold", () => {
  it("a severity meets its own threshold", () => {
    expect(meetsSeverityThreshold("severe", "severe")).toBe(true);
  });
  it("a higher severity meets a lower threshold", () => {
    expect(meetsSeverityThreshold("contraindicated", "severe")).toBe(true);
  });
  it("a lower severity does not meet a higher threshold", () => {
    expect(meetsSeverityThreshold("minor", "severe")).toBe(false);
  });
});

describe("filterBySeverity", () => {
  const risks = [risk("r1", "minor"), risk("r2", "moderate"), risk("r3", "severe"), risk("r4", "contraindicated")];

  it("'all' returns every risk unchanged", () => {
    expect(filterBySeverity(risks, "all")).toEqual(risks);
  });

  it("'severe' hides lower-severity rows but keeps severe and above — the exact Build Plan scenario", () => {
    const result = filterBySeverity(risks, "severe");
    expect(result.map((r) => r.id)).toEqual(["r3", "r4"]);
  });

  it("'contraindicated' keeps only the most severe", () => {
    expect(filterBySeverity(risks, "contraindicated").map((r) => r.id)).toEqual(["r4"]);
  });
});

describe("sortBySeverityDesc", () => {
  it("orders most severe first without mutating the input array", () => {
    const risks = [risk("r1", "minor"), risk("r2", "contraindicated"), risk("r3", "moderate")];
    const sorted = sortBySeverityDesc(risks);
    expect(sorted.map((r) => r.id)).toEqual(["r2", "r3", "r1"]);
    expect(risks.map((r) => r.id)).toEqual(["r1", "r2", "r3"]); // original untouched
  });
});

describe("compareSeverityDesc", () => {
  it("is usable directly as an Array.sort comparator", () => {
    const severities: Risk["severity"][] = ["moderate", "contraindicated", "minor", "severe"];
    severities.sort(compareSeverityDesc);
    expect(severities).toEqual(["contraindicated", "severe", "moderate", "minor"]);
  });
});
