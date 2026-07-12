"use client";

import { useMemo, useState } from "react";
import { Banknote, CalendarPlus, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  useApprovePayrollMutation,
  useDeletePayrollMutation,
  useGetPayrollDashboardQuery,
  useGetPayrollRunsQuery,
  usePayPayrollMutation,
} from "@/features/payroll/api/payrollApi";

import { PayrollDashboardCards } from "@/features/payroll/components/PayrollDashboardCards";
import { PayrollDetailsDialog } from "@/features/payroll/components/PayrollDetailsDialog";
import { PayrollGenerateDialog } from "@/features/payroll/components/PayrollGenerateDialog";
import { PayrollListTable } from "@/features/payroll/components/PayrollListTable";
import { PayrollToolbar } from "@/features/payroll/components/PayrollToolbar";
import { PayrollConfirmDialog } from "@/features/payroll/components/PayrollConfirmDialog";
import { PayrollInsightsPanel } from "@/features/payroll/components/PayrollInsightsPanel";

import {
  PayrollSearchParams,
  PayrollStatus,
} from "@/features/payroll/types/payroll.types";

type ConfirmAction = "APPROVE" | "PAY" | "DELETE";

interface ConfirmState {
  open: boolean;
  action: ConfirmAction | null;
  payrollId: string | null;
}

export function PayrollPage() {
  const [page, setPage] = useState(0);
  const [month, setMonth] = useState<number | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const [status, setStatus] = useState<PayrollStatus | undefined>();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(
    null
  );

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    action: null,
    payrollId: null,
  });

  const queryParams: PayrollSearchParams = useMemo(
    () => ({
      page,
      size: 10,
      month,
      year,
      status,
      sortBy: "createdAt",
      sortDirection: "DESC",
    }),
    [page, month, year, status]
  );

  const { data: dashboard, isLoading: dashboardLoading } =
    useGetPayrollDashboardQuery();

  const { data: payrollRuns, isLoading: payrollLoading } =
    useGetPayrollRunsQuery(queryParams);

  const [approvePayroll, { isLoading: approving }] =
    useApprovePayrollMutation();

  const [payPayroll, { isLoading: paying }] = usePayPayrollMutation();

  const [deletePayroll, { isLoading: deleting }] =
    useDeletePayrollMutation();

  const resetFilters = () => {
    setMonth(undefined);
    setYear(undefined);
    setStatus(undefined);
    setPage(0);
  };

  const viewPayroll = (id: string) => {
    setSelectedPayrollId(id);
    setDetailsOpen(true);
  };

  const openConfirm = (action: ConfirmAction, payrollId: string) => {
    setConfirm({
      open: true,
      action,
      payrollId,
    });
  };

  const closeConfirm = () => {
    setConfirm({
      open: false,
      action: null,
      payrollId: null,
    });
  };

  const handleConfirm = async () => {
    if (!confirm.payrollId || !confirm.action) return;

    if (confirm.action === "APPROVE") {
      await approvePayroll(confirm.payrollId).unwrap();
    }

    if (confirm.action === "PAY") {
      await payPayroll(confirm.payrollId).unwrap();
    }

    if (confirm.action === "DELETE") {
      await deletePayroll(confirm.payrollId).unwrap();
    }

    closeConfirm();
  };

  const confirmContent = getConfirmContent(confirm.action);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Salary Operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Payroll
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate, approve, pay and audit monthly salary runs from one workspace.
          </p>
        </div>

        <div className="grid gap-2 rounded-lg border bg-white p-2 sm:grid-cols-3">
          {[
            {
              title: "Generate",
              description: "Create salary run after attendance is ready.",
              icon: CalendarPlus,
            },
            {
              title: "Approve",
              description: "Lock reviewed payroll before payment.",
              icon: ShieldCheck,
            },
            {
              title: "Pay",
              description: "Mark final salary payout as completed.",
              icon: WalletCards,
            },
          ].map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="flex items-start gap-3 rounded-md bg-slate-50 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="text-sm font-semibold text-slate-950">{step.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <PayrollInsightsPanel
        payrollRuns={payrollRuns?.content ?? []}
        loading={payrollLoading}
      />

      <PayrollDashboardCards
        data={dashboard}
        isLoading={dashboardLoading}
      />

      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Monthly salary run</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate only after attendance, salary structure and deductions are reviewed.
              </p>
            </div>
          </div>
          <Button onClick={() => setGenerateOpen(true)} className="md:w-auto">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Generate Payroll
          </Button>
        </div>
      </div>

      <PayrollToolbar
        month={month}
        year={year}
        status={status}
        onMonthChange={(value) => {
          setMonth(value);
          setPage(0);
        }}
        onYearChange={(value) => {
          setYear(value);
          setPage(0);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(0);
        }}
        onReset={resetFilters}
      />

      <PayrollListTable
        data={payrollRuns}
        isLoading={payrollLoading}
        page={page}
        onPageChange={setPage}
        onView={viewPayroll}
        onApprove={(id) => openConfirm("APPROVE", id)}
        onPay={(id) => openConfirm("PAY", id)}
        onDelete={(id) => openConfirm("DELETE", id)}
      />

      <PayrollGenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerated={viewPayroll}
      />

      <PayrollDetailsDialog
        payrollId={selectedPayrollId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <PayrollConfirmDialog
        open={confirm.open}
        title={confirmContent.title}
        description={confirmContent.description}
        confirmLabel={confirmContent.confirmLabel}
        destructive={confirm.action === "DELETE"}
        loading={approving || paying || deleting}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function getConfirmContent(action: ConfirmAction | null) {
  if (action === "APPROVE") {
    return {
      title: "Approve Payroll",
      description:
        "Once approved, this payroll can no longer be deleted. It can only be marked as paid.",
      confirmLabel: "Approve",
    };
  }

  if (action === "PAY") {
    return {
      title: "Mark Payroll as Paid",
      description:
        "This will mark the payroll as paid. Make sure salary payment has been completed.",
      confirmLabel: "Mark as Paid",
    };
  }

  if (action === "DELETE") {
    return {
      title: "Delete Payroll",
      description:
        "This will permanently delete this generated payroll run and all employee payroll items.",
      confirmLabel: "Delete",
    };
  }

  return {
    title: "",
    description: "",
    confirmLabel: "",
  };
}
