import { useState } from "react";
import type { Risk } from "@disa/shared-types";
import { sortBySeverityDesc } from "../risk/severityOrder";
import { useAutoHideScrollbar } from "../chat/useAutoHideScrollbar";
import { SeverityBadge } from "./SeverityBadge";
import { RiskTypeLabel } from "./RiskTypeLabel";
import { IconAngleRight, IconCode } from "./icons";

interface Props {
  /** Every risk flagged anywhere in the current session's messages, most recent first. */
  sessionRisks: Risk[];
}

const SEVERITY_COLOR: Record<Risk["severity"], string> = {
  minor: "var(--color-severity-minor)",
  moderate: "var(--color-severity-moderate)",
  severe: "var(--color-severity-severe)",
  contraindicated: "var(--color-severity-contraindicated)",
};

const COLLAPSED_KEY = "disa_risk_rail_collapsed";

/**
 * Build Plan V2.5 — third column, rendered only when the session has a
 * flagged risk (the caller conditions on `sessionRisks.length > 0`). Sits on
 * the same plain white canvas as the rest of the page; the top card's left
 * edge carries the severity color so the signal reads before anything else.
 *
 * Collapsible the same way the chat sidebar is (icon-only strip, persisted
 * choice, smooth width/opacity transition) — but always starts OPEN: since
 * this component only ever renders once a risk exists, defaulting the
 * collapsed flag to false means "open whenever a risk is found" for free,
 * unless the user previously chose to collapse it.
 */
export function ActiveRiskRail({ sessionRisks }: Props) {
  const railRef = useAutoHideScrollbar<HTMLElement>();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showQuery, setShowQuery] = useState(false);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const sorted = sortBySeverityDesc(sessionRisks);
  const activeRisk =
    sorted.find((risk) => risk.id === selectedRiskId) ?? sorted[0];
  if (!activeRisk) return null;

  function selectRisk(riskId: string) {
    setSelectedRiskId(riskId);
    setShowQuery(false);
  }

  function setCollapsedPersisted(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // localStorage can be unavailable (private browsing); the preference just won't persist.
    }
  }

  return (
    <aside className={`chat-risk-rail${collapsed ? " collapsed" : ""}`} ref={railRef}>
      <div className="chat-risk-rail-top">
        <div className="chat-risk-rail-label">Active risk</div>
        <button
          type="button"
          className="chat-risk-rail-collapse-btn"
          onClick={() => setCollapsedPersisted(!collapsed)}
          aria-label={collapsed ? "Expand active risk panel" : "Collapse active risk panel"}
          data-tooltip={collapsed ? "Expand" : "Collapse"}
          data-tooltip-pos="bottom"
        >
          <IconAngleRight size={14} />
        </button>
      </div>

      <span
        className="chat-risk-rail-collapsed-dot"
        style={{ background: SEVERITY_COLOR[activeRisk.severity] }}
        aria-hidden="true"
      />

      <div className="chat-risk-rail-content">
        <div
          key={activeRisk.id}
          className="chat-risk-rail-card chat-risk-rail-card-active"
          style={{ "--rail-accent": SEVERITY_COLOR[activeRisk.severity] } as React.CSSProperties}
        >
          <SeverityBadge severity={activeRisk.severity} />
          <div className="chat-risk-rail-pair">
            {activeRisk.drugsInvolved.map((d) => d.name).join(" ↔ ")}
          </div>
          <div className="chat-risk-rail-summary">{activeRisk.summary}</div>

          {activeRisk.cypher && (
            <div className="chat-risk-rail-cypher">
              <button
                type="button"
                className="chat-risk-rail-cypher-btn"
                onClick={() => setShowQuery((v) => !v)}
                aria-expanded={showQuery}
              >
                <IconCode size={13} />
                {showQuery ? "Hide Cypher query" : "View Cypher query"}
              </button>
              {showQuery && (
                <div className="chat-risk-rail-cypher-panel">
                  <div className="chat-risk-rail-cypher-label">{activeRisk.cypher.label}</div>
                  <pre className="chat-risk-rail-cypher-code">{activeRisk.cypher.query}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {sorted.length > 1 && (
          <>
            <div className="chat-risk-rail-label" style={{ marginTop: "var(--space-2)" }}>
              This session's risks
            </div>
            <div className="chat-risk-rail-list">
              {sorted.map((risk) => (
                <button
                  key={risk.id}
                  type="button"
                  className={`chat-risk-rail-list-item${risk.id === activeRisk.id ? " selected" : ""}`}
                  onClick={() => selectRisk(risk.id)}
                  aria-pressed={risk.id === activeRisk.id}
                  data-tooltip="Show as active risk"
                >
                  <span className="chat-risk-rail-dot" style={{ background: SEVERITY_COLOR[risk.severity] }} />
                  {risk.drugsInvolved.map((d) => d.name).join(" ↔ ")}, {risk.severity}
                  <RiskTypeLabel type={risk.type} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
