import { Button } from "@/components/ui/button";

export type AccountingWorkspace =
  | "OVERVIEW"
  | "MASTERS"
  | "VOUCHERS"
  | "CASH_BANK"
  | "TAXES"
  | "REPORTS";

const workspaces = [
  { id: "OVERVIEW", label: "Overview" },
  { id: "MASTERS", label: "Masters" },
  { id: "VOUCHERS", label: "Vouchers" },
  { id: "CASH_BANK", label: "Cash/Bank" },
  { id: "TAXES", label: "Taxes" },
  { id: "REPORTS", label: "Reports" },
] satisfies Array<{ id: AccountingWorkspace; label: string }>;

export function AccountingWorkspaceNav({
  value,
  onChange,
  disabledReasons = {},
}: {
  value: AccountingWorkspace;
  onChange: (workspace: AccountingWorkspace) => void;
  disabledReasons?: Partial<Record<AccountingWorkspace, string>>;
}) {
  return (
    <div className="sticky top-12 z-10 -mx-1 flex gap-1 overflow-x-auto border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-1 py-1">
      {workspaces.map((workspace) => {
        const disabledReason = disabledReasons[workspace.id];

        return (
          <Button
            key={workspace.id}
            type="button"
            variant={value === workspace.id ? "default" : "outline"}
            size="sm"
            disabled={Boolean(disabledReason)}
            title={disabledReason}
            onClick={() => onChange(workspace.id)}
            className={
              value === workspace.id
                ? "h-7 rounded-md bg-[var(--factory1-primary)] px-2 text-xs text-white"
                : "h-7 rounded-md border-[var(--factory1-border)] bg-white px-2 text-xs text-[var(--factory1-text-secondary)]"
            }
          >
            {workspace.label}
          </Button>
        );
      })}
    </div>
  );
}
