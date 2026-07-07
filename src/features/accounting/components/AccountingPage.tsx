"use client";

import { useState } from "react";
import {
  Download,
  Edit2,
  FileSpreadsheet,
  Landmark,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { exportGstReportCsv } from "@/features/billing/utils/gstReportExport";
import {
  useCreateAccountingVoucherMutation,
  useCreateAccountGroupMutation,
  useCreateAccountLedgerMutation,
  useDeleteAccountGroupMutation,
  useDeleteAccountLedgerMutation,
  useGetAccountingVouchersQuery,
  useGetAgingReportQuery,
  useGetAccountMastersQuery,
  useGetBalanceSheetQuery,
  useGetLedgerReportQuery,
  useGetProfitLossQuery,
  useGetTrialBalanceQuery,
  useLazyGetAccountingGstSummaryQuery,
  useUpdateAccountGroupMutation,
  useUpdateAccountLedgerMutation,
} from "../api/accountingApi";
import type {
  AccountGroup,
  AccountGroupType,
  AccountLedger,
  AgingReport,
  BalanceSheetRow,
  BalanceType,
  VoucherType,
} from "../types/accounting.types";
import { exportAgingCsv } from "../utils/agingExport";
import { exportBalanceSheetCsv } from "../utils/balanceSheetExport";
import { exportLedgerCsv } from "../utils/ledgerExport";
import { exportProfitLossCsv } from "../utils/profitLossExport";

const groupTypes: AccountGroupType[] = [
  "ASSET",
  "LIABILITY",
  "INCOME",
  "EXPENSE",
];

const balanceTypes: BalanceType[] = ["DR", "CR"];

const voucherTypes: VoucherType[] = [
  "PAYMENT",
  "RECEIPT",
  "CONTRA",
  "JOURNAL",
];

type VoucherLineDraft = {
  id: string;
  ledgerId: string;
  entryType: BalanceType;
  amount: string;
  description: string;
};

export function AccountingPage() {
  const [fromDate, setFromDate] = useState(
    () => currentQuarterRange().fromDate
  );
  const [toDate, setToDate] = useState(
    () => currentQuarterRange().toDate
  );
  const [agingAsOfDate, setAgingAsOfDate] = useState(() => todayDate());
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<AccountGroupType>("ASSET");
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);
  const [groupEditName, setGroupEditName] = useState("");
  const [groupEditType, setGroupEditType] = useState<AccountGroupType>("ASSET");
  const [deleteGroupTarget, setDeleteGroupTarget] =
    useState<AccountGroup | null>(null);
  const [ledgerName, setLedgerName] = useState("");
  const [ledgerGroupId, setLedgerGroupId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [balanceType, setBalanceType] = useState<BalanceType>("DR");
  const [editingLedger, setEditingLedger] = useState<AccountLedger | null>(null);
  const [ledgerEditName, setLedgerEditName] = useState("");
  const [ledgerEditGroupId, setLedgerEditGroupId] = useState("");
  const [ledgerEditOpeningBalance, setLedgerEditOpeningBalance] = useState("0");
  const [ledgerEditBalanceType, setLedgerEditBalanceType] =
    useState<BalanceType>("DR");
  const [deleteLedgerTarget, setDeleteLedgerTarget] =
    useState<AccountLedger | null>(null);
  const [voucherType, setVoucherType] = useState<VoucherType>("JOURNAL");
  const [voucherDate, setVoucherDate] = useState(() => todayDate());
  const [voucherNarration, setVoucherNarration] = useState("");
  const [voucherLines, setVoucherLines] = useState<VoucherLineDraft[]>(() => [
    newVoucherLine("DR"),
    newVoucherLine("CR"),
  ]);
  const range = { fromDate, toDate };
  const { data, isLoading, isFetching } = useGetLedgerReportQuery(range);
  const { data: trialBalance, isFetching: trialBalanceFetching } =
    useGetTrialBalanceQuery(range);
  const { data: profitLoss, isFetching: profitLossFetching } =
    useGetProfitLossQuery(range);
  const { data: balanceSheet, isFetching: balanceSheetFetching } =
    useGetBalanceSheetQuery(range);
  const { data: receivablesAging } = useGetAgingReportQuery({
    type: "SALES",
    asOfDate: agingAsOfDate,
  });
  const { data: payablesAging } = useGetAgingReportQuery({
    type: "PURCHASE",
    asOfDate: agingAsOfDate,
  });
  const { data: masters, isFetching: mastersFetching } =
    useGetAccountMastersQuery();
  const { data: vouchers } = useGetAccountingVouchersQuery();
  const [createVoucher, createVoucherState] =
    useCreateAccountingVoucherMutation();
  const [createGroup, createGroupState] = useCreateAccountGroupMutation();
  const [createLedger, createLedgerState] = useCreateAccountLedgerMutation();
  const [updateGroup, updateGroupState] = useUpdateAccountGroupMutation();
  const [updateLedger, updateLedgerState] = useUpdateAccountLedgerMutation();
  const [deleteGroup] = useDeleteAccountGroupMutation();
  const [deleteLedger] = useDeleteAccountLedgerMutation();
  const [getGstSummary, gstState] = useLazyGetAccountingGstSummaryQuery();
  const logDataJob = useLogDataJob();
  const voucherTotals = voucherLines.reduce(
    (totals, line) => {
      const amount = Number(line.amount || 0);
      if (line.entryType === "DR") {
        totals.debit += amount;
      } else {
        totals.credit += amount;
      }
      return totals;
    },
    { debit: 0, credit: 0 }
  );

  const submitGroup = async () => {
    if (!groupName.trim()) {
      toast.info("Enter an account group name");
      return;
    }

    try {
      await createGroup({
        name: groupName.trim(),
        groupType,
        affectsGrossProfit: groupType === "INCOME" || groupType === "EXPENSE",
      }).unwrap();
      toast.success("Account group created");
      resetGroupForm();
    } catch {
      toast.error("Could not create account group");
    }
  };

  const submitLedger = async () => {
    if (!ledgerName.trim() || !ledgerGroupId) {
      toast.info("Ledger name and group are required");
      return;
    }

    try {
      await createLedger({
        name: ledgerName.trim(),
        accountGroupId: ledgerGroupId,
        openingBalance: Number(openingBalance || 0),
        balanceType,
      }).unwrap();
      toast.success("Account ledger created");
      resetLedgerForm();
    } catch {
      toast.error("Could not create account ledger");
    }
  };

  const editGroup = (group: AccountGroup) => {
    setEditingGroup(group);
    setGroupEditName(group.name);
    setGroupEditType(group.groupType);
  };

  const submitGroupEdit = async () => {
    if (!editingGroup || !groupEditName.trim()) {
      toast.info("Enter an account group name");
      return;
    }

    try {
      await updateGroup({
        id: editingGroup.id,
        name: groupEditName.trim(),
        groupType: groupEditType,
        affectsGrossProfit:
          groupEditType === "INCOME" || groupEditType === "EXPENSE",
      }).unwrap();
      setEditingGroup(null);
      toast.success("Account group updated");
    } catch {
      toast.error("Could not update account group");
    }
  };

  const editLedger = (ledger: AccountLedger) => {
    setEditingLedger(ledger);
    setLedgerEditName(ledger.name);
    setLedgerEditGroupId(ledger.accountGroupId);
    setLedgerEditOpeningBalance(String(ledger.openingBalance ?? 0));
    setLedgerEditBalanceType(ledger.balanceType);
  };

  const submitLedgerEdit = async () => {
    if (!editingLedger || !ledgerEditName.trim() || !ledgerEditGroupId) {
      toast.info("Ledger name and group are required");
      return;
    }

    try {
      await updateLedger({
        id: editingLedger.id,
        name: ledgerEditName.trim(),
        accountGroupId: ledgerEditGroupId,
        openingBalance: Number(ledgerEditOpeningBalance || 0),
        balanceType: ledgerEditBalanceType,
      }).unwrap();
      setEditingLedger(null);
      toast.success("Account ledger updated");
    } catch {
      toast.error("Could not update account ledger");
    }
  };

  const resetGroupForm = () => {
    setGroupName("");
    setGroupType("ASSET");
  };

  const resetLedgerForm = () => {
    setLedgerName("");
    setLedgerGroupId("");
    setOpeningBalance("0");
    setBalanceType("DR");
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupTarget) {
      return;
    }

    try {
      await deleteGroup(deleteGroupTarget.id).unwrap();
      setDeleteGroupTarget(null);
      toast.success("Account group deleted");
    } catch {
      toast.error("Could not delete account group");
    }
  };

  const confirmDeleteLedger = async () => {
    if (!deleteLedgerTarget) {
      return;
    }

    try {
      await deleteLedger(deleteLedgerTarget.id).unwrap();
      setDeleteLedgerTarget(null);
      toast.success("Account ledger deleted or marked inactive");
    } catch {
      toast.error("Could not delete account ledger");
    }
  };

  const submitVoucher = async () => {
    const lines = voucherLines
      .filter((line) => line.ledgerId && Number(line.amount || 0) > 0)
      .map((line) => ({
        ledgerId: line.ledgerId,
        entryType: line.entryType,
        amount: Number(line.amount),
        description: line.description.trim() || null,
      }));

    if (lines.length < 2) {
      toast.info("Add at least two voucher lines");
      return;
    }

    if (Math.abs(voucherTotals.debit - voucherTotals.credit) > 0.009) {
      toast.error("Debit and credit totals must match");
      return;
    }

    try {
      await createVoucher({
        voucherType,
        voucherDate,
        narration: voucherNarration.trim() || null,
        lines,
      }).unwrap();
      setVoucherNarration("");
      setVoucherLines([newVoucherLine("DR"), newVoucherLine("CR")]);
      toast.success("Voucher posted");
    } catch {
      toast.error("Could not post voucher");
    }
  };

  const updateVoucherLine = (
    id: string,
    patch: Partial<VoucherLineDraft>
  ) => {
    setVoucherLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const exportLedger = () => {
    if (!data || !data.parties.length) {
      toast.info("No ledger entries to export");
      return;
    }

    const exported = exportLedgerCsv(data);

    void logDataJob({
      operation: "EXPORT",
      module: "BILLING",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: data.parties.length,
      successRows: data.parties.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
      notes: `Accounting ledger ${fromDate} to ${toDate}`,
    });

    toast.success("Ledger CSV exported successfully");
  };

  const exportGst = async () => {
    try {
      const report = await getGstSummary(range).unwrap();

      if (!report.rows.length) {
        toast.info("No posted bills found for GST summary");
        return;
      }

      const exported = exportGstReportCsv(report);

      void logDataJob({
        operation: "EXPORT",
        module: "BILLING",
        fileName: exported.fileName,
        status: "COMPLETED",
        progress: 100,
        totalRows: report.rows.length,
        successRows: report.rows.length,
        failedRows: 0,
        outputFileUrl: exported.outputFileUrl,
        notes: `Accounting GST summary ${fromDate} to ${toDate}`,
      });

      toast.success("GST summary exported successfully");
    } catch {
      toast.error("Could not export GST summary");
    }
  };

  const exportProfitLoss = () => {
    if (!profitLoss || !profitLoss.rows.length) {
      toast.info("No profit and loss rows to export");
      return;
    }

    const exported = exportProfitLossCsv(profitLoss);

    void logDataJob({
      operation: "EXPORT",
      module: "BILLING",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: profitLoss.rows.length,
      successRows: profitLoss.rows.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
      notes: `Profit and loss ${fromDate} to ${toDate}`,
    });

    toast.success("Profit & Loss CSV exported successfully");
  };

  const exportBalanceSheet = () => {
    if (!balanceSheet || (!balanceSheet.assets.length && !balanceSheet.liabilities.length)) {
      toast.info("No balance sheet rows to export");
      return;
    }

    const exported = exportBalanceSheetCsv(balanceSheet);

    void logDataJob({
      operation: "EXPORT",
      module: "BILLING",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: balanceSheet.assets.length + balanceSheet.liabilities.length,
      successRows: balanceSheet.assets.length + balanceSheet.liabilities.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
      notes: `Balance sheet ${fromDate} to ${toDate}`,
    });

    toast.success("Balance Sheet CSV exported successfully");
  };

  const exportAging = (report: AgingReport | undefined) => {
    if (!report || !report.rows.length) {
      toast.info("No aging rows to export");
      return;
    }

    const exported = exportAgingCsv(report);

    void logDataJob({
      operation: "EXPORT",
      module: "BILLING",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: report.rows.length,
      successRows: report.rows.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
      notes: `${report.type === "SALES" ? "Receivables" : "Payables"} aging ${report.asOfDate}`,
    });

    toast.success("Aging CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Accounting
          </h1>
          <p className="text-sm text-muted-foreground">
            Party ledgers, receivables, payables and GST summaries from posted bills.
          </p>
        </div>

        <div className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[150px_150px_auto_auto_auto_auto]">
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <Input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
          <Button
            variant="outline"
            onClick={exportLedger}
            disabled={!data?.parties.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Ledger CSV
          </Button>
          <Button
            onClick={exportGst}
            disabled={gstState.isFetching}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            GST CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportProfitLoss}
            disabled={!profitLoss?.rows.length}
          >
            <Download className="mr-2 h-4 w-4" />
            P&L CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportBalanceSheet}
            disabled={!balanceSheet?.assets.length && !balanceSheet?.liabilities.length}
          >
            <Download className="mr-2 h-4 w-4" />
            B/S CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Receivables"
          value={formatCurrency(data?.totalReceivables ?? 0)}
          loading={isLoading || isFetching}
        />
        <SummaryCard
          title="Payables"
          value={formatCurrency(data?.totalPayables ?? 0)}
          loading={isLoading || isFetching}
        />
        <SummaryCard
          title="Net Receivable"
          value={formatCurrency(data?.netReceivable ?? 0)}
          loading={isLoading || isFetching}
        />
      </div>

      <Card className="rounded-lg">
        <CardHeader className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <CardTitle>Aging Reports</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Outstanding receivables and payables by overdue bucket.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">As of</Label>
            <Input
              className="w-[160px]"
              type="date"
              value={agingAsOfDate}
              onChange={(event) => setAgingAsOfDate(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <AgingPanel
            title="Receivables"
            report={receivablesAging}
            onExport={() => exportAging(receivablesAging)}
          />
          <AgingPanel
            title="Payables"
            report={payablesAging}
            onExport={() => exportAging(payablesAging)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Account Masters</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Tally-style groups and ledgers for vouchers, GST and CA reports.
              </p>
            </div>
            <Badge variant="outline">
              {mastersFetching
                ? "Loading"
                : `${masters?.ledgers.length ?? 0} ledgers`}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Group</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-right">Ledgers</th>
                    <th className="p-3 text-left">Nature</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(masters?.groups ?? []).map((group) => (
                    <tr key={group.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{group.name}</div>
                        {group.systemGroup ? (
                          <div className="text-xs text-muted-foreground">
                            Default master
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3">{labelCase(group.groupType)}</td>
                      <td className="p-3 text-right">{group.ledgerCount}</td>
                      <td className="p-3">
                        {group.affectsGrossProfit
                          ? "Trading / gross profit"
                          : "Balance sheet / indirect"}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={group.systemGroup}
                            onClick={() => editGroup(group)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={group.systemGroup}
                            onClick={() => setDeleteGroupTarget(group)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(masters?.ledgers ?? []).map((ledger) => (
                <div
                  key={ledger.id}
                  className="rounded-md border bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{ledger.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {ledger.groupName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!ledger.active ? (
                        <Badge variant="outline">Inactive</Badge>
                      ) : null}
                      <Badge variant="secondary">{ledger.balanceType}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ledger.systemLedger}
                      onClick={() => editLedger(ledger)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ledger.systemLedger}
                      onClick={() => setDeleteLedgerTarget(ledger)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4" />
                New Group
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Group name</Label>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Example: Freight Charges"
                />
              </div>
              <div className="space-y-2">
                <Label>Group type</Label>
                <Select
                  value={groupType}
                  onValueChange={(value) =>
                    setGroupType(value as AccountGroupType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {labelCase(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={submitGroup}
                disabled={createGroupState.isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4" />
                New Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Ledger name</Label>
                <Input
                  value={ledgerName}
                  onChange={(event) => setLedgerName(event.target.value)}
                  placeholder="Example: Rahul Traders"
                />
              </div>
              <div className="space-y-2">
                <Label>Under group</Label>
                <Select
                  value={ledgerGroupId}
                  onValueChange={setLedgerGroupId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {(masters?.groups ?? []).map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <div className="space-y-2">
                  <Label>Opening balance</Label>
                  <Input
                    type="number"
                    value={openingBalance}
                    onChange={(event) =>
                      setOpeningBalance(event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={balanceType}
                    onValueChange={(value) =>
                      setBalanceType(value as BalanceType)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {balanceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={submitLedger}
                disabled={createLedgerState.isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Ledger
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Voucher Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[170px_170px_1fr]">
              <div className="space-y-2">
                <Label>Voucher type</Label>
                <Select
                  value={voucherType}
                  onValueChange={(value) =>
                    setVoucherType(value as VoucherType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voucherTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {labelCase(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={voucherDate}
                  onChange={(event) => setVoucherDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Narration</Label>
                <Input
                  value={voucherNarration}
                  onChange={(event) => setVoucherNarration(event.target.value)}
                  placeholder="Example: Bank payment for freight"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Ledger</th>
                    <th className="p-3 text-left">Dr/Cr</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {voucherLines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-3">
                        <Select
                          value={line.ledgerId}
                          onValueChange={(value) =>
                            updateVoucherLine(line.id, { ledgerId: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select ledger" />
                          </SelectTrigger>
                          <SelectContent>
                            {(masters?.ledgers ?? []).map((ledger) => (
                              <SelectItem key={ledger.id} value={ledger.id}>
                                {ledger.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Select
                          value={line.entryType}
                          onValueChange={(value) =>
                            updateVoucherLine(line.id, {
                              entryType: value as BalanceType,
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {balanceTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input
                          className="text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.amount}
                          onChange={(event) =>
                            updateVoucherLine(line.id, {
                              amount: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={line.description}
                          onChange={(event) =>
                            updateVoucherLine(line.id, {
                              description: event.target.value,
                            })
                          }
                          placeholder="Optional"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={voucherLines.length <= 2}
                          onClick={() =>
                            setVoucherLines((current) =>
                              current.filter((item) => item.id !== line.id)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-md border bg-muted/20 p-3 md:flex-row md:items-center">
              <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[320px]">
                <div>
                  <div className="text-muted-foreground">Debit</div>
                  <div className="font-semibold">
                    {formatCurrency(voucherTotals.debit)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Credit</div>
                  <div className="font-semibold">
                    {formatCurrency(voucherTotals.credit)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() =>
                    setVoucherLines((current) => [
                      ...current,
                      newVoucherLine("DR"),
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
                <Button
                  onClick={submitVoucher}
                  disabled={
                    createVoucherState.isLoading ||
                    Math.abs(voucherTotals.debit - voucherTotals.credit) > 0.009
                  }
                >
                  Post Voucher
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Recent Vouchers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(vouchers ?? []).slice(0, 8).map((voucher) => (
              <div key={voucher.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{voucher.voucherNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {labelCase(voucher.voucherType)} · {voucher.voucherDate}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {formatCurrency(voucher.totalDebit)}
                  </Badge>
                </div>
                {voucher.narration ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {voucher.narration}
                  </div>
                ) : null}
              </div>
            ))}
            {!vouchers?.length ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No accounting vouchers posted yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Profit & Loss</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Income and expenses from accounting voucher movement in this period.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <InlineMetric
              title="Trading Income"
              value={formatCurrency(profitLoss?.tradingIncome ?? 0)}
              loading={profitLossFetching}
            />
            <InlineMetric
              title="Trading Expense"
              value={formatCurrency(profitLoss?.tradingExpense ?? 0)}
              loading={profitLossFetching}
            />
            <InlineMetric
              title="Gross Profit"
              value={formatCurrency(profitLoss?.grossProfit ?? 0)}
              loading={profitLossFetching}
            />
            <InlineMetric
              title="Net Profit"
              value={formatCurrency(profitLoss?.netProfit ?? 0)}
              loading={profitLossFetching}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Ledger</th>
                    <th className="p-3 text-left">Group</th>
                    <th className="p-3 text-left">Section</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(profitLoss?.rows ?? []).map((row) => (
                    <tr key={row.ledgerId} className="border-t">
                      <td className="p-3 font-medium">{row.ledgerName}</td>
                      <td className="p-3">{row.groupName ?? "-"}</td>
                      <td className="p-3">{row.section}</td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                  {!profitLossFetching && !profitLoss?.rows.length ? (
                    <tr>
                      <td
                        className="p-8 text-center text-muted-foreground"
                        colSpan={4}
                      >
                        No income or expense movement found in this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between py-2">
                <span>Gross Profit</span>
                <span className="font-semibold">
                  {formatCurrency(profitLoss?.grossProfit ?? 0)}
                </span>
              </div>
              <div className="flex justify-between border-t py-2">
                <span>Indirect Income</span>
                <span>
                  {formatCurrency(profitLoss?.indirectIncome ?? 0)}
                </span>
              </div>
              <div className="flex justify-between border-t py-2">
                <span>Indirect Expense</span>
                <span>
                  {formatCurrency(profitLoss?.indirectExpense ?? 0)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>Net Profit</span>
                <span>{formatCurrency(profitLoss?.netProfit ?? 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Balance Sheet</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Assets, liabilities and current period profit as of the selected range.
            </p>
          </div>
          <Badge
            variant={
              Math.abs(balanceSheet?.difference ?? 0) > 0.009
                ? "destructive"
                : "outline"
            }
          >
            {balanceSheetFetching
              ? "Loading"
              : Math.abs(balanceSheet?.difference ?? 0) > 0.009
                ? "Check totals"
                : "Balanced"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <InlineMetric
              title="Assets"
              value={formatCurrency(balanceSheet?.totalAssets ?? 0)}
              loading={balanceSheetFetching}
            />
            <InlineMetric
              title="Liabilities"
              value={formatCurrency(balanceSheet?.totalLiabilities ?? 0)}
              loading={balanceSheetFetching}
            />
            <InlineMetric
              title="Current Profit"
              value={formatCurrency(balanceSheet?.netProfit ?? 0)}
              loading={balanceSheetFetching}
            />
            <InlineMetric
              title="Difference"
              value={formatCurrency(balanceSheet?.difference ?? 0)}
              loading={balanceSheetFetching}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BalanceSheetSide
              title="Assets"
              rows={balanceSheet?.assets ?? []}
              total={balanceSheet?.totalAssets ?? 0}
            />
            <BalanceSheetSide
              title="Liabilities"
              rows={balanceSheet?.liabilities ?? []}
              total={balanceSheet?.totalLiabilities ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Trial Balance</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Opening, period and closing balances from accounting vouchers.
            </p>
          </div>
          <Badge variant={isTrialBalanceMatched(trialBalance) ? "outline" : "destructive"}>
            {trialBalanceFetching
              ? "Loading"
              : isTrialBalanceMatched(trialBalance)
                ? "Balanced"
                : "Check totals"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Ledger</th>
                  <th className="p-3 text-left">Group</th>
                  <th className="p-3 text-right">Opening Dr</th>
                  <th className="p-3 text-right">Opening Cr</th>
                  <th className="p-3 text-right">Period Dr</th>
                  <th className="p-3 text-right">Period Cr</th>
                  <th className="p-3 text-right">Closing Dr</th>
                  <th className="p-3 text-right">Closing Cr</th>
                </tr>
              </thead>
              <tbody>
                {(trialBalance?.rows ?? []).map((row) => (
                  <tr key={row.ledgerId} className="border-t">
                    <td className="p-3 font-medium">{row.ledgerName}</td>
                    <td className="p-3">{row.groupName ?? "-"}</td>
                    <td className="p-3 text-right">
                      {formatCurrency(row.openingDebit)}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(row.openingCredit)}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(row.periodDebit)}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(row.periodCredit)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatCurrency(row.closingDebit)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatCurrency(row.closingCredit)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted font-semibold">
                  <td className="p-3" colSpan={2}>
                    Total
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(trialBalance?.totalOpeningDebit ?? 0)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(trialBalance?.totalOpeningCredit ?? 0)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(trialBalance?.totalPeriodDebit ?? 0)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(trialBalance?.totalPeriodCredit ?? 0)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(trialBalance?.totalClosingDebit ?? 0)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(trialBalance?.totalClosingCredit ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Account Ledgers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Party</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">GST</th>
                  <th className="p-3 text-right">Bills</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">GST Amount</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {(data?.parties ?? []).map((party) => (
                  <tr
                    key={`${party.type}-${party.partyName}-${party.partyGstNumber ?? ""}`}
                    className="border-t"
                  >
                    <td className="p-3 font-medium">{party.partyName}</td>
                    <td className="p-3">{party.type}</td>
                    <td className="p-3">{party.partyGstNumber || "-"}</td>
                    <td className="p-3 text-right">{party.billCount}</td>
                    <td className="p-3 text-right">
                      {formatCurrency(party.taxableAmount)}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(party.gstAmount)}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(party.grandTotal)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatCurrency(party.outstandingAmount)}
                    </td>
                  </tr>
                ))}

                {!isLoading && !data?.parties.length ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No posted bills found in this period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGroup(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account Group</DialogTitle>
            <DialogDescription>
              Update the group name and accounting nature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group name</Label>
              <Input
                value={groupEditName}
                onChange={(event) => setGroupEditName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Group type</Label>
              <Select
                value={groupEditType}
                onValueChange={(value) =>
                  setGroupEditType(value as AccountGroupType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {labelCase(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitGroupEdit}
              disabled={updateGroupState.isLoading}
            >
              Save Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingLedger)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLedger(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Account Ledger</DialogTitle>
            <DialogDescription>
              Update ledger grouping and opening balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ledger name</Label>
              <Input
                value={ledgerEditName}
                onChange={(event) => setLedgerEditName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Under group</Label>
              <Select
                value={ledgerEditGroupId}
                onValueChange={setLedgerEditGroupId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {(masters?.groups ?? []).map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_96px] gap-2">
              <div className="space-y-2">
                <Label>Opening balance</Label>
                <Input
                  type="number"
                  value={ledgerEditOpeningBalance}
                  onChange={(event) =>
                    setLedgerEditOpeningBalance(event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={ledgerEditBalanceType}
                  onValueChange={(value) =>
                    setLedgerEditBalanceType(value as BalanceType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {balanceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLedger(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitLedgerEdit}
              disabled={updateLedgerState.isLoading}
            >
              Save Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteGroupTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteGroupTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {deleteGroupTarget?.name}. It only works when
              the group has no ledgers and no child groups.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup}>
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteLedgerTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteLedgerTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account ledger?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {deleteLedgerTarget?.name}. If the ledger has
              voucher history, it will be marked inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLedger}>
              Delete Ledger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">
          {loading ? "..." : value}
        </div>
      </CardContent>
    </Card>
  );
}

function InlineMetric({
  title,
  value,
  loading,
}: {
  title: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold">
        {loading ? "..." : value}
      </div>
    </div>
  );
}

function BalanceSheetSide({
  title,
  rows,
  total,
}: {
  title: string;
  rows: BalanceSheetRow[];
  total: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between bg-muted px-3 py-2 text-sm font-semibold">
        <span>{title}</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-t bg-muted/50">
            <th className="p-3 text-left">Ledger</th>
            <th className="p-3 text-left">Group</th>
            <th className="p-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${title}-${row.ledgerId ?? row.ledgerName}`}
              className="border-t"
            >
              <td className="p-3 font-medium">{row.ledgerName}</td>
              <td className="p-3">{row.groupName ?? "-"}</td>
              <td className="p-3 text-right font-semibold">
                {formatCurrency(row.amount)}
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr className="border-t">
              <td
                colSpan={3}
                className="p-6 text-center text-muted-foreground"
              >
                No rows found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function AgingPanel({
  title,
  report,
  onExport,
}: {
  title: string;
  report: AgingReport | undefined;
  onExport: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between gap-3 bg-muted px-3 py-2">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">
            Total {formatCurrency(report?.totalOutstanding ?? 0)}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          disabled={!report?.rows.length}
        >
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      <div className="grid grid-cols-5 border-t text-center text-xs">
        <AgingBucket label="Current" value={report?.currentAmount ?? 0} />
        <AgingBucket label="1-30" value={report?.days1To30Amount ?? 0} />
        <AgingBucket label="31-60" value={report?.days31To60Amount ?? 0} />
        <AgingBucket label="61-90" value={report?.days61To90Amount ?? 0} />
        <AgingBucket label="90+" value={report?.over90Amount ?? 0} />
      </div>

      <div className="max-h-[320px] overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Bill</th>
              <th className="p-3 text-left">Party</th>
              <th className="p-3 text-left">Due</th>
              <th className="p-3 text-right">Days</th>
              <th className="p-3 text-left">Bucket</th>
              <th className="p-3 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {(report?.rows ?? []).map((row) => (
              <tr key={row.billId} className="border-t">
                <td className="p-3 font-medium">{row.billNumber}</td>
                <td className="p-3">{row.partyName}</td>
                <td className="p-3">{row.dueDate ?? row.billDate}</td>
                <td className="p-3 text-right">{row.daysOverdue}</td>
                <td className="p-3">{row.bucket}</td>
                <td className="p-3 text-right font-semibold">
                  {formatCurrency(row.outstandingAmount)}
                </td>
              </tr>
            ))}
            {!report?.rows.length ? (
              <tr className="border-t">
                <td
                  className="p-6 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No outstanding bills found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgingBucket({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border-r p-2 last:border-r-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{formatCurrency(value)}</div>
    </div>
  );
}

function currentQuarterRange() {
  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const from = new Date(now.getFullYear(), quarterStartMonth, 1);
  const to = new Date(now.getFullYear(), quarterStartMonth + 3, 0);

  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

function todayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function newVoucherLine(entryType: BalanceType): VoucherLineDraft {
  return {
    id: crypto.randomUUID(),
    ledgerId: "",
    entryType,
    amount: "",
    description: "",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function labelCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isTrialBalanceMatched(
  trialBalance:
    | {
        totalClosingDebit: number;
        totalClosingCredit: number;
      }
    | undefined
) {
  if (!trialBalance) {
    return true;
  }

  return (
    Math.abs(trialBalance.totalClosingDebit - trialBalance.totalClosingCredit) <=
    0.009
  );
}
