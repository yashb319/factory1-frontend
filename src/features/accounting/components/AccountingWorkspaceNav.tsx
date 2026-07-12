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
    <div className="sticky top-0 z-10 -mx-1 flex gap-2 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur">
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
          >
            {workspace.label}
          </Button>
        );
      })}
    </div>
  );
}
