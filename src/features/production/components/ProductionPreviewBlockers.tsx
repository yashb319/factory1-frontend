import type { FlowBlocker } from "../types/productionFlow.types";

export function ProductionPreviewBlockers({ blockers }: { blockers: FlowBlocker[] }) {
  if (!blockers.length) return null;
  return <div role="alert" className="space-y-2 text-sm text-destructive">
    {blockers.map((blocker, index) => <p key={`${blocker.code}:${index}`}><strong>{blocker.code}: </strong>{blocker.message}{blocker.remediation ? ` ${blocker.remediation}` : ""}</p>)}
  </div>;
}
