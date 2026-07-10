"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  Edit2,
  FileSpreadsheet,
  Keyboard,
  Landmark,
  Plus,
  Printer,
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
import { toCsv } from "@/features/import-export/utils/csv";
import { downloadCsv } from "@/features/import-export/utils/localExportFiles";
import { exportGstReportCsv } from "@/features/billing/utils/gstReportExport";
import {
  useCancelAccountingVoucherMutation,
  useCreateAccountingVoucherMutation,
  useCreateAccountGroupMutation,
  useCreateAccountLedgerMutation,
  useDeleteAccountGroupMutation,
  useDeleteAccountLedgerMutation,
  useGetAccountingGstSummaryQuery,
  useGetAccountingVouchersQuery,
  useGetAgingReportQuery,
  useGetAccountMastersQuery,
  useGetBalanceSheetQuery,
  useGetLedgerReportQuery,
  useGetProfitLossQuery,
  useGetTrialBalanceQuery,
  useLazyGetAccountingGstSummaryQuery,
  useUpdateAccountingVoucherMutation,
  useUpdateAccountGroupMutation,
  useUpdateAccountLedgerMutation,
} from "../api/accountingApi";
import type {
  AccountGroup,
  AccountGroupType,
  AccountLedger,
  AccountingVoucher,
  AgingReport,
  BalanceSheetRow,
  BalanceType,
  TrialBalance,
  VoucherType,
} from "../types/accounting.types";
import { exportAgingCsv } from "../utils/agingExport";
import { exportBalanceSheetCsv } from "../utils/balanceSheetExport";
import { exportDayBookCsv } from "../utils/dayBookExport";
import { exportLedgerCsv } from "../utils/ledgerExport";
import { exportProfitLossCsv } from "../utils/profitLossExport";
import { formatCurrency, labelCase } from "../utils/accountingFormat";
import {
  AccountingWorkspaceNav,
  type AccountingWorkspace,
} from "./AccountingWorkspaceNav";
import { CashBankBook } from "./CashBankBook";
import {
  LedgerDrilldownDialog,
  type LedgerDrilldownRow,
  type SelectedLedger,
} from "./LedgerDrilldownDialog";

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

type DayBookFilter = VoucherType | "ALL";

