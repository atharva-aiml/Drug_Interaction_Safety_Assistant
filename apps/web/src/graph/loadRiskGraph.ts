import type { RiskDetail } from "@disa/shared-types";
import { assertNodesHaveTypeLabel, GraphElements, toGraphElements } from "./toGraphElements";

/**
 * Port: fetches a risk's full detail (explanation + path). The real
 * implementation wraps the already-real GET /risks/:id endpoint built in
 * V0.5 — no new backend endpoint is needed for graph visualization, since
 * the path payload it returns is exactly what this renders.
 */
export interface RiskDetailFetcher {
  getRiskDetail(riskId: string, patientId?: string): Promise<RiskDetail>;
}

export interface RiskGraph {
  detail: RiskDetail;
  elements: GraphElements;
}

/**
 * The "use case" for SCR-004: fetch a risk's real path, then map it to
 * render-ready graph elements, asserting the label rule holds before
 * returning anything to the UI.
 */
export async function loadRiskGraph(riskId: string, patientId: string | undefined, deps: { fetcher: RiskDetailFetcher }): Promise<RiskGraph> {
  const detail = await deps.fetcher.getRiskDetail(riskId, patientId);
  const elements = toGraphElements(detail.path);
  assertNodesHaveTypeLabel(elements);
  return { detail, elements };
}
