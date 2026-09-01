import * as api from "../api";
import { RiskDetailFetcher } from "./loadRiskGraph";

/**
 * Real implementation of RiskDetailFetcher — wraps the already-real
 * GET /risks/:id endpoint (built and wired to Neo4j in V0.5). No new
 * backend endpoint for graph visualization; this just reuses it.
 */
export class ApiRiskDetailFetcher implements RiskDetailFetcher {
  constructor(private token: string) {}

  getRiskDetail(riskId: string, patientId?: string) {
    return api.getRiskDetail(riskId, patientId, this.token);
  }
}