export function AccountingPage() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(
    () => currentQuarterRange().fromDate
  );
  const [toDate, setToDate] = useState(
    () => currentQuarterRange().toDate
  );
  const [dayBookFilter, setDayBookFilter] = useState<DayBookFilter>("ALL");
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
  const [selectedLedger, setSelectedLedger] = useState<SelectedLedger | null>(
    null
  );
  const [workspace, setWorkspace] =
    useState<AccountingWorkspace>("OVERVIEW");
  const [voucherType, setVoucherType] = useState<VoucherType>("JOURNAL");
  const [voucherDate, setVoucherDate] = useState(() => todayDate());
  const [voucherNarration, setVoucherNarration] = useState("");
  const [voucherLines, setVoucherLines] = useState<VoucherLineDraft[]>(() => [
    newVoucherLine("DR"),
    newVoucherLine("CR"),
  ]);
  const [editingVoucher, setEditingVoucher] =
    useState<AccountingVoucher | null>(null);
  const [cancelVoucherTarget, setCancelVoucherTarget] =
    useState<AccountingVoucher | null>(null);
  const [cancelVoucherReason, setCancelVoucherReason] = useState("");
  const range = { fromDate, toDate };
  const { data, isLoading, isFetching } = useGetLedgerReportQuery(range);
  const { data: trialBalance, isFetching: trialBalanceFetching } =
    useGetTrialBalanceQuery(range);
  const { data: profitLoss, isFetching: profitLossFetching } =
    useGetProfitLossQuery(range);
  const { data: balanceSheet, isFetching: balanceSheetFetching } =
    useGetBalanceSheetQuery(range);
  const { data: gstSummary, isFetching: gstSummaryFetching } =
    useGetAccountingGstSummaryQuery(range);
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
  const { data: vouchers, isFetching: vouchersFetching } =
    useGetAccountingVouchersQuery(range);
  const [createVoucher, createVoucherState] =
    useCreateAccountingVoucherMutation();
  const [updateVoucher, updateVoucherState] =
    useUpdateAccountingVoucherMutation();
  const [cancelVoucher, cancelVoucherState] =
    useCancelAccountingVoucherMutation();
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
  const filteredVouchers = (vouchers ?? []).filter((voucher) =>
    dayBookFilter === "ALL" ? true : voucher.voucherType === dayBookFilter
  );
  const dayBookSummary = summarizeVouchers(filteredVouchers);
  const ledgerDrilldownRows = selectedLedger
    ? ledgerVoucherLines(vouchers ?? [], selectedLedger.id)
    : [];
  const ledgerDrilldownTotals = summarizeLedgerDrilldown(ledgerDrilldownRows);
  const monthlySummary = summarizeMonthlyVouchers(vouchers ?? []);
  const ledgerMonthlySummary = summarizeLedgerMonthly(vouchers ?? []);
  const groupSummary = summarizeTrialBalanceByGroup(trialBalance?.rows ?? []);

  useEffect(() => {
    const handleVoucherShortcut = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("role") === "combobox";

      if (isTextInput && !event.altKey && !event.shiftKey) {
        return;
      }

      const nextType = voucherTypeFromShortcut(event);
      if (!nextType) {
        return;
      }

      event.preventDefault();
      setWorkspace("VOUCHERS");
      setVoucherType(nextType);
      toast.info(`${labelCase(nextType)} voucher selected`);
    };

    window.addEventListener("keydown", handleVoucherShortcut);
    return () => window.removeEventListener("keydown", handleVoucherShortcut);
  }, []);

  useEffect(() => {
    function handleAccountingShortcut(event: Event) {
      const shortcutEvent =
        event as CustomEvent<{
          key?: string;
        }>;

      if (shortcutEvent.detail?.key) {
        handleAccountingShortcutKey(shortcutEvent.detail.key);
      }
    }

    window.addEventListener(
      "factory1:accounting-shortcut",
      handleAccountingShortcut
    );

    return () =>
      window.removeEventListener(
        "factory1:accounting-shortcut",
        handleAccountingShortcut
      );
  });

  function selectVoucherType(nextType: VoucherType) {
    setWorkspace("VOUCHERS");
    setVoucherType(nextType);
    toast.info(`${labelCase(nextType)} voucher selected`);
  }

  function handleAccountingShortcutKey(key: string) {
    if (key === "F2") {
      document.getElementById("accounting-from-date")?.focus();
      return;
    }

    if (key === "F3") {
      setWorkspace("MASTERS");
      return;
    }

    if (key === "F4") {
      selectVoucherType("CONTRA");
      return;
    }

    if (key === "F5") {
      selectVoucherType("PAYMENT");
      return;
    }

    if (key === "F6") {
      selectVoucherType("RECEIPT");
      return;
    }

    if (key === "F7") {
      selectVoucherType("JOURNAL");
      return;
    }

    if (key === "F8") {
      router.push("/billing?type=SALES");
      return;
    }

    if (key === "F9") {
      router.push("/billing?type=PURCHASE");
      return;
    }

    if (key === "F10") {
      setWorkspace("CASH_BANK");
      return;
    }

    if (key === "F11") {
      setWorkspace("REPORTS");
      return;
    }

    if (key === "F12") {
      router.push("/organization-settings");
    }
  }

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

  const applyPeriod = (period: "TODAY" | "MONTH" | "QUARTER" | "FY") => {
    const nextRange = periodRange(period);
    setFromDate(nextRange.fromDate);
    setToDate(nextRange.toDate);
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

    const payload = {
      voucherType,
      voucherDate,
      narration: voucherNarration.trim() || null,
      lines,
    };

    try {
      if (editingVoucher) {
        await updateVoucher({
          id: editingVoucher.id,
          ...payload,
        }).unwrap();
        toast.success("Voucher updated");
      } else {
        await createVoucher(payload).unwrap();
        toast.success("Voucher posted");
      }
      resetVoucherForm();
    } catch {
      toast.error(editingVoucher ? "Could not update voucher" : "Could not post voucher");
    }
  };

  const resetVoucherForm = () => {
    setEditingVoucher(null);
    setVoucherType("JOURNAL");
    setVoucherDate(todayDate());
    setVoucherNarration("");
    setVoucherLines([newVoucherLine("DR"), newVoucherLine("CR")]);
  };

  const updateVoucherLine = (
    id: string,
    patch: Partial<VoucherLineDraft>
  ) => {
    setVoucherLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const copyVoucherToEntry = (voucher: AccountingVoucher) => {
    setEditingVoucher(null);
    setVoucherType(voucher.voucherType);
    setVoucherDate(todayDate());
    setVoucherNarration(
      voucher.narration
        ? `${voucher.narration} (copy of ${voucher.voucherNumber})`
        : `Copy of ${voucher.voucherNumber}`
    );
    setVoucherLines(
      voucher.lines.map((line) => ({
        id: crypto.randomUUID(),
        ledgerId: line.ledgerId,
        entryType: line.entryType,
        amount: String(line.amount ?? ""),
        description: line.description ?? "",
      }))
    );
    toast.success(`${voucher.voucherNumber} copied to voucher entry`);
  };

  const editVoucherInEntry = (voucher: AccountingVoucher) => {
    if (voucher.sourceType) {
      toast.info("Bill generated vouchers are edited from Billing");
      return;
    }

    setEditingVoucher(voucher);
    setWorkspace("VOUCHERS");
    setVoucherType(voucher.voucherType);
    setVoucherDate(voucher.voucherDate);
    setVoucherNarration(voucher.narration ?? "");
    setVoucherLines(
      voucher.lines.map((line) => ({
        id: crypto.randomUUID(),
        ledgerId: line.ledgerId,
        entryType: line.entryType,
        amount: String(line.amount ?? ""),
        description: line.description ?? "",
      }))
    );
  };

  const confirmCancelVoucher = async () => {
    if (!cancelVoucherTarget) {
      return;
    }

    try {
      await cancelVoucher({
        id: cancelVoucherTarget.id,
        reason: cancelVoucherReason.trim() || null,
      }).unwrap();
      setCancelVoucherTarget(null);
      setCancelVoucherReason("");
      toast.success("Voucher cancelled");
    } catch {
      toast.error("Could not cancel voucher");
    }
  };

  const autoBalanceVoucher = () => {
    if (!voucherLines.length) {
      return;
    }

    const difference = Number((voucherTotals.debit - voucherTotals.credit).toFixed(2));
    if (Math.abs(difference) <= 0.009) {
      toast.info("Voucher is already balanced");
      return;
    }

    const lastLine = voucherLines[voucherLines.length - 1];
    const nextEntryType: BalanceType = difference > 0 ? "CR" : "DR";
    updateVoucherLine(lastLine.id, {
      entryType: nextEntryType,
      amount: String(Math.abs(difference)),
    });
    toast.success("Last line auto-balanced");
  };

  const openLedgerDrilldown = (ledger: SelectedLedger) => {
    setSelectedLedger(ledger);
  };

  const exportLedgerDrilldown = () => {
    if (!selectedLedger || !ledgerDrilldownRows.length) {
      toast.info("No ledger voucher lines to export");
      return;
    }

    const content = toCsv([
      [
        "Voucher Date",
        "Voucher Number",
        "Voucher Type",
        "Ledger",
        "Dr/Cr",
        "Debit",
        "Credit",
        "Narration",
        "Line Description",
      ],
      ...ledgerDrilldownRows.map((row) => [
        row.voucherDate,
        row.voucherNumber,
        labelCase(row.voucherType),
        row.ledgerName,
        row.entryType,
        row.debit,
        row.credit,
        row.narration ?? "",
        row.description ?? "",
      ]),
    ]);

    downloadCsv({
      fileName: `ledger-drilldown-${selectedLedger.name}-${fromDate}-to-${toDate}.csv`,
      content,
    });
    toast.success("Ledger drill-down CSV downloaded");
  };

  const printVoucher = (voucher: AccountingVoucher) => {
    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) {
      toast.error("Could not open print window");
      return;
    }

    const rows = voucher.lines
      .map(
        (line) => `
          <tr>
            <td>${escapeHtml(line.ledgerName ?? "Ledger")}</td>
            <td>${line.entryType}</td>
            <td class="num">${formatCurrency(line.amount)}</td>
            <td>${escapeHtml(line.description ?? "")}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${voucher.voucherNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .meta { color: #4b5563; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
            .num { text-align: right; }
            .total { margin-top: 16px; text-align: right; font-weight: 700; }
            .narration { margin-top: 16px; color: #374151; }
          </style>
        </head>
        <body>
          <h1>Accounting Voucher</h1>
          <div class="meta">
            <strong>${voucher.voucherNumber}</strong> · ${labelCase(voucher.voucherType)} · ${voucher.voucherDate}
          </div>
          <table>
            <thead>
              <tr>
                <th>Ledger</th>
                <th>Dr/Cr</th>
                <th class="num">Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">
            Debit ${formatCurrency(voucher.totalDebit)} · Credit ${formatCurrency(voucher.totalCredit)}
          </div>
          ${voucher.narration ? `<div class="narration">Narration: ${escapeHtml(voucher.narration)}</div>` : ""}
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  const exportGstr1 = () => {
    const rows = (gstSummary?.rows ?? []).filter((row) => row.type === "SALES");
    if (!rows.length) {
      toast.info("No sales vouchers found for GSTR-1");
      return;
    }

    const content = toCsv([
      [
        "Invoice Number",
        "Invoice Date",
        "Customer",
        "GSTIN",
        "Taxable Value",
        "CGST",
        "SGST",
        "IGST",
        "Invoice Value",
      ],
      ...rows.map((row) => [
        row.billNumber,
        row.billDate,
        row.partyName,
        row.partyGstNumber ?? "",
        row.taxableAmount,
        row.cgstAmount,
        row.sgstAmount,
        row.igstAmount,
        row.grandTotal,
      ]),
    ]);

    downloadCsv({
      fileName: `gstr-1-sales-${fromDate}-to-${toDate}.csv`,
      content,
    });
    toast.success("GSTR-1 sales register downloaded");
  };

  const exportGstr3b = () => {
    if (!gstSummary) {
      toast.info("GST summary is still loading");
      return;
    }

    const content = toCsv([
      ["GSTR-3B Style Summary", `${fromDate} to ${toDate}`],
      [],
      ["Section", "Taxable", "CGST", "SGST", "IGST", "Total GST"],
      [
        "Outward taxable supplies",
        gstSummary.salesTaxableAmount,
        gstSummary.salesCgstAmount,
        gstSummary.salesSgstAmount,
        gstSummary.salesIgstAmount,
        gstSummary.salesCgstAmount + gstSummary.salesSgstAmount + gstSummary.salesIgstAmount,
      ],
      [
        "Input tax credit",
        gstSummary.purchaseTaxableAmount,
        gstSummary.purchaseCgstAmount,
        gstSummary.purchaseSgstAmount,
        gstSummary.purchaseIgstAmount,
        gstSummary.purchaseCgstAmount + gstSummary.purchaseSgstAmount + gstSummary.purchaseIgstAmount,
      ],
      ["Net GST Payable", "", "", "", "", gstSummary.netGstPayable],
    ]);

    downloadCsv({
      fileName: `gstr-3b-summary-${fromDate}-to-${toDate}.csv`,
      content,
    });
    toast.success("GSTR-3B style summary downloaded");
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

  const exportTrialBalance = () => {
    if (!trialBalance?.rows.length) {
      toast.info("No Trial Balance rows to export");
      return;
    }

    const content = toCsv([
      [
        "Ledger",
        "Group",
        "Opening Dr",
        "Opening Cr",
        "Period Dr",
        "Period Cr",
        "Closing Dr",
        "Closing Cr",
      ],
      ...trialBalance.rows.map((row) => [
        row.ledgerName,
        row.groupName ?? "",
        row.openingDebit,
        row.openingCredit,
        row.periodDebit,
        row.periodCredit,
        row.closingDebit,
        row.closingCredit,
      ]),
    ]);

    downloadCsv({
      fileName: `trial-balance-${fromDate}-to-${toDate}.csv`,
      content,
    });
    toast.success("Trial Balance CSV downloaded");
  };

  const exportGroupSummary = () => {
    if (!groupSummary.length) {
      toast.info("No group summary rows to export");
      return;
    }

    const content = toCsv([
      ["Group", "Ledgers", "Closing Debit", "Closing Credit"],
      ...groupSummary.map((row) => [
        row.groupName,
        row.ledgerCount,
        row.closingDebit,
        row.closingCredit,
      ]),
    ]);

    downloadCsv({
      fileName: `group-summary-${fromDate}-to-${toDate}.csv`,
      content,
    });
    toast.success("Group Summary CSV downloaded");
  };

  const exportMonthlySummary = () => {
    if (!monthlySummary.length) {
      toast.info("No monthly voucher rows to export");
      return;
    }

    const content = toCsv([
      ["Month", "Vouchers", "Payment", "Receipt", "Contra", "Journal", "Movement"],
      ...monthlySummary.map((row) => [
        row.month,
        row.voucherCount,
        row.payment,
        row.receipt,
        row.contra,
        row.journal,
        row.totalMovement,
      ]),
    ]);

    downloadCsv({
      fileName: `monthly-voucher-summary-${fromDate}-to-${toDate}.csv`,
      content,
    });
    toast.success("Monthly Summary CSV downloaded");
  };

  const exportLedgerMonthlySummary = () => {
    if (!ledgerMonthlySummary.length) {
      toast.info("No ledger monthly rows to export");
      return;
    }

    const content = toCsv([
      ["Month", "Ledger", "Debit", "Credit", "Net"],
      ...ledgerMonthlySummary.map((row) => [
        row.month,
        row.ledgerName,
        row.debit,
        row.credit,
        row.debit - row.credit,
      ]),
    ]);

    downloadCsv({
      fileName: `ledger-monthly-summary-${fromDate}-to-${toDate}.csv`,
      content,
    });
    toast.success("Ledger Monthly Summary CSV downloaded");
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

  const exportDayBook = () => {
    if (!filteredVouchers.length) {
      toast.info("No vouchers to export");
      return;
    }

    const exported = exportDayBookCsv(filteredVouchers, fromDate, toDate);

    void logDataJob({
      operation: "EXPORT",
      module: "BILLING",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: exported.totalRows,
      successRows: exported.totalRows,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
      notes: `Day Book ${fromDate} to ${toDate}`,
    });

    toast.success("Day Book CSV exported successfully");
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
            id="accounting-from-date"
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
          <div className="flex flex-wrap gap-1 sm:col-span-6">
            {[
              ["TODAY", "Today"],
              ["MONTH", "Month"],
              ["QUARTER", "Quarter"],
              ["FY", "FY"],
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  applyPeriod(value as "TODAY" | "MONTH" | "QUARTER" | "FY")
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <AccountingWorkspaceNav value={workspace} onChange={setWorkspace} />

      <AccountingCommandPanel
        workspace={workspace}
        voucherType={voucherType}
        onShortcut={handleAccountingShortcutKey}
      />

      <div
        id="accounting-overview"
        hidden={workspace !== "OVERVIEW"}
        className="grid scroll-mt-24 gap-4 md:grid-cols-3"
      >
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

      <Card className="rounded-lg" hidden={workspace !== "OVERVIEW"}>
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

      <div
        id="account-masters"
        hidden={workspace !== "MASTERS"}
        className="grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
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

      <div
        id="voucher-entry"
        hidden={workspace !== "VOUCHERS"}
        className="grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <Card id="day-book" className="rounded-lg scroll-mt-24">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5" />
                {editingVoucher ? "Edit Voucher" : "Voucher Entry"}
              </CardTitle>
              {editingVoucher ? (
                <Badge variant="outline">
                  Editing {editingVoucher.voucherNumber}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
              <Keyboard className="h-4 w-4" />
              <span className="font-medium text-foreground">Tally shortcuts</span>
              <ShortcutPill label="F4 Contra" />
              <ShortcutPill label="F5 Payment" />
              <ShortcutPill label="F6 Receipt" />
              <ShortcutPill label="F7 Journal" />
              <span>Alt+C/P/R/J also works while typing.</span>
            </div>

            {editingVoucher ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                You are editing a posted manual voucher. Changes are saved with
                an audit trail.
              </div>
            ) : null}

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
                  onClick={() => setWorkspace("MASTERS")}
                >
                  <Landmark className="mr-2 h-4 w-4" />
                  New Ledger
                </Button>
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
                <Button variant="outline" onClick={autoBalanceVoucher}>
                  Auto Balance
                </Button>
                {editingVoucher ? (
                  <Button variant="outline" onClick={resetVoucherForm}>
                    Cancel Edit
                  </Button>
                ) : null}
                <Button
                  onClick={submitVoucher}
                  disabled={
                    createVoucherState.isLoading ||
                    updateVoucherState.isLoading ||
                    Math.abs(voucherTotals.debit - voucherTotals.credit) > 0.009
                  }
                >
                  {editingVoucher ? "Save Voucher" : "Post Voucher"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Day Book</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Voucher register for the selected period.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={dayBookFilter}
                onValueChange={(value) =>
                  setDayBookFilter(value as DayBookFilter)
                }
              >
                <SelectTrigger className="h-9 w-[132px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Vouchers</SelectItem>
                  {voucherTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {labelCase(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={exportDayBook}
                disabled={!filteredVouchers.length}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {voucherTypes.map((type) => (
                <div key={type} className="rounded-md border bg-muted/20 p-2">
                  <div className="text-xs text-muted-foreground">
                    {labelCase(type)}
                  </div>
                  <div className="mt-1 font-semibold">
                    {dayBookSummary.countByType[type] ?? 0}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-md border bg-slate-950 p-3 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Total Movement
              </div>
              <div className="mt-1 text-xl font-semibold">
                {vouchersFetching ? "..." : formatCurrency(dayBookSummary.totalDebit)}
              </div>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {filteredVouchers.map((voucher) => (
                <div key={voucher.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{voucher.voucherNumber}</div>
                        {voucher.sourceType ? (
                          <Badge variant="secondary">
                            {voucher.sourceType === "BILL"
                              ? "Billing source"
                              : voucher.sourceType}
                          </Badge>
                        ) : null}
                      </div>
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
                  <div className="mt-3 space-y-1 border-t pt-2">
                    {voucher.lines.slice(0, 4).map((line) => (
                      <div
                        key={line.id}
                        className="flex justify-between gap-3 text-xs"
                      >
                        <span className="min-w-0 truncate">
                          {line.entryType} {line.ledgerName ?? "Ledger"}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                  {voucher.lines.length > 4 ? (
                      <div className="text-xs text-muted-foreground">
                        +{voucher.lines.length - 4} more lines
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex justify-end gap-2 border-t pt-2">
                    {voucher.sourceBillId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push("/billing")}
                      >
                        Source
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(voucher.sourceType)}
                      onClick={() => editVoucherInEntry(voucher)}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyVoucherToEntry(voucher)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => printVoucher(voucher)}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(voucher.sourceType)}
                      onClick={() => {
                        setCancelVoucherTarget(voucher);
                        setCancelVoucherReason("");
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {!vouchersFetching && !filteredVouchers.length ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No accounting vouchers found in this period.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div hidden={workspace !== "CASH_BANK"}>
        <CashBankBook
          vouchers={vouchers ?? []}
          ledgers={masters?.ledgers ?? []}
        />
      </div>

      <Card
        id="accounting-reports"
        hidden={workspace !== "REPORTS"}
        className="rounded-lg scroll-mt-24"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Profit & Loss</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Income and expenses from accounting voucher movement in this period.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportProfitLoss}
            disabled={!profitLoss?.rows.length}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
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
                      <td className="p-3 font-medium">
                        <button
                          type="button"
                          className="text-left font-medium text-blue-700 hover:underline"
                          onClick={() =>
                            openLedgerDrilldown({
                              id: row.ledgerId,
                              name: row.ledgerName,
                            })
                          }
                        >
                          {row.ledgerName}
                        </button>
                      </td>
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

      <Card className="rounded-lg" hidden={workspace !== "REPORTS"}>
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
          <Button
            size="sm"
            variant="outline"
            onClick={exportBalanceSheet}
            disabled={!balanceSheet?.assets.length && !balanceSheet?.liabilities.length}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
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
              onOpenLedger={openLedgerDrilldown}
            />
            <BalanceSheetSide
              title="Liabilities"
              rows={balanceSheet?.liabilities ?? []}
              total={balanceSheet?.totalLiabilities ?? 0}
              onOpenLedger={openLedgerDrilldown}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg" hidden={workspace !== "REPORTS"}>
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
          <Button
            size="sm"
            variant="outline"
            onClick={exportTrialBalance}
            disabled={!trialBalance?.rows.length}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
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
                    <td className="p-3 font-medium">
                      <button
                        type="button"
                        className="text-left font-medium text-blue-700 hover:underline"
                        onClick={() =>
                          openLedgerDrilldown({
                            id: row.ledgerId,
                            name: row.ledgerName,
                          })
                        }
                      >
                        {row.ledgerName}
                      </button>
                    </td>
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

      <div
        hidden={workspace !== "REPORTS"}
        className="grid gap-4 xl:grid-cols-2"
      >
        <Card className="rounded-lg">
          <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>GSTR-1 Sales Register</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Sales invoice register for outward supplies review.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportGstr1}
              disabled={!gstSummary?.rows.some((row) => row.type === "SALES")}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InlineMetric
                title="Sales Taxable"
                value={formatCurrency(gstSummary?.salesTaxableAmount ?? 0)}
                loading={gstSummaryFetching}
              />
              <InlineMetric
                title="Sales GST"
                value={formatCurrency(
                  (gstSummary?.salesCgstAmount ?? 0) +
                    (gstSummary?.salesSgstAmount ?? 0) +
                    (gstSummary?.salesIgstAmount ?? 0)
                )}
                loading={gstSummaryFetching}
              />
            </div>
            <div className="max-h-[320px] overflow-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Invoice</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">GSTIN</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">GST</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(gstSummary?.rows ?? [])
                    .filter((row) => row.type === "SALES")
                    .map((row) => (
                      <tr key={row.billNumber} className="border-t">
                        <td className="p-3 font-medium">{row.billNumber}</td>
                        <td className="p-3">{row.partyName}</td>
                        <td className="p-3">{row.partyGstNumber || "-"}</td>
                        <td className="p-3 text-right">
                          {formatCurrency(row.taxableAmount)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(row.cgstAmount + row.sgstAmount + row.igstAmount)}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(row.grandTotal)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>GSTR-3B Summary</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Simple GST payable view from sales and purchase tax.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportGstr3b}
              disabled={!gstSummary}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InlineMetric
                title="Output GST"
                value={formatCurrency(
                  (gstSummary?.salesCgstAmount ?? 0) +
                    (gstSummary?.salesSgstAmount ?? 0) +
                    (gstSummary?.salesIgstAmount ?? 0)
                )}
                loading={gstSummaryFetching}
              />
              <InlineMetric
                title="Input GST"
                value={formatCurrency(
                  (gstSummary?.purchaseCgstAmount ?? 0) +
                    (gstSummary?.purchaseSgstAmount ?? 0) +
                    (gstSummary?.purchaseIgstAmount ?? 0)
                )}
                loading={gstSummaryFetching}
              />
              <InlineMetric
                title="Net GST Payable"
                value={formatCurrency(gstSummary?.netGstPayable ?? 0)}
                loading={gstSummaryFetching}
              />
              <InlineMetric
                title="Purchase Taxable"
                value={formatCurrency(gstSummary?.purchaseTaxableAmount ?? 0)}
                loading={gstSummaryFetching}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        hidden={workspace !== "REPORTS"}
        className="grid gap-4 lg:grid-cols-2"
      >
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Group Summary</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Tally-style group totals from closing balances.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportGroupSummary}
              disabled={!groupSummary.length}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Group</th>
                    <th className="p-3 text-right">Ledgers</th>
                    <th className="p-3 text-right">Closing Dr</th>
                    <th className="p-3 text-right">Closing Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {groupSummary.map((row) => (
                    <tr key={row.groupName} className="border-t">
                      <td className="p-3 font-medium">{row.groupName}</td>
                      <td className="p-3 text-right">{row.ledgerCount}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.closingDebit)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.closingCredit)}
                      </td>
                    </tr>
                  ))}
                  {!groupSummary.length ? (
                    <tr>
                      <td
                        className="p-8 text-center text-muted-foreground"
                        colSpan={4}
                      >
                        No group balances found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Monthly Voucher Summary</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Month-wise voucher movement for review.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportMonthlySummary}
              disabled={!monthlySummary.length}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Month</th>
                    <th className="p-3 text-right">Vouchers</th>
                    <th className="p-3 text-right">Payment</th>
                    <th className="p-3 text-right">Receipt</th>
                    <th className="p-3 text-right">Contra</th>
                    <th className="p-3 text-right">Journal</th>
                    <th className="p-3 text-right">Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((row) => (
                    <tr key={row.month} className="border-t">
                      <td className="p-3 font-medium">{row.month}</td>
                      <td className="p-3 text-right">{row.voucherCount}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.payment)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.receipt)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.contra)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.journal)}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(row.totalMovement)}
                      </td>
                    </tr>
                  ))}
                  {!monthlySummary.length ? (
                    <tr>
                      <td
                        className="p-8 text-center text-muted-foreground"
                        colSpan={7}
                      >
                        No vouchers found for monthly summary.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg lg:col-span-2">
          <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>Ledger Monthly Summary</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Month-wise debit and credit movement by ledger.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportLedgerMonthlySummary}
              disabled={!ledgerMonthlySummary.length}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Month</th>
                    <th className="p-3 text-left">Ledger</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Credit</th>
                    <th className="p-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerMonthlySummary.map((row) => (
                    <tr
                      key={`${row.month}-${row.ledgerId}`}
                      className="border-t"
                    >
                      <td className="p-3 font-medium">{row.month}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="text-left font-medium text-blue-700 hover:underline"
                          onClick={() =>
                            openLedgerDrilldown({
                              id: row.ledgerId,
                              name: row.ledgerName,
                            })
                          }
                        >
                          {row.ledgerName}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.debit)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(row.credit)}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(row.debit - row.credit)}
                      </td>
                    </tr>
                  ))}
                  {!ledgerMonthlySummary.length ? (
                    <tr>
                      <td
                        className="p-8 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        No ledger movement found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg" hidden={workspace !== "OVERVIEW"}>
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

      <LedgerDrilldownDialog
        selectedLedger={selectedLedger}
        rows={ledgerDrilldownRows}
        totals={ledgerDrilldownTotals}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => setSelectedLedger(null)}
        onExport={exportLedgerDrilldown}
      />

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

      <AlertDialog
        open={Boolean(cancelVoucherTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelVoucherTarget(null);
            setCancelVoucherReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel accounting voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {cancelVoucherTarget?.voucherNumber} from
              accounting reports and keep an audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              value={cancelVoucherReason}
              onChange={(event) => setCancelVoucherReason(event.target.value)}
              placeholder="Example: Duplicate entry"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Voucher</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelVoucher}
              disabled={cancelVoucherState.isLoading}
            >
              Cancel Voucher
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

function ShortcutPill({ label }: { label: string }) {
  return (
    <span className="rounded border bg-white px-2 py-1 font-medium text-foreground">
      {label}
    </span>
  );
}

function AccountingCommandPanel({
  workspace,
  voucherType,
  onShortcut,
}: {
  workspace: AccountingWorkspace;
  voucherType: VoucherType;
  onShortcut: (key: string) => void;
}) {
  const commands = [
    {
      key: "F2",
      label: "Period",
      active: false,
      description: "Change date",
    },
    {
      key: "F3",
      label: "Masters",
      active: workspace === "MASTERS",
      description: "Groups & ledgers",
    },
    {
      key: "F4",
      label: "Contra",
      active: workspace === "VOUCHERS" && voucherType === "CONTRA",
      description: "Cash/bank transfer",
    },
    {
      key: "F5",
      label: "Payment",
      active: workspace === "VOUCHERS" && voucherType === "PAYMENT",
      description: "Pay supplier/expense",
    },
    {
      key: "F6",
      label: "Receipt",
      active: workspace === "VOUCHERS" && voucherType === "RECEIPT",
      description: "Receive money",
    },
    {
      key: "F7",
      label: "Journal",
      active: workspace === "VOUCHERS" && voucherType === "JOURNAL",
      description: "Adjustment entry",
    },
    {
      key: "F8",
      label: "Sales",
      active: false,
      description: "Open sales bill",
    },
    {
      key: "F9",
      label: "Purchase",
      active: false,
      description: "Open supplier bill",
    },
    {
      key: "F10",
      label: "Cash/Bank",
      active: workspace === "CASH_BANK",
      description: "Running book",
    },
    {
      key: "F11",
      label: "Reports",
      active: workspace === "REPORTS",
      description: "P&L, B/S, TB",
    },
    {
      key: "F12",
      label: "Configure",
      active: false,
      description: "Org settings",
    },
  ];

  return (
    <Card className="rounded-lg border-slate-200 bg-white">
      <CardContent className="p-3">
        <div className="flex gap-2 overflow-x-auto xl:grid xl:grid-cols-[repeat(11,minmax(86px,1fr))]">
          {commands.map((command) => (
            <button
              key={command.key}
              type="button"
              onClick={() => onShortcut(command.key)}
              className={[
                "min-w-[92px] rounded-md border p-2 text-left transition",
                command.active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
              ].join(" ")}
            >
              <span className="block text-[11px] font-semibold">
                {command.key}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {command.label}
              </span>
              <span
                className={
                  command.active
                    ? "mt-0.5 block text-[11px] text-slate-200"
                    : "mt-0.5 block text-[11px] text-muted-foreground"
                }
              >
                {command.description}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceSheetSide({
  title,
  rows,
  total,
  onOpenLedger,
}: {
  title: string;
  rows: BalanceSheetRow[];
  total: number;
  onOpenLedger: (ledger: SelectedLedger) => void;
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
              <td className="p-3 font-medium">
                {row.ledgerId ? (
                  <button
                    type="button"
                    className="text-left font-medium text-blue-700 hover:underline"
                    onClick={() =>
                      onOpenLedger({
                        id: row.ledgerId!,
                        name: row.ledgerName,
                      })
                    }
                  >
                    {row.ledgerName}
                  </button>
                ) : (
                  row.ledgerName
                )}
              </td>
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

function periodRange(period: "TODAY" | "MONTH" | "QUARTER" | "FY") {
  const now = new Date();

  if (period === "TODAY") {
    const today = toIsoDate(now);
    return {
      fromDate: today,
      toDate: today,
    };
  }

  if (period === "MONTH") {
    return {
      fromDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      toDate: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }

  if (period === "FY") {
    const startYear = now.getMonth() >= 3
      ? now.getFullYear()
      : now.getFullYear() - 1;

    return {
      fromDate: toIsoDate(new Date(startYear, 3, 1)),
      toDate: toIsoDate(new Date(startYear + 1, 2, 31)),
    };
  }

  return currentQuarterRange();
}

function todayDate() {
  return toIsoDate(new Date());
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function summarizeVouchers(vouchers: AccountingVoucher[]) {
  return vouchers.reduce(
    (summary, voucher) => {
      summary.totalDebit += Number(voucher.totalDebit || 0);
      summary.totalCredit += Number(voucher.totalCredit || 0);
      summary.countByType[voucher.voucherType] =
        (summary.countByType[voucher.voucherType] ?? 0) + 1;
      return summary;
    },
    {
      totalDebit: 0,
      totalCredit: 0,
      countByType: {} as Record<VoucherType, number>,
    }
  );
}

function summarizeMonthlyVouchers(vouchers: AccountingVoucher[]) {
  const summary = new Map<
    string,
    {
      month: string;
      voucherCount: number;
      payment: number;
      receipt: number;
      contra: number;
      journal: number;
      totalMovement: number;
    }
  >();

  vouchers.forEach((voucher) => {
    const month = voucher.voucherDate.slice(0, 7);
    const row =
      summary.get(month) ??
      {
        month,
        voucherCount: 0,
        payment: 0,
        receipt: 0,
        contra: 0,
        journal: 0,
        totalMovement: 0,
      };

    row.voucherCount += 1;
    row.totalMovement += Number(voucher.totalDebit || 0);

    if (voucher.voucherType === "PAYMENT") {
      row.payment += Number(voucher.totalDebit || 0);
    } else if (voucher.voucherType === "RECEIPT") {
      row.receipt += Number(voucher.totalDebit || 0);
    } else if (voucher.voucherType === "CONTRA") {
      row.contra += Number(voucher.totalDebit || 0);
    } else {
      row.journal += Number(voucher.totalDebit || 0);
    }

    summary.set(month, row);
  });

  return [...summary.values()].sort((left, right) =>
    left.month.localeCompare(right.month)
  );
}

function summarizeLedgerMonthly(vouchers: AccountingVoucher[]) {
  const summary = new Map<
    string,
    {
      month: string;
      ledgerId: string;
      ledgerName: string;
      debit: number;
      credit: number;
    }
  >();

  vouchers.forEach((voucher) => {
    const month = voucher.voucherDate.slice(0, 7);

    voucher.lines.forEach((line) => {
      const key = `${month}-${line.ledgerId}`;
      const row =
        summary.get(key) ??
        {
          month,
          ledgerId: line.ledgerId,
          ledgerName: line.ledgerName ?? "Ledger",
          debit: 0,
          credit: 0,
        };

      if (line.entryType === "DR") {
        row.debit += Number(line.amount || 0);
      } else {
        row.credit += Number(line.amount || 0);
      }

      summary.set(key, row);
    });
  });

  return [...summary.values()].sort((left, right) => {
    const monthCompare = left.month.localeCompare(right.month);
    return monthCompare === 0
      ? left.ledgerName.localeCompare(right.ledgerName)
      : monthCompare;
  });
}

function summarizeTrialBalanceByGroup(rows: NonNullable<TrialBalance["rows"]>) {
  const summary = new Map<
    string,
    {
      groupName: string;
      ledgerCount: number;
      closingDebit: number;
      closingCredit: number;
    }
  >();

  rows.forEach((row) => {
    const groupName = row.groupName || "Ungrouped";
    const current =
      summary.get(groupName) ??
      {
        groupName,
        ledgerCount: 0,
        closingDebit: 0,
        closingCredit: 0,
      };

    current.ledgerCount += 1;
    current.closingDebit += Number(row.closingDebit || 0);
    current.closingCredit += Number(row.closingCredit || 0);
    summary.set(groupName, current);
  });

  return [...summary.values()].sort((left, right) =>
    left.groupName.localeCompare(right.groupName)
  );
}

function ledgerVoucherLines(
  vouchers: AccountingVoucher[],
  ledgerId: string
): LedgerDrilldownRow[] {
  return vouchers.flatMap((voucher) =>
    voucher.lines
      .filter((line) => line.ledgerId === ledgerId)
      .map((line) => ({
        voucherId: voucher.id,
        lineId: line.id,
        voucherNumber: voucher.voucherNumber,
        voucherType: voucher.voucherType,
        voucherDate: voucher.voucherDate,
        ledgerName: line.ledgerName ?? "Ledger",
        entryType: line.entryType,
        debit: line.entryType === "DR" ? Number(line.amount || 0) : 0,
        credit: line.entryType === "CR" ? Number(line.amount || 0) : 0,
        narration: voucher.narration,
        description: line.description,
      }))
  );
}

function summarizeLedgerDrilldown(rows: LedgerDrilldownRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.debit += row.debit;
      summary.credit += row.credit;
      return summary;
    },
    {
      debit: 0,
      credit: 0,
    }
  );
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

function voucherTypeFromShortcut(event: KeyboardEvent): VoucherType | null {
  if (event.key === "F4") {
    return "CONTRA";
  }

  if (event.key === "F5") {
    return "PAYMENT";
  }

  if (event.key === "F6") {
    return "RECEIPT";
  }

  if (event.key === "F7") {
    return "JOURNAL";
  }

  if (!event.altKey) {
    return null;
  }

  switch (event.key.toLowerCase()) {
    case "c":
      return "CONTRA";
    case "p":
      return "PAYMENT";
    case "r":
      return "RECEIPT";
    case "j":
      return "JOURNAL";
    default:
      return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
