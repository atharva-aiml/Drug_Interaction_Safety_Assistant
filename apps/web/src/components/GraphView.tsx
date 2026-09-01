import cytoscape, { Core } from "cytoscape";
import { useEffect, useRef, useState } from "react";
import { ApiRiskDetailFetcher } from "../graph/apiRiskDetailFetcher";
import { loadRiskGraph, RiskGraph } from "../graph/loadRiskGraph";
import { IconChevronLeft } from "./icons";

interface Props {
  riskId: string;
  patientId?: string;
  token: string;
  onBack: () => void;
}

interface SelectedNode {
  id: string;
  typeLabel: string;
  displayLabel: string;
}

export function GraphView({ riskId, patientId, token, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [graph, setGraph] = useState<RiskGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedNode | null>(null);

  useEffect(() => {
    setGraph(null);
    setError(null);
    setSelected(null);
    const fetcher = new ApiRiskDetailFetcher(token);
    loadRiskGraph(riskId, patientId, { fetcher })
      .then(setGraph)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load graph."));
  }, [riskId, patientId, token]);

  useEffect(() => {
    if (!graph || !containerRef.current) return;

    // Hex literals below are intentional, not a Design System violation: Cytoscape
    // renders to <canvas> via its own style engine, which cannot resolve CSS custom
    // properties (var(...) has no meaning outside the DOM/CSSOM). Values must be kept
    // in sync with styles.css's tokens by hand — updated for the Bold Modern palette
    // against --color-text-primary/-secondary, --color-border-strong, --color-bg-surface,
    // --color-text-inverse.
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graph.elements.nodes, ...graph.elements.edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(colorToken)",
            label: "data(displayLabel)",
            color: "#0B1220", // --color-text-primary
            "font-size": 11,
            "font-family": "Sora, sans-serif",
            "text-valign": "bottom",
            "text-margin-y": 6,
            width: 38,
            height: 38,
            "border-width": 3,
            "border-color": "#FFFFFF", // --color-text-inverse
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#C7CCE0", // --color-border-strong, de-emphasized lines
            "target-arrow-color": "#C7CCE0",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(edgeLabel)",
            "font-size": 9,
            "font-family": "Space Mono, monospace",
            color: "#5A6479", // --color-text-secondary
            "text-background-color": "#FFFFFF", // --color-bg-surface
            "text-background-opacity": 1,
          },
        },
      ],
      layout: { name: "breadthfirst", directed: true, spacingFactor: 1.4 },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cy.on("tap", "node", (evt) => {
      const data = evt.target.data();
      setSelected({ id: data.id, typeLabel: data.typeLabel, displayLabel: data.displayLabel });
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Graph view</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            <IconChevronLeft size={13} /> Back to chat
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!error && !graph && <div className="loading-panel"><span className="spinner" /> Loading graph…</div>}

      {graph && (
        <div className="card">
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
            {graph.detail.explanation}
          </p>
          <div
            ref={containerRef}
            style={{
              width: "100%",
              height: 420,
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg-surface)",
            }}
          />
          <div style={{ minHeight: 40, marginTop: "var(--space-3)" }}>
            {selected ? (
              <div className="card card-sunken">
                <strong>{selected.typeLabel}:</strong> {selected.displayLabel}
                <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                  {" "}
                  (id: {selected.id})
                </span>
              </div>
            ) : (
              <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                Click a node to see its attributes. Scroll to zoom, drag to pan.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
