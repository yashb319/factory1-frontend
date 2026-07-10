"use client";

import { useMemo, useState } from "react";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payroll
        </h1>
        <p className="text-sm text-slate-500">
          Generate, approve, pay and export monthly salary runs.
        </p>
      </div>

      <PayrollDashboardCards
        data={dashboard}
        isLoading={dashboardLoading}
      />

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
        onGenerate={() => setGenerateOpen(true)}
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
