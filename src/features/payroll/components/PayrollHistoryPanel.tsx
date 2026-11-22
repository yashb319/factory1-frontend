"use client";

import { useState } from "react";
import { Archive, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/lib/hook";
import { useRuntimePermissions } from "@/features/partner-saas/runtime/permissions";

import {
  useGetPayrollHistoryByIdQuery,
  useGetPayrollHistoryQuery,
} from "../api/payrollHistoryApi";
import { getMonthName } from "../utils/payroll.utils";
import { PayrollHistoryImportDialog } from "./PayrollHistoryImportDialog";

const HISTORY_ROLES = new Set(["OWNER", "ADMIN"]);

export function PayrollHistoryPanel() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { can } = useRuntimePermissions();
  const allowed = Boolean(role && HISTORY_ROLES.has(role)) && can("GET", "/api/payroll/history");

  const [importOpen, setImportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError } = useGetPayrollHistoryQuery(undefined, { skip: !allowed });

  if (!allowed) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Historical payroll archive</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Read-only past payroll figures imported from spreadsheets. These are not payroll
              runs and are never recalculated or paid.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          disabled={!can("POST", "/api/payroll/history")}
          onClick={() => setImportOpen(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import Payroll History
        </Button>
      </div>

      {isError ? (
        <p role="alert" className="text-xs text-red-700">
          Payroll history could not be loaded.
        </p>
      ) : isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="text-xs text-muted-foreground">No historical payroll archived yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Period</th>
              <th className="py-1">Employees</th>
              <th className="py-1">Imported</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-1">
                  {getMonthName(item.month)} {item.year}
                </td>
                <td className="py-1">{item.employeeCount}</td>
                <td className="py-1">{new Date(item.importedAt).toLocaleString()}</td>
                <td className="py-1 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedId(item.id)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <PayrollHistoryImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={setSelectedId}
      />
      <PayrollHistoryDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function PayrollHistoryDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading, isError } = useGetPayrollHistoryByIdQuery(id ?? "", { skip: !id });
  const labels = Array.from(
    new Set((data?.rows ?? []).flatMap((row) => Object.keys(row.values)))
  );

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {data
              ? `Payroll history: ${getMonthName(data.summary.month)} ${data.summary.year}`
              : "Payroll history"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Read-only archive of source figures, exactly as imported. Not a payroll run.
        </p>
        {isError ? (
          <p role="alert" className="text-xs text-red-700">Could not load this archive.</p>
        ) : isLoading || !data ? (
          <p className="text-xs">Loading…</p>
        ) : (
          <div className="max-h-[65vh] overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  <th className="px-2 py-1 text-left">Row</th>
                  <th className="px-2 py-1 text-left">Employee Code</th>
                  {labels.map((label) => (
                    <th key={label} className="whitespace-nowrap px-2 py-1 text-right">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.employeeCode}`} className="border-t">
                    <td className="px-2 py-1">{row.rowNumber}</td>
                    <td className="px-2 py-1">{row.employeeCode}</td>
                    {labels.map((label) => (
                      <td key={label} className="px-2 py-1 text-right">
                        {row.values[label] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
