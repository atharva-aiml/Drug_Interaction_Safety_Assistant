import type { RiskType } from "@disa/shared-types";

const LABELS: Record<RiskType, string> = {
  interaction: "Interaction",
  allergy: "Allergy",
  contraindication: "Contraindication",
};

export function RiskTypeLabel({ type }: { type: RiskType }) {
  return <span className="badge badge-outline">{LABELS[type]}</span>;
}
