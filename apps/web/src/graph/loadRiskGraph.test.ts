import { describe, expect, it } from "vitest";
import type { RiskDetail } from "@disa/shared-types";
import { loadRiskGraph, RiskDetailFetcher } from "./loadRiskGraph";

const FIXTURE_DETAIL: RiskDetail = {
  id: "int-1",
  type: "interaction",
  severity: "severe",
  explanation: "Warfarin and Ibuprofen have a severe interaction.",
  path: {
    nodes: [
      { id: "drug-1", label: "Drug", name: "Warfarin" },
      { id: "drug-2", label: "Drug", name: "Ibuprofen" },
    ],
    edges: [{ type: "INTERACTS_WITH", fromId: "drug-1", toId: "drug-2", severity: "severe" }],
  },
};

class FakeRiskDetailFetcher implements RiskDetailFetcher {
  calls: { riskId: string; patientId: string }[] = [];
  constructor(private detail: RiskDetail = FIXTURE_DETAIL) {}
  async getRiskDetail(riskId: string, patientId: string): Promise<RiskDetail> {
    this.calls.push({ riskId, patientId });
    return this.detail;
  }
}

describe("loadRiskGraph use case", () => {
  it("fetches the risk detail and maps it into render-ready graph elements", async () => {
    const fetcher = new FakeRiskDetailFetcher();
    const result = await loadRiskGraph("int-1", "patient-1", { fetcher });

    expect(fetcher.calls).toEqual([{ riskId: "int-1", patientId: "patient-1" }]);
    expect(result.detail).toBe(FIXTURE_DETAIL);
    expect(result.elements.nodes).toHaveLength(2);
    expect(result.elements.edges).toHaveLength(1);
  });

  it("every returned node carries a type label — the assertion runs for real, not just in isolation", async () => {
    const fetcher = new FakeRiskDetailFetcher();
    const result = await loadRiskGraph("int-1", "patient-1", { fetcher });
    expect(result.elements.nodes.every((n) => n.data.typeLabel)).toBe(true);
  });

  it("propagates a fetcher error rather than swallowing it", async () => {
    const failingFetcher: RiskDetailFetcher = {
      async getRiskDetail() {
        throw new Error("network down");
      },
    };
    await expect(loadRiskGraph("int-1", "patient-1", { fetcher: failingFetcher })).rejects.toThrow("network down");
  });
});
