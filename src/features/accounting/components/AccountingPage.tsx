"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  Edit2,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings,
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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { TallyAccountMasters } from "@/components/layout/TallyAccountMasters";
import { TallyVoucherList } from "@/components/layout/TallyVoucherList";
import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  printHtml,
} from "@/features/import-export/utils/localExportFiles";
import { exportGstReportCsv } from "@/features/billing/utils/gstReportExport";
import {
  useCancelAccountingVoucherMutation,
  useCreateAccountingVoucherMutation,
  useCreateAccountingTaxSectionMutation,
  useCreateAccountGroupMutation,
  useCreateAccountLedgerMutation,
  useDeleteAccountGroupMutation,
  useDeleteAccountLedgerMutation,
  useGetAccountingGstSummaryQuery,
  useGetAccountingTaxSectionCatalogQuery,
  useGetAccountingTaxSectionsQuery,
  useGetAccountingVouchersQuery,
  useGetAgingReportQuery,
  useGetAccountMastersQuery,
  useGetBalanceSheetQuery,
  useGetLedgerReportQuery,
  useGetProfitLossQuery,
  useGetTrialBalanceQuery,
  useLazyGetAccountingGstSummaryQuery,
  useLazySuggestVoucherNumberQuery,
  useLazyCheckVoucherNumberQuery,
  useUpdateAccountingVoucherMutation,
  useUpdateAccountingTaxSectionMutation,
  useUpdateAccountGroupMutation,
  useUpdateAccountLedgerMutation,
} from "../api/accountingApi";
import {
  useGetOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "@/features/organization-settings/api/organizationSettingsApi";
import type { OrganizationSettingsRequest } from "@/features/organization-settings/types/organizationSettings.types";
import type {
  AccountGroup,
  AccountGroupType,
  AccountLedger,
  AccountingTaxSection,
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
import { handleTallyFieldNavigation } from "@/lib/tallyKeyboard";
import { playUiSound } from "@/lib/uiSounds";
import { useAppSelector } from "@/lib/hook";
import {
  getFactoryUiMode,
  UI_MODE_CHANGED_EVENT,
} from "@/lib/uiModePreference";
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

const weekStartOptions = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({
  label,
  value: String(index + 1),
}));

const voucherTypes: VoucherType[] = [
  "PAYMENT",
  "RECEIPT",
  "CONTRA",
  "JOURNAL",
  "DEBIT_NOTE",
  "CREDIT_NOTE",
];

const voucherHelp: Record<VoucherType, string> = {
  PAYMENT: "Money paid out to suppliers, expenses, employees or bank charges.",
  RECEIPT: "Money received from customers, owners, banks or other income.",
  CONTRA: "Transfer between cash and bank ledgers without changing profit.",
  JOURNAL: "Manual adjustment entry for provisions, corrections and transfers.",
  DEBIT_NOTE: "Increase receivable or reduce supplier payable for returns, shortages or rate differences.",
  CREDIT_NOTE: "Reduce customer receivable or increase payable for sales returns, discounts or corrections.",
  SALES: "Goods or services sold on credit or cash; books revenue and the corresponding ledger.",
  PURCHASE: "Goods or services bought on credit or cash; books expense and the corresponding ledger.",
};

type VoucherLineDraft = {
  id: string;
  ledgerId: string;
  entryType: BalanceType;
  amount: string;
  description: string;
};

type DayBookFilter = VoucherType | "ALL";

type AccountingSettingsDraft = {
  currency: string;
  timezone: string;
  weekStartDay: string;
  financialYearStartMonth: string;
  activeAccountingPeriodStart: string;
  activeAccountingPeriodEnd: string;
  accountingMastersEnabled: boolean;
  accountingVouchersEnabled: boolean;
  accountingTaxationEnabled: boolean;
  accountingReportsEnabled: boolean;
  tdsEnabled: boolean;
  tcsEnabled: boolean;
};

type TaxSectionDraft = {
  id: string | null;
  taxType: string;
  sectionCode: string;
  name: string;
  rate: string;
  applicableFor: string;
  active: boolean;
};

export function AccountingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const [fromDate, setFromDate] = useState(
    () => currentQuarterRange().fromDate
  );
  const [toDate, setToDate] = useState(
    () => currentQuarterRange().toDate
  );
  const [dayBookFilter, setDayBookFilter] = useState<DayBookFilter>("ALL");
  const [agingAsOfDate, setAgingAsOfDate] = useState(() => todayDate());
  const [masterSearch, setMasterSearch] = useState("");
  const [masterLedgerGroupFilter, setMasterLedgerGroupFilter] = useState("ALL");
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tallyMode, setTallyMode] = useState(false);
  const [voucherType, setVoucherType] = useState<VoucherType>("JOURNAL");
  const [voucherView, setVoucherView] = useState<"list" | "create" | "alter">("list");
  const [voucherDate, setVoucherDate] = useState(() => todayDate());
  const [voucherNarration, setVoucherNarration] = useState("");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [suggestVoucherNumber, { isFetching: suggestingNumber }] =
    useLazySuggestVoucherNumberQuery();
  const [
    checkVoucherNumber,
    { data: voucherNumberTaken, isFetching: checkingVoucherNumber },
  ] = useLazyCheckVoucherNumberQuery();
  const [voucherLines, setVoucherLines] = useState<VoucherLineDraft[]>(() => [
    newVoucherLine("DR"),
    newVoucherLine("CR"),
  ]);

  const [editingVoucher, setEditingVoucher] =
    useState<AccountingVoucher | null>(null);

  useEffect(() => {
    if (editingVoucher) return;
    let cancelled = false;
    suggestVoucherNumber(voucherType)
      .unwrap()
      .then((number) => {
        if (!cancelled) setVoucherNumber(number ? String(number) : "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [voucherType, editingVoucher, suggestVoucherNumber]);

  useEffect(() => {
    const trimmed = String(voucherNumber).trim();
    if (!trimmed) return;
    if (editingVoucher && trimmed === editingVoucher.voucherNumber) return;
    const handle = setTimeout(() => {
      checkVoucherNumber({ number: trimmed, excludeId: editingVoucher?.id });
    }, 400);
    return () => clearTimeout(handle);
  }, [voucherNumber, editingVoucher, checkVoucherNumber]);

  const [cancelVoucherTarget, setCancelVoucherTarget] =
    useState<AccountingVoucher | null>(null);
  const [cancelVoucherReason, setCancelVoucherReason] = useState("");
  const [accountingSettingsOpen, setAccountingSettingsOpen] = useState(false);
  const [accountingSettingsDraft, setAccountingSettingsDraft] =
    useState<AccountingSettingsDraft>({
      currency: "INR",
      timezone: "Asia/Kolkata",
      weekStartDay: "MONDAY",
      financialYearStartMonth: "4",
      activeAccountingPeriodStart: currentFinancialYearRange().fromDate,
      activeAccountingPeriodEnd: currentFinancialYearRange().toDate,
      accountingMastersEnabled: true,
      accountingVouchersEnabled: true,
      accountingTaxationEnabled: true,
      accountingReportsEnabled: true,
      tdsEnabled: true,
      tcsEnabled: true,
    });
  const [taxSectionDraft, setTaxSectionDraft] = useState<TaxSectionDraft>(() =>
    emptyTaxSectionDraft()
  );
  const range = { fromDate, toDate };
  const { data, isLoading, isFetching } = useGetLedgerReportQuery(range);
  const { data: organizationSettingsResponse } =
    useGetOrganizationSettingsQuery();
  const organizationSettings = organizationSettingsResponse?.data;
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
  const { data: taxSectionCatalog = [] } =
    useGetAccountingTaxSectionCatalogQuery();
  const { data: taxSections = [], isFetching: taxSectionsFetching } =
    useGetAccountingTaxSectionsQuery();
  const { data: vouchers, isFetching: vouchersFetching } =
    useGetAccountingVouchersQuery(range);
  const [updateOrganizationSettings, updateOrganizationSettingsState] =
    useUpdateOrganizationSettingsMutation();
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
  const [createTaxSection, createTaxSectionState] =
    useCreateAccountingTaxSectionMutation();
  const [updateTaxSection, updateTaxSectionState] =
    useUpdateAccountingTaxSectionMutation();
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
  const taxLedgerSummary = summarizeTaxLedgers(vouchers ?? [], masters?.ledgers ?? []);
  const gstSalesRows = (gstSummary?.rows ?? []).filter((row) => row.type === "SALES");
  const outputGstTotal =
    (gstSummary?.salesCgstAmount ?? 0) +
    (gstSummary?.salesSgstAmount ?? 0) +
    (gstSummary?.salesIgstAmount ?? 0);
  const inputGstTotal =
    (gstSummary?.purchaseCgstAmount ?? 0) +
    (gstSummary?.purchaseSgstAmount ?? 0) +
    (gstSummary?.purchaseIgstAmount ?? 0);
  const activeTaxSections = taxSections.filter((section) => section.active).length;
  const taxSectionsByType = taxSections.reduce<Record<string, number>>((summary, section) => {
    summary[section.taxType] = (summary[section.taxType] ?? 0) + 1;
    return summary;
  }, {});
  const overviewParties = data?.parties ?? [];
  const topOutstandingParties = [...overviewParties]
    .sort((first, second) => Math.abs(second.outstandingAmount) - Math.abs(first.outstandingAmount))
    .slice(0, 6);
  const reportNetProfit = profitLoss?.netProfit ?? 0;
  const balanceDifference = balanceSheet?.difference ?? 0;
  const masterGroups = masters?.groups ?? [];
  const masterLedgers = masters?.ledgers ?? [];
  const masterSearchTerm = masterSearch.trim().toLowerCase();
  const editableGroupCount = masterGroups.filter((group) => !group.systemGroup).length;
  const editableLedgerCount = masterLedgers.filter((ledger) => !ledger.systemLedger).length;
  const lockedMasterCount =
    masterGroups.filter((group) => group.systemGroup).length +
    masterLedgers.filter((ledger) => ledger.systemLedger).length;
  const filteredMasterLedgers = masterLedgers.filter((ledger) => {
    const matchesGroup =
      masterLedgerGroupFilter === "ALL" ||
      ledger.accountGroupId === masterLedgerGroupFilter;
    const matchesSearch =
      !masterSearchTerm ||
      [ledger.name, ledger.groupName, ledger.gstNumber, ledger.contactName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(masterSearchTerm));

    return matchesGroup && matchesSearch;
  });
  const accountingFeatureFlags = {
    accountingMastersEnabled: organizationSettings?.accountingMastersEnabled ?? true,
    accountingVouchersEnabled: organizationSettings?.accountingVouchersEnabled ?? true,
    accountingTaxationEnabled: organizationSettings?.accountingTaxationEnabled ?? true,
    accountingReportsEnabled: organizationSettings?.accountingReportsEnabled ?? true,
  };
  const disabledWorkspaceReasons: Partial<Record<AccountingWorkspace, string>> = {
    MASTERS: accountingFeatureFlags.accountingMastersEnabled
      ? undefined
      : "Accounting masters are disabled. Enable them from Accounting Settings.",
    VOUCHERS: accountingFeatureFlags.accountingVouchersEnabled
      ? undefined
      : "Accounting vouchers are disabled. Enable them from Accounting Settings.",
    CASH_BANK: accountingFeatureFlags.accountingReportsEnabled
      ? undefined
      : "Accounting reports are disabled. Enable them from Accounting Settings.",
    TAXES: accountingFeatureFlags.accountingTaxationEnabled
      ? undefined
      : "Taxation is disabled. Enable it from Accounting Settings.",
    REPORTS: accountingFeatureFlags.accountingReportsEnabled
      ? undefined
      : "Accounting reports are disabled. Enable them from Accounting Settings.",
  };
  const vouchersDisabledReason = disabledWorkspaceReasons.VOUCHERS;

  useEffect(() => {
    const syncMode = () => setTallyMode(getFactoryUiMode(user) === "tally");
    syncMode();

    window.addEventListener(UI_MODE_CHANGED_EVENT, syncMode);
    return () => window.removeEventListener(UI_MODE_CHANGED_EVENT, syncMode);
  }, [user]);

  function handleWorkspaceChange(nextWorkspace: AccountingWorkspace) {
    const disabledReason = disabledWorkspaceReasons[nextWorkspace];
    if (disabledReason) {
      toast.info(disabledReason);
      return;
    }

    setWorkspace(nextWorkspace);
  }

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
      if (!accountingFeatureFlags.accountingVouchersEnabled) {
        toast.info(
          "Accounting vouchers are disabled. Enable them from Accounting Settings."
        );
        return;
      }

      setWorkspace("VOUCHERS");
      setVoucherType(nextType);
      setVoucherView("list");
      toast.info(`${labelCase(nextType)} voucher selected`);
    };

    window.addEventListener("keydown", handleVoucherShortcut);
    return () => window.removeEventListener("keydown", handleVoucherShortcut);
  }, [accountingFeatureFlags.accountingVouchersEnabled]);

  useEffect(() => {
    const voucherParam = searchParams.get("voucher") as VoucherType | null;
    const workspaceParam = searchParams.get("workspace") as AccountingWorkspace | null;

    if (voucherParam && voucherTypes.includes(voucherParam)) {
      selectVoucherType(voucherParam);
      return;
    }

    if (
      workspaceParam &&
      ["OVERVIEW", "MASTERS", "VOUCHERS", "CASH_BANK", "TAXES", "REPORTS"].includes(
        workspaceParam
      )
    ) {
      handleWorkspaceChange(workspaceParam);
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (!tallyMode || workspace !== "VOUCHERS" || voucherView === "list") {
      return;
    }

    function handleVoucherEsc(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("role") === "combobox"
      ) {
        return;
      }

      if (target?.tagName === "INPUT") {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setVoucherView("list");
      }
    }

    window.addEventListener("keydown", handleVoucherEsc, true);
    return () => window.removeEventListener("keydown", handleVoucherEsc, true);
  }, [tallyMode, workspace, voucherView]);

  useEffect(() => {
    if (!organizationSettings) {
      return;
    }

    setAccountingSettingsDraft({
      currency: organizationSettings.currency || "INR",
      timezone: organizationSettings.timezone || "Asia/Kolkata",
      weekStartDay: organizationSettings.weekStartDay || "MONDAY",
      financialYearStartMonth: String(
        organizationSettings.financialYearStartMonth || 4
      ),
      activeAccountingPeriodStart:
        organizationSettings.activeAccountingPeriodStart ||
        currentFinancialYearRange().fromDate,
      activeAccountingPeriodEnd:
        organizationSettings.activeAccountingPeriodEnd ||
        currentFinancialYearRange().toDate,
      accountingMastersEnabled:
        organizationSettings.accountingMastersEnabled ?? true,
      accountingVouchersEnabled:
        organizationSettings.accountingVouchersEnabled ?? true,
      accountingTaxationEnabled:
        organizationSettings.accountingTaxationEnabled ?? true,
      accountingReportsEnabled:
        organizationSettings.accountingReportsEnabled ?? true,
      tdsEnabled: organizationSettings.tdsEnabled ?? true,
      tcsEnabled: organizationSettings.tcsEnabled ?? true,
    });

    if (
      organizationSettings.activeAccountingPeriodStart &&
      organizationSettings.activeAccountingPeriodEnd
    ) {
      setFromDate(organizationSettings.activeAccountingPeriodStart);
      setToDate(organizationSettings.activeAccountingPeriodEnd);
      setAgingAsOfDate(organizationSettings.activeAccountingPeriodEnd);
    }
  }, [organizationSettings]);

  useEffect(() => {
    if (taxSectionDraft.sectionCode || !taxSectionCatalog.length) {
      return;
    }

    applyTaxCatalogSection(taxSectionCatalog[0]);
  }, [taxSectionCatalog]);

  function selectVoucherType(nextType: VoucherType) {
    if (!accountingFeatureFlags.accountingVouchersEnabled) {
      toast.info(
        "Accounting vouchers are disabled. Enable them from Accounting Settings."
      );
      return;
    }

    setWorkspace("VOUCHERS");
    setVoucherType(nextType);
    setVoucherView("list");
    toast.info(`${labelCase(nextType)} voucher selected`);
  }

  function handleAccountingShortcutKey(key: string) {
    if (key === "F2") {
      setAccountingSettingsOpen(true);
      return;
    }

    if (key === "F3") {
      toast.info("Company selection uses your active Factory1 organization.");
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
      selectVoucherType("DEBIT_NOTE");
      return;
    }

    if (key === "F11") {
      selectVoucherType("CREDIT_NOTE");
      return;
    }

    if (key === "F12") {
      setAccountingSettingsOpen(true);
    }
  }

  const saveAccountingSettings = async () => {
    if (!organizationSettings) {
      toast.error("Organization settings are still loading");
      return;
    }

    const financialYearStartMonth = Number(
      accountingSettingsDraft.financialYearStartMonth || 4
    );

    if (financialYearStartMonth < 1 || financialYearStartMonth > 12) {
      toast.error("Financial year start month must be between 1 and 12");
      return;
    }

    if (
      accountingSettingsDraft.activeAccountingPeriodStart &&
      accountingSettingsDraft.activeAccountingPeriodEnd &&
      accountingSettingsDraft.activeAccountingPeriodEnd <
        accountingSettingsDraft.activeAccountingPeriodStart
    ) {
      toast.error("Active accounting period end cannot be before start");
      return;
    }

    const payload: OrganizationSettingsRequest = {
      workingHoursPerDay: Number(organizationSettings.workingHoursPerDay || 8),
      workingDaysPerMonth: Number(organizationSettings.workingDaysPerMonth || 26),
      overtimeMultiplier: Number(organizationSettings.overtimeMultiplier || 1.5),
      currency: accountingSettingsDraft.currency.trim() || "INR",
      timezone: accountingSettingsDraft.timezone.trim() || "Asia/Kolkata",
      weekStartDay: accountingSettingsDraft.weekStartDay,
      financialYearStartMonth,
      organizationName: organizationSettings.organizationName || "",
      location: organizationSettings.location || "",
      city: organizationSettings.city || "",
      pincode: organizationSettings.pincode || "",
      country: organizationSettings.country || "India",
      industryType: organizationSettings.industryType || "",
      employeeCountEstimate: organizationSettings.employeeCountEstimate || 1,
      gstNumber: organizationSettings.gstNumber || "",
      businessType: organizationSettings.businessType || "",
      state: organizationSettings.state || "",
      activeAccountingPeriodStart:
        accountingSettingsDraft.activeAccountingPeriodStart,
      activeAccountingPeriodEnd:
        accountingSettingsDraft.activeAccountingPeriodEnd,
      accountingMastersEnabled:
        accountingSettingsDraft.accountingMastersEnabled,
      accountingVouchersEnabled:
        accountingSettingsDraft.accountingVouchersEnabled,
      accountingTaxationEnabled:
        accountingSettingsDraft.accountingTaxationEnabled,
      accountingReportsEnabled:
        accountingSettingsDraft.accountingReportsEnabled,
      tdsEnabled: accountingSettingsDraft.tdsEnabled,
      tcsEnabled: accountingSettingsDraft.tcsEnabled,
    };

    try {
      await updateOrganizationSettings(payload).unwrap();
      setFromDate(accountingSettingsDraft.activeAccountingPeriodStart);
      setToDate(accountingSettingsDraft.activeAccountingPeriodEnd);
      setAgingAsOfDate(accountingSettingsDraft.activeAccountingPeriodEnd);
      toast.success("Accounting settings updated");
    } catch {
      toast.error("Could not update accounting settings");
    }
  };

  function applyTaxCatalogSection(section: AccountingTaxSection) {
    setTaxSectionDraft({
      id: null,
      taxType: section.taxType,
      sectionCode: section.sectionCode,
      name: section.name,
      rate: String(section.rate ?? 0),
      applicableFor: section.applicableFor ?? "",
      active: true,
    });
  }

  function editTaxSection(section: AccountingTaxSection) {
    setTaxSectionDraft({
      id: section.id ?? null,
      taxType: section.taxType,
      sectionCode: section.sectionCode,
      name: section.name,
      rate: String(section.rate ?? 0),
      applicableFor: section.applicableFor ?? "",
      active: section.active,
    });
  }

  const saveTaxSection = async () => {
    if (
      !taxSectionDraft.taxType.trim() ||
      !taxSectionDraft.sectionCode.trim() ||
      !taxSectionDraft.name.trim()
    ) {
      toast.info("Tax type, section and name are required");
      return;
    }

    const rate = Number(taxSectionDraft.rate || 0);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }

    const payload = {
      taxType: taxSectionDraft.taxType.trim().toUpperCase(),
      sectionCode: taxSectionDraft.sectionCode.trim().toUpperCase(),
      name: taxSectionDraft.name.trim(),
      rate,
      applicableFor: taxSectionDraft.applicableFor.trim() || null,
      active: taxSectionDraft.active,
    };

    try {
      if (taxSectionDraft.id) {
        await updateTaxSection({
          id: taxSectionDraft.id,
          ...payload,
        }).unwrap();
        toast.success("Tax section updated");
      } else {
        await createTaxSection(payload).unwrap();
        toast.success("Tax section added");
      }
      setTaxSectionDraft(emptyTaxSectionDraft());
    } catch {
      toast.error("Could not save tax section");
    }
  };

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
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not create account group");
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
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not create account ledger");
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
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not update account group");
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
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not update account ledger");
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
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not delete account group");
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
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not delete account ledger");
    }
  };

  const submitVoucher = async () => {
    if (vouchersDisabledReason) {
      toast.info(vouchersDisabledReason);
      return;
    }

    if (voucherNumberTaken) {
      toast.error("This voucher number already exists");
      return;
    }

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
      voucherNumber: String(voucherNumber).trim() || undefined,
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
        playUiSound("post");
      }
      resetVoucherForm();
    } catch {
      toast.error(editingVoucher ? "Could not update voucher" : "Could not post voucher");
    }
  };

  const resetVoucherForm = () => {
    setEditingVoucher(null);
    setVoucherType("JOURNAL");
    setVoucherNumber("");
    setVoucherDate(todayDate());
    setVoucherNarration("");
    setVoucherLines([newVoucherLine("DR"), newVoucherLine("CR")]);
    setVoucherView("list");
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
    if (vouchersDisabledReason) {
      toast.info(vouchersDisabledReason);
      return;
    }

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
    if (vouchersDisabledReason) {
      toast.info(vouchersDisabledReason);
      return;
    }

    if (voucher.sourceType) {
      toast.info("Bill generated vouchers are edited from Billing");
      return;
    }

    setEditingVoucher(voucher);
    setWorkspace("VOUCHERS");
    setVoucherType(voucher.voucherType);
    setVoucherNumber(voucher.voucherNumber ? String(voucher.voucherNumber) : "");
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

    if (vouchersDisabledReason) {
      toast.info(vouchersDisabledReason);
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

  const printVoucher = async (voucher: AccountingVoucher) => {
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

    const html = `
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
    `;

    const ok = await printHtml(html);
    if (!ok) {
      toast.error("Could not open print window");
    }
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
      parameters: {
        reportType: "LEDGER_REPORT",
        fromDate,
        toDate,
      },
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
      [
        "Month",
        "Vouchers",
        "Payment",
        "Receipt",
        "Contra",
        "Journal",
        "Debit Note",
        "Credit Note",
        "Movement",
      ],
      ...monthlySummary.map((row) => [
        row.month,
        row.voucherCount,
        row.payment,
        row.receipt,
        row.contra,
        row.journal,
        row.debitNote,
        row.creditNote,
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

  const detailsPanelAvailable =
    workspace === "OVERVIEW" ||
    workspace === "MASTERS" ||
    workspace === "VOUCHERS";
  const voucherSurface = voucherSurfaceFor(voucherType);

  if (tallyMode && workspace === "VOUCHERS") {
    if (voucherView === "list") {
      const vouchersOfType = (vouchers ?? []).filter(
        (v) => v.voucherType === voucherType
      );
      return (
        <TallyVoucherList
          voucherType={voucherType}
          vouchers={vouchersOfType}
          isFetching={vouchersFetching}
          onSelectVoucher={(v) => {
            setEditingVoucher(v);
            setVoucherType(v.voucherType);
            setVoucherDate(v.voucherDate);
            setVoucherNumber(v.voucherNumber || "");
            setVoucherNarration(v.narration ?? "");
            setVoucherLines(
              v.lines.map((line) => ({
                id: line.id,
                ledgerId: line.ledgerId,
                entryType: line.entryType,
                amount: String(line.amount),
                description: line.description ?? "",
              }))
            );
            setVoucherView("alter");
          }}
          onCreateNew={() => {
            setEditingVoucher(null);
            setVoucherLines([newVoucherLine("DR"), newVoucherLine("CR")]);
            setVoucherDate(todayDate());
            setVoucherNarration("");
            suggestVoucherNumber(voucherType)
              .unwrap()
              .then((number) => setVoucherNumber(number ? String(number) : ""))
              .catch(() => setVoucherNumber(""));
            setVoucherView("create");
          }}
          onBack={() => handleWorkspaceChange("OVERVIEW")}
        />
      );
    }

    const balanced = Math.abs(voucherTotals.debit - voucherTotals.credit) <= 0.009;

    return (
      <div
        className="tally-entry-screen"
        data-tally-nav-scope
        onKeyDown={handleTallyFieldNavigation}
      >
        <div className="tally-entry-title">
          <span>Accounting Voucher Creation</span>
          <span>Factory1</span>
          <span>Ctrl + M</span>
        </div>

        <div className="tally-entry-meta">
          <div>
            <div>
              <span className="tally-hotkey">{labelCase(voucherType)}</span>
              <span className="ml-2">No.</span>
              <Input
                value={voucherNumber}
                disabled={Boolean(vouchersDisabledReason)}
                onChange={(event) => setVoucherNumber(event.target.value)}
                placeholder={suggestingNumber ? "Auto" : "Auto"}
                className="tally-inline-input ml-1 w-32"
              />
            </div>
            <div>
              Voucher type :
              <select
                value={voucherType}
                disabled={Boolean(vouchersDisabledReason)}
                onChange={(event) => setVoucherType(event.target.value as VoucherType)}
                className="tally-select ml-2 min-w-48"
              >
                {voucherTypes.map((type) => (
                  <option key={type} value={type}>
                    {labelCase(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-right">
            <div>{voucherDate ? formatDisplayDate(voucherDate) : ""}</div>
            <Input
              type="date"
              value={voucherDate}
              disabled={Boolean(vouchersDisabledReason)}
              onChange={(event) => setVoucherDate(event.target.value)}
              className="tally-inline-input w-36 text-right"
            />
          </div>
        </div>

        <div className="tally-party-lines">
          <div>
            Current voucher :
            <span className="ml-2 font-bold">{voucherHelp[voucherType]}</span>
          </div>
          <div>
            Status :
            <span className="ml-2 font-bold">
              {vouchersDisabledReason
                ? "Disabled from Accounting Settings"
                : balanced
                  ? "Balanced"
                  : `Difference ${formatCurrency(Math.abs(voucherTotals.debit - voucherTotals.credit))}`}
            </span>
          </div>
        </div>

        <div className="tally-table-wrap">
          <table className="tally-entry-table">
            <thead>
              <tr>
                <th className="text-left">Particulars</th>
                <th className="w-24 text-left">Dr/Cr</th>
                <th className="w-36 text-right">Debit</th>
                <th className="w-36 text-right">Credit</th>
                <th className="w-64 text-left">Description</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {voucherLines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <select
                      value={line.ledgerId}
                      disabled={Boolean(vouchersDisabledReason)}
                      onChange={(event) =>
                        updateVoucherLine(line.id, { ledgerId: event.target.value })
                      }
                      className="tally-select w-full"
                    >
                      <option value="">Select ledger</option>
                      {(masters?.ledgers ?? []).map((ledger) => (
                        <option key={ledger.id} value={ledger.id}>
                          {ledger.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={line.entryType}
                      disabled={Boolean(vouchersDisabledReason)}
                      onChange={(event) =>
                        updateVoucherLine(line.id, {
                          entryType: event.target.value as BalanceType,
                        })
                      }
                      className="tally-select w-full"
                    >
                      {balanceTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.entryType === "DR" ? line.amount : ""}
                      disabled={Boolean(vouchersDisabledReason)}
                      onChange={(event) =>
                        updateVoucherLine(line.id, {
                          entryType: "DR",
                          amount: event.target.value,
                        })
                      }
                      className="tally-line-input text-right"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.entryType === "CR" ? line.amount : ""}
                      disabled={Boolean(vouchersDisabledReason)}
                      onChange={(event) =>
                        updateVoucherLine(line.id, {
                          entryType: "CR",
                          amount: event.target.value,
                        })
                      }
                      className="tally-line-input text-right"
                    />
                  </td>
                  <td>
                    <Input
                      value={line.description}
                      disabled={Boolean(vouchersDisabledReason)}
                      onChange={(event) =>
                        updateVoucherLine(line.id, {
                          description: event.target.value,
                        })
                      }
                      className="tally-line-input"
                    />
                  </td>
                  <td data-ignore-tally-nav="true">
                    <button
                      type="button"
                      className="tally-small-action"
                      disabled={
                        Boolean(vouchersDisabledReason) || voucherLines.length <= 2
                      }
                      onClick={() =>
                        setVoucherLines((current) =>
                          current.filter((item) => item.id !== line.id)
                        )
                      }
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tally-total-strip">
          <button
            type="button"
            disabled={Boolean(vouchersDisabledReason)}
            onClick={() =>
              setVoucherLines((current) => [...current, newVoucherLine("DR")])
            }
          >
            A: Add Line
          </button>
          <span>Dr {formatCurrency(voucherTotals.debit)}</span>
          <strong>Cr {formatCurrency(voucherTotals.credit)}</strong>
        </div>

        <div className="tally-narration">
          <label>Narration:</label>
          <Textarea
            value={voucherNarration}
            disabled={Boolean(vouchersDisabledReason)}
            onChange={(event) => setVoucherNarration(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                playUiSound("enter");
                if (balanced) {
                  void submitVoucher();
                } else {
                  toast.error("Debit and credit totals must match");
                }
              }
            }}
            placeholder={voucherHelp[voucherType]}
          />
        </div>

        <div className="tally-command-strip">
          <button type="button" onClick={() => setVoucherView("list")}>
            Q: Quit
          </button>
          <button
            type="button"
            disabled={
              Boolean(vouchersDisabledReason) ||
              createVoucherState.isLoading ||
              updateVoucherState.isLoading ||
              voucherNumberTaken ||
              checkingVoucherNumber ||
              !balanced
            }
            onClick={submitVoucher}
          >
            A: Accept
          </button>
          <button
            type="button"
            disabled={Boolean(vouchersDisabledReason)}
            onClick={autoBalanceVoucher}
          >
            B: Balance
          </button>
          <button type="button" onClick={() => handleWorkspaceChange("MASTERS")}>
            L: Ledger
          </button>
        </div>
      </div>
    );
  }

  if (tallyMode && workspace === "MASTERS") {
    return (
      <TallyAccountMasters
        masters={masters}
        onBack={() => handleWorkspaceChange("OVERVIEW")}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={deleteGroup}
        isCreating={createGroupState.isLoading}
        isUpdating={updateGroupState.isLoading}
      />
    );
  }

  return (
    <div
      className={`space-y-2 text-[12px] ${
        tallyMode && workspace === "VOUCHERS" ? "tally-voucher-screen" : ""
      }`}
      data-tally-nav-scope
      onKeyDown={handleTallyFieldNavigation}
    >
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">
            Accounting
          </h1>
          <p className="text-[11px] text-[var(--factory1-text-muted)]">
            Party ledgers, receivables, payables and GST summaries from posted bills.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-md border border-[var(--factory1-border)] bg-white p-1">
          {detailsPanelAvailable ? (
            <Button
              variant={detailsOpen ? "default" : "outline"}
              onClick={() => setDetailsOpen((current) => !current)}
              className="h-8 rounded-md border-[var(--factory1-border-strong)] text-xs"
            >
              {detailsOpen ? (
                <PanelRightClose className="mr-2 h-4 w-4" />
              ) : (
                <PanelRightOpen className="mr-2 h-4 w-4" />
              )}
              {detailsOpen ? "Hide details" : "Show details"}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 rounded-md border-[var(--factory1-border-strong)] text-xs">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Download reports</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!data?.parties.length}
                onClick={exportLedger}
              >
                <Download className="mr-2 h-4 w-4" />
                Ledger CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={gstState.isFetching}
                onClick={exportGst}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                GST CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!profitLoss?.rows.length}
                onClick={exportProfitLoss}
              >
                <Download className="mr-2 h-4 w-4" />
                Profit & Loss CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  !balanceSheet?.assets.length &&
                  !balanceSheet?.liabilities.length
                }
                onClick={exportBalanceSheet}
              >
                <Download className="mr-2 h-4 w-4" />
                Balance Sheet CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="h-8 rounded-md border-[var(--factory1-border-strong)] text-xs"
            onClick={() => setAccountingSettingsOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {!tallyMode ? (
        <AccountingWorkspaceNav
          value={workspace}
          onChange={handleWorkspaceChange}
          disabledReasons={disabledWorkspaceReasons}
        />
      ) : null}

      <div
        id="accounting-overview"
        hidden={workspace !== "OVERVIEW"}
        className={
          detailsOpen
            ? "grid scroll-mt-24 gap-4 lg:grid-cols-[1.2fr_0.8fr]"
            : "grid scroll-mt-24 gap-4"
        }
      >
        <Card className="rounded-lg border-slate-900 bg-slate-950 text-white">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-slate-300">
              Net Receivable Position
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {isLoading || isFetching
                ? "..."
                : formatCurrency(data?.netReceivable ?? 0)}
            </div>
            <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
              <VoucherTotalTile
                label="Receivables"
                value={formatCurrency(data?.totalReceivables ?? 0)}
              />
              <VoucherTotalTile
                label="Payables"
                value={formatCurrency(data?.totalPayables ?? 0)}
              />
            </div>
          </CardContent>
        </Card>

        {detailsOpen ? (
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Top Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topOutstandingParties.map((party) => (
              <div
                key={`${party.type}-${party.partyName}-${party.partyGstNumber ?? ""}`}
                className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 p-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{party.partyName}</div>
                  <div className="text-xs text-muted-foreground">
                    {party.type} · {party.billCount} bills
                  </div>
                </div>
                <div className="text-right font-semibold">
                  {formatCurrency(party.outstandingAmount)}
                </div>
              </div>
            ))}
            {!isLoading && !topOutstandingParties.length ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No posted party balances found.
              </div>
            ) : null}
          </CardContent>
        </Card>
        ) : null}
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
        className={
          detailsOpen
            ? "grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
            : "grid scroll-mt-24 gap-4"
        }
      >
        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader className="flex flex-col items-start gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Account Masters</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Groups define reporting buckets. Ledgers are the accounts used
                  in vouchers, bills, GST and CA reports.
                </p>
              </div>
              <Badge variant="outline">
                {mastersFetching ? "Loading" : `${masterLedgers.length} ledgers`}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <MasterMetric
                  label="Groups"
                  value={String(masterGroups.length)}
                  helper={`${editableGroupCount} editable`}
                />
                <MasterMetric
                  label="Ledgers"
                  value={String(masterLedgers.length)}
                  helper={`${editableLedgerCount} editable`}
                />
                <MasterMetric
                  label="Protected"
                  value={String(lockedMasterCount)}
                  helper="Required by system"
                />
              </div>

              <div className="rounded-lg border bg-slate-50/70 p-3">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Groups</h3>
                    <p className="text-xs text-muted-foreground">
                      Locked groups are Factory1 defaults used by reports and posting.
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {masterGroups.filter((group) => group.systemGroup).length} locked
                  </Badge>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {masterGroups.map((group) => {
                    const groupLockedReason = group.systemGroup
                      ? "Default system group. It is required for billing, GST, reports and voucher posting, so it cannot be edited or deleted."
                      : "";
                    const groupDeleteReason =
                      !group.systemGroup && group.ledgerCount > 0
                        ? "This group has ledgers attached. Move or delete those ledgers before deleting the group."
                        : "";

                    return (
                      <div
                        key={group.id}
                        title={groupLockedReason || groupDeleteReason || undefined}
                        className={[
                          "rounded-md border bg-white p-3 shadow-sm transition",
                          group.systemGroup
                            ? "border-slate-200 bg-slate-100 text-slate-500"
                            : "hover:border-slate-300 hover:shadow",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{group.name}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <Badge variant="secondary">
                                {labelCase(group.groupType)}
                              </Badge>
                              {group.systemGroup ? (
                                <Badge variant="outline" className="gap-1">
                                  <LockKeyhole className="h-3 w-3" />
                                  Locked
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {group.ledgerCount}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              ledgers
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
                          <span className="text-xs text-muted-foreground">
                            {group.affectsGrossProfit
                              ? "Trading / gross profit"
                              : "Balance sheet / indirect"}
                          </span>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={group.systemGroup}
                              title={groupLockedReason || "Edit group"}
                              onClick={() => editGroup(group)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={group.systemGroup || group.ledgerCount > 0}
                              title={
                                groupLockedReason ||
                                groupDeleteReason ||
                                "Delete group"
                              }
                              onClick={() => setDeleteGroupTarget(group)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border bg-white">
                <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Ledger Register</h3>
                    <p className="text-xs text-muted-foreground">
                      Search ledgers by name, group, GST or contact details.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_220px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={masterSearch}
                        onChange={(event) => setMasterSearch(event.target.value)}
                        placeholder="Search ledgers"
                        className="pl-8"
                      />
                    </div>
                    <Select
                      value={masterLedgerGroupFilter}
                      onValueChange={setMasterLedgerGroupFilter}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All groups</SelectItem>
                        {masterGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="divide-y">
                  {filteredMasterLedgers.map((ledger) => {
                    const ledgerLockedReason = ledger.systemLedger
                      ? "Default system ledger. It is required for posting, GST, opening balances or reports, so it cannot be edited or deleted."
                      : "";

                    return (
                      <div
                        key={ledger.id}
                        title={ledgerLockedReason || undefined}
                        className={[
                          "grid gap-3 p-3 transition lg:grid-cols-[minmax(0,1.4fr)_minmax(160px,0.8fr)_120px_112px]",
                          ledger.systemLedger
                            ? "bg-slate-50 text-slate-500"
                            : "hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate font-medium">
                              {ledger.name}
                            </div>
                            {!ledger.active ? (
                              <Badge variant="outline">Inactive</Badge>
                            ) : null}
                            {ledger.systemLedger ? (
                              <Badge variant="outline" className="gap-1">
                                <LockKeyhole className="h-3 w-3" />
                                Locked
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {ledger.contactName || ledger.gstNumber || "No contact details"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Under</div>
                          <div className="truncate text-sm font-medium">
                            {ledger.groupName}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Balance</div>
                          <div className="text-sm font-semibold">
                            {ledger.balanceType}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={ledger.systemLedger}
                            title={ledgerLockedReason || "Edit ledger"}
                            onClick={() => editLedger(ledger)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={ledger.systemLedger}
                            title={ledgerLockedReason || "Delete ledger"}
                            onClick={() => setDeleteLedgerTarget(ledger)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {!filteredMasterLedgers.length ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No ledgers match the current search or group filter.
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {detailsOpen ? (
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
        ) : null}
      </div>

      <div
        id="voucher-entry"
        hidden={workspace !== "VOUCHERS"}
        className={
          detailsOpen
            ? "grid scroll-mt-24 gap-4 2xl:grid-cols-[minmax(0,1fr)_390px]"
            : "grid scroll-mt-24 gap-4"
        }
      >
        <Card
          className="scroll-mt-24 rounded-lg border-[var(--factory1-border)]"
          style={{ backgroundColor: voucherSurface }}
        >
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5" />
                  {editingVoucher ? "Edit Voucher" : "Voucher Entry"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select type, enter ledger lines, and keep debit and credit balanced.
                </p>
              </div>
              {editingVoucher ? (
                <Badge variant="outline">
                  Editing {editingVoucher.voucherNumber}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {vouchersDisabledReason ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {vouchersDisabledReason}
              </div>
            ) : null}

            {editingVoucher ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                You are editing a posted manual voucher. Changes are saved with
                an audit trail.
              </div>
            ) : null}

            {!tallyMode ? (
              <div className="flex flex-wrap gap-2">
                {voucherTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={Boolean(vouchersDisabledReason)}
                      onClick={() => setVoucherType(type)}
                      className={[
                        "rounded-full border px-3 py-2 text-sm font-medium transition",
                        vouchersDisabledReason
                          ? "cursor-not-allowed bg-slate-100 text-slate-400 opacity-60"
                          : voucherType === type
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {labelCase(type)}
                    </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 rounded-lg border bg-slate-50/70 p-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={voucherDate}
                  disabled={Boolean(vouchersDisabledReason)}
                  onChange={(event) => setVoucherDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Narration</Label>
                <Input
                  value={voucherNarration}
                  disabled={Boolean(vouchersDisabledReason)}
                  onChange={(event) => setVoucherNarration(event.target.value)}
                  placeholder={voucherHelp[voucherType]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Voucher Number</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={voucherNumber}
                  disabled={Boolean(vouchersDisabledReason)}
                  onChange={(event) => setVoucherNumber(event.target.value)}
                  placeholder={suggestingNumber ? "Generating…" : "Auto"}
                />
              </div>
              {voucherNumberTaken ? (
                <p className="text-xs text-destructive">
                  This voucher number already exists. Use a different one.
                </p>
              ) : checkingVoucherNumber ? (
                <p className="text-xs text-slate-400">Checking availability…</p>
              ) : null}
            </div>

            <div className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-3 py-2">
                <div>
                  <h3 className="text-sm font-semibold">Ledger Lines</h3>
                  <p className="text-xs text-muted-foreground">
                    Add at least one debit and one credit line.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(vouchersDisabledReason)}
                    onClick={() => handleWorkspaceChange("MASTERS")}
                  >
                    <Landmark className="mr-2 h-4 w-4" />
                    Ledger
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(vouchersDisabledReason)}
                    onClick={() =>
                      setVoucherLines((current) => [
                        ...current,
                        newVoucherLine("DR"),
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Line
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
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
                          disabled={Boolean(vouchersDisabledReason)}
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
                          disabled={Boolean(vouchersDisabledReason)}
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
                          disabled={Boolean(vouchersDisabledReason)}
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
                          disabled={Boolean(vouchersDisabledReason)}
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
                          disabled={
                            Boolean(vouchersDisabledReason) ||
                            voucherLines.length <= 2
                          }
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
            </div>

            <div className="rounded-lg border bg-slate-950 p-3 text-white">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <VoucherTotalTile label="Debit" value={formatCurrency(voucherTotals.debit)} />
                <VoucherTotalTile label="Credit" value={formatCurrency(voucherTotals.credit)} />
                <Badge
                  variant="outline"
                  className={[
                    "justify-center border-white/20 px-3 py-1 text-white",
                    Math.abs(voucherTotals.debit - voucherTotals.credit) <= 0.009
                      ? "bg-emerald-500/20"
                      : "bg-amber-500/20",
                  ].join(" ")}
                >
                  {Math.abs(voucherTotals.debit - voucherTotals.credit) <= 0.009
                    ? "Balanced"
                    : `Diff ${formatCurrency(Math.abs(voucherTotals.debit - voucherTotals.credit))}`}
                </Badge>
              </div>
              <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:justify-end">
                <Button
                  disabled={Boolean(vouchersDisabledReason)}
                  onClick={autoBalanceVoucher}
                >
                  Auto Balance
                </Button>
                {editingVoucher ? (
                  <Button
                    disabled={Boolean(vouchersDisabledReason)}
                    onClick={resetVoucherForm}
                  >
                    Cancel Edit
                  </Button>
                ) : null}
                <Button
                  onClick={submitVoucher}
                  disabled={
                      Boolean(vouchersDisabledReason) ||
                    createVoucherState.isLoading ||
                    updateVoucherState.isLoading ||
                    voucherNumberTaken ||
                    checkingVoucherNumber ||
                    Math.abs(voucherTotals.debit - voucherTotals.credit) > 0.009
                  }
                >
                  {editingVoucher ? "Save Voucher" : "Post Voucher"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {detailsOpen ? (
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <DayBookMetric label="Vouchers" value={String(filteredVouchers.length)} />
              <DayBookMetric
                label="Movement"
                value={vouchersFetching ? "..." : formatCurrency(dayBookSummary.totalDebit)}
              />
              <DayBookMetric
                label="Type"
                value={dayBookFilter === "ALL" ? "All" : labelCase(dayBookFilter)}
              />
            </div>

            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {filteredVouchers.map((voucher) => (
                <div key={voucher.id} className="rounded-md border bg-white p-3 hover:bg-slate-50">
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
                    <Badge variant="secondary">
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
                  <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t pt-2">
                    {voucher.sourceBillId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Open source bill"
                        onClick={() => router.push("/billing")}
                      >
                        Source
                      </Button>
                    ) : null}
		                    <Button
		                      size="sm"
		                      variant="outline"
	                      disabled={
                          Boolean(vouchersDisabledReason) ||
                          Boolean(voucher.sourceType)
                        }
                          title="Edit voucher"
		                      onClick={() => editVoucherInEntry(voucher)}
		                    >
	                      <Edit2 className="h-4 w-4" />
	                    </Button>
		                    <Button
		                      size="sm"
		                      variant="outline"
                        disabled={Boolean(vouchersDisabledReason)}
                        title="Copy to entry"
		                      onClick={() => copyVoucherToEntry(voucher)}
		                    >
	                      <Copy className="h-4 w-4" />
	                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Print voucher"
                      onClick={() => printVoucher(voucher)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
		                    <Button
		                      size="sm"
	                      variant="outline"
	                      disabled={
                          Boolean(vouchersDisabledReason) ||
                          Boolean(voucher.sourceType)
                        }
                          title="Cancel voucher"
		                      onClick={() => {
                        setCancelVoucherTarget(voucher);
                        setCancelVoucherReason("");
                      }}
                    >
	                      <Trash2 className="h-4 w-4" />
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
        ) : null}
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
        <CardHeader className="border-b">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>Profit & Loss</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Income and expenses from accounting voucher movement.
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr_0.9fr]">
            <TaxMetric
              label="Net Profit"
              value={formatCurrency(reportNetProfit)}
              helper="After indirect income and expenses"
              loading={profitLossFetching}
              tone={reportNetProfit >= 0 ? "dark" : "light"}
            />
            <TaxMetric
              label="Trading Income"
              value={formatCurrency(profitLoss?.tradingIncome ?? 0)}
              helper="Direct sales and operating income"
              loading={profitLossFetching}
            />
            <TaxMetric
              label="Trading Expense"
              value={formatCurrency(profitLoss?.tradingExpense ?? 0)}
              helper="Purchases and direct expenses"
              loading={profitLossFetching}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="overflow-x-auto rounded-md border">
              <table className="responsive-table w-full min-w-[920px] text-sm">
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
                      <td className="p-3 font-medium" data-label="Ledger">
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
                      <td className="p-3" data-label="Group">{row.groupName ?? "-"}</td>
                      <td className="p-3" data-label="Section">{row.section}</td>
                      <td className="p-3 text-right font-semibold" data-label="Amount">
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
        <CardHeader className="border-b">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>Balance Sheet</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Assets, liabilities and current period profit.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  Math.abs(balanceDifference) > 0.009
                    ? "destructive"
                    : "outline"
                }
              >
                {balanceSheetFetching
                  ? "Loading"
                  : Math.abs(balanceDifference) > 0.009
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TaxMetric
              label="Assets"
              value={formatCurrency(balanceSheet?.totalAssets ?? 0)}
              helper="Total asset balances"
              loading={balanceSheetFetching}
            />
            <TaxMetric
              label="Liabilities"
              value={formatCurrency(balanceSheet?.totalLiabilities ?? 0)}
              helper="Capital and liabilities"
              loading={balanceSheetFetching}
            />
            <TaxMetric
              label="Current Profit"
              value={formatCurrency(balanceSheet?.netProfit ?? 0)}
              helper="From Profit & Loss"
              loading={balanceSheetFetching}
            />
            <TaxMetric
              label="Difference"
              value={formatCurrency(balanceDifference)}
              helper="Balance check"
              loading={balanceSheetFetching}
              tone={Math.abs(balanceDifference) > 0.009 ? "dark" : "light"}
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
            <table className="responsive-table w-full min-w-[1080px] text-sm">
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
                      <td className="p-3 font-medium" data-label="Ledger">
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
                      <td className="p-3" data-label="Group">{row.groupName ?? "-"}</td>
                      <td className="p-3 text-right" data-label="Opening Dr">
                        {formatCurrency(row.openingDebit)}
                      </td>
                      <td className="p-3 text-right" data-label="Opening Cr">
                        {formatCurrency(row.openingCredit)}
                      </td>
                      <td className="p-3 text-right" data-label="Period Dr">
                        {formatCurrency(row.periodDebit)}
                      </td>
                      <td className="p-3 text-right" data-label="Period Cr">
                        {formatCurrency(row.periodCredit)}
                      </td>
                      <td className="p-3 text-right font-semibold" data-label="Closing Dr">
                        {formatCurrency(row.closingDebit)}
                      </td>
                      <td className="p-3 text-right font-semibold" data-label="Closing Cr">
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
        hidden={workspace !== "TAXES"}
        className="grid gap-4 xl:grid-cols-2"
      >
        <Card className="rounded-lg xl:col-span-2">
          <CardHeader className="border-b">
            <div>
              <CardTitle>Tax Centre</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                GST returns, TDS/TCS tracking and tax-section setup for the active accounting period.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <TaxMetric
              label="Output GST"
              value={formatCurrency(outputGstTotal)}
              helper="Sales tax collected"
              loading={gstSummaryFetching}
            />
            <TaxMetric
              label="Input GST"
              value={formatCurrency(inputGstTotal)}
              helper="Purchase tax credit"
              loading={gstSummaryFetching}
            />
            <TaxMetric
              label="Net Payable"
              value={formatCurrency(gstSummary?.netGstPayable ?? 0)}
              helper="Output minus input"
              loading={gstSummaryFetching}
              tone={(gstSummary?.netGstPayable ?? 0) > 0 ? "dark" : "light"}
            />
            <TaxMetric
              label="Tax Sections"
              value={`${activeTaxSections}/${taxSections.length}`}
              helper="Active / total"
              loading={taxSectionsFetching}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <CardTitle>GSTR-1 Sales Register</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Outward supplies from posted sales bills.
                </p>
              </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportGstr1}
                disabled={!gstSalesRows.length}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            </div>
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
                value={formatCurrency(outputGstTotal)}
                loading={gstSummaryFetching}
              />
            </div>
            <div className="max-h-[320px] overflow-auto rounded-md border">
              <table className="responsive-table w-full min-w-[760px] text-sm">
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
                  {gstSalesRows.map((row) => (
                      <tr key={row.billNumber} className="border-t">
                        <td className="p-3 font-medium" data-label="Invoice">{row.billNumber}</td>
                        <td className="p-3" data-label="Customer">{row.partyName}</td>
                        <td className="p-3" data-label="GSTIN">{row.partyGstNumber || "-"}</td>
                        <td className="p-3 text-right" data-label="Taxable">
                          {formatCurrency(row.taxableAmount)}
                        </td>
                        <td className="p-3 text-right" data-label="GST">
                          {formatCurrency(row.cgstAmount + row.sgstAmount + row.igstAmount)}
                        </td>
                        <td className="p-3 text-right font-semibold" data-label="Total">
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
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <CardTitle>GSTR-3B Summary</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payable view from sales and purchase tax.
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
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-slate-950 p-4 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Net GST Payable
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {gstSummaryFetching ? "..." : formatCurrency(gstSummary?.netGstPayable ?? 0)}
              </div>
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
                <VoucherTotalTile label="Output" value={formatCurrency(outputGstTotal)} />
                <VoucherTotalTile label="Input" value={formatCurrency(inputGstTotal)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InlineMetric
                title="Sales Taxable"
                value={formatCurrency(gstSummary?.salesTaxableAmount ?? 0)}
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

        <Card className="rounded-lg xl:col-span-2">
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <CardTitle>Tax Sections Setup</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick from catalog, edit rates, and disable unused GST/TDS/TCS sections.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["GST", "TDS", "TCS"].map((type) => (
                  <Badge key={type} variant="outline">
                    {type}: {taxSectionsByType[type] ?? 0}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-3 rounded-lg border bg-slate-50/70 p-4">
              <div>
                <h3 className="text-sm font-semibold">
                  {taxSectionDraft.id ? "Edit Section" : "Add Section"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Suggestions are editable because tax applicability can vary.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Catalog suggestion</Label>
                <Select
                  value={`${taxSectionDraft.taxType}:${taxSectionDraft.sectionCode}`}
                  onValueChange={(value) => {
                    const [taxType, sectionCode] = value.split(":");
                    const section = taxSectionCatalog.find(
                      (item) =>
                        item.taxType === taxType &&
                        item.sectionCode === sectionCode
                    );
                    if (section) {
                      applyTaxCatalogSection(section);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tax section" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxSectionCatalog.map((section) => (
                      <SelectItem
                        key={`${section.taxType}:${section.sectionCode}`}
                        value={`${section.taxType}:${section.sectionCode}`}
                      >
                        {section.taxType} {section.sectionCode} - {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label>Tax type</Label>
                  <Select
                    value={taxSectionDraft.taxType}
                    onValueChange={(value) =>
                      setTaxSectionDraft((current) => ({
                        ...current,
                        taxType: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["GST", "TDS", "TCS"].map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section code</Label>
                  <Input
                    value={taxSectionDraft.sectionCode}
                    onChange={(event) =>
                      setTaxSectionDraft((current) => ({
                        ...current,
                        sectionCode: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                  <Label>Name</Label>
                  <Input
                    value={taxSectionDraft.name}
                    onChange={(event) =>
                      setTaxSectionDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.001"
                    value={taxSectionDraft.rate}
                    onChange={(event) =>
                      setTaxSectionDraft((current) => ({
                        ...current,
                        rate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={taxSectionDraft.active ? "ACTIVE" : "INACTIVE"}
                    onValueChange={(value) =>
                      setTaxSectionDraft((current) => ({
                        ...current,
                        active: value === "ACTIVE",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                  <Label>Applicable for</Label>
                  <Input
                    value={taxSectionDraft.applicableFor}
                    onChange={(event) =>
                      setTaxSectionDraft((current) => ({
                        ...current,
                        applicableFor: event.target.value,
                      }))
                    }
                    placeholder="Example: Contractor payments"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={saveTaxSection}
                  disabled={
                    createTaxSectionState.isLoading ||
                    updateTaxSectionState.isLoading
                  }
                >
                  {taxSectionDraft.id ? "Save Section" : "Add Section"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTaxSectionDraft(emptyTaxSectionDraft())}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-white">
              <div className="flex items-center justify-between border-b p-3">
                <div>
                  <h3 className="text-sm font-semibold">Configured Sections</h3>
                  <p className="text-xs text-muted-foreground">
                    {taxSectionsFetching ? "Loading sections" : `${taxSections.length} sections configured`}
                  </p>
                </div>
                <Badge variant="secondary">{activeTaxSections} active</Badge>
              </div>
              <div className="grid gap-2 p-3 md:grid-cols-2">
                {taxSections.map((section) => (
                  <div
                    key={section.id ?? section.sectionCode}
                    className={[
                      "rounded-md border p-3",
                      section.active ? "bg-white" : "bg-slate-50 text-slate-500",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{section.taxType}</Badge>
                          <span className="font-semibold">{section.sectionCode}</span>
                        </div>
                        <div className="mt-2 truncate text-sm font-medium">
                          {section.name}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {section.applicableFor || "General applicability"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {Number(section.rate || 0)}%
                        </div>
                        <Badge variant={section.active ? "outline" : "secondary"}>
                          {section.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end border-t pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editTaxSection(section)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
                {!taxSections.length && !taxSectionsFetching ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground md:col-span-2">
                    No tax sections configured yet.
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg xl:col-span-2">
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <CardTitle>TDS / TCS Control</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deduction and collection movement from tax ledgers.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setWorkspace("VOUCHERS");
                  setVoucherType("JOURNAL");
                  setVoucherNarration("TDS/TCS adjustment");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Journal Entry
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {taxLedgerSummary.rows.map((row) => (
                <TaxMetric
                  key={row.name}
                  label={row.name}
                  value={formatCurrency(row.net)}
                  helper={row.description}
                  loading={vouchersFetching || mastersFetching}
                />
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {taxLedgerSummary.rows.map((row) => (
                <div key={row.name} className="rounded-md border bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{row.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.description}
                      </div>
                    </div>
                    <Badge variant="outline">{formatCurrency(row.net)}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Debit</div>
                      <div className="font-semibold">{formatCurrency(row.debit)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Credit</div>
                      <div className="font-semibold">{formatCurrency(row.credit)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        hidden={workspace !== "REPORTS"}
        className="grid gap-4 lg:grid-cols-2"
      >
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Group Summary</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Closing balances by account group.
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="responsive-table w-full min-w-[620px] text-sm">
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
                      <td className="p-3 font-medium" data-label="Group">{row.groupName}</td>
                      <td className="p-3 text-right" data-label="Ledgers">{row.ledgerCount}</td>
                      <td className="p-3 text-right" data-label="Closing Dr">
                        {formatCurrency(row.closingDebit)}
                      </td>
                      <td className="p-3 text-right" data-label="Closing Cr">
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
          <CardHeader className="border-b">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="responsive-table w-full min-w-[720px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Month</th>
                    <th className="p-3 text-right">Vouchers</th>
                    <th className="p-3 text-right">Payment</th>
                    <th className="p-3 text-right">Receipt</th>
                    <th className="p-3 text-right">Contra</th>
                    <th className="p-3 text-right">Journal</th>
                    <th className="p-3 text-right">Debit Note</th>
                    <th className="p-3 text-right">Credit Note</th>
                    <th className="p-3 text-right">Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((row) => (
                    <tr key={row.month} className="border-t">
                      <td className="p-3 font-medium" data-label="Month">{row.month}</td>
                      <td className="p-3 text-right" data-label="Vouchers">{row.voucherCount}</td>
                      <td className="p-3 text-right" data-label="Payment">
                        {formatCurrency(row.payment)}
                      </td>
                      <td className="p-3 text-right" data-label="Receipt">
                        {formatCurrency(row.receipt)}
                      </td>
                      <td className="p-3 text-right" data-label="Contra">
                        {formatCurrency(row.contra)}
                      </td>
                      <td className="p-3 text-right" data-label="Journal">
                        {formatCurrency(row.journal)}
                      </td>
                      <td className="p-3 text-right" data-label="Debit Note">
                        {formatCurrency(row.debitNote)}
                      </td>
                      <td className="p-3 text-right" data-label="Credit Note">
                        {formatCurrency(row.creditNote)}
                      </td>
                      <td className="p-3 text-right font-semibold" data-label="Movement">
                        {formatCurrency(row.totalMovement)}
                      </td>
                    </tr>
                  ))}
                  {!monthlySummary.length ? (
                    <tr>
                      <td
                        className="p-8 text-center text-muted-foreground"
                        colSpan={9}
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
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <table className="responsive-table w-full min-w-[760px] text-sm">
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
                      <td className="p-3 font-medium" data-label="Month">{row.month}</td>
                      <td className="p-3" data-label="Ledger">
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
                      <td className="p-3 text-right" data-label="Debit">
                        {formatCurrency(row.debit)}
                      </td>
                      <td className="p-3 text-right" data-label="Credit">
                        {formatCurrency(row.credit)}
                      </td>
                      <td className="p-3 text-right font-semibold" data-label="Net">
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
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-lg">
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

      <Sheet
        open={accountingSettingsOpen}
        onOpenChange={setAccountingSettingsOpen}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Accounting Settings</SheetTitle>
            <SheetDescription>
              Tally-style controls for masters, vouchers, tax ledgers and reporting defaults.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            <div className="rounded-lg border bg-slate-950 p-4 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Active accounting period
              </div>
              <div className="mt-1 text-lg font-semibold">
                {fromDate} to {toDate}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-slate-300">Groups</div>
                  <div className="font-semibold">{masters?.groups.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-slate-300">Ledgers</div>
                  <div className="font-semibold">{masters?.ledgers.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-slate-300">Vouchers</div>
                  <div className="font-semibold">{vouchers?.length ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Core settings</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Active period from</Label>
                    <Input
                      type="date"
                      value={accountingSettingsDraft.activeAccountingPeriodStart}
                      onChange={(event) =>
                        setAccountingSettingsDraft((current) => ({
                          ...current,
                          activeAccountingPeriodStart: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Active period to</Label>
                    <Input
                      type="date"
                      value={accountingSettingsDraft.activeAccountingPeriodEnd}
                      onChange={(event) =>
                        setAccountingSettingsDraft((current) => ({
                          ...current,
                          activeAccountingPeriodEnd: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={accountingSettingsDraft.currency}
                      onChange={(event) =>
                        setAccountingSettingsDraft((current) => ({
                          ...current,
                          currency: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="INR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input
                      value={accountingSettingsDraft.timezone}
                      onChange={(event) =>
                        setAccountingSettingsDraft((current) => ({
                          ...current,
                          timezone: event.target.value,
                        }))
                      }
                      placeholder="Asia/Kolkata"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Financial year starts</Label>
                    <Select
                      value={accountingSettingsDraft.financialYearStartMonth}
                      onValueChange={(value) =>
                        setAccountingSettingsDraft((current) => ({
                          ...current,
                          financialYearStartMonth: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Week starts</Label>
                    <Select
                      value={accountingSettingsDraft.weekStartDay}
                      onValueChange={(value) =>
                        setAccountingSettingsDraft((current) => ({
                          ...current,
                          weekStartDay: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekStartOptions.map((day) => (
                          <SelectItem key={day} value={day}>
                            {labelCase(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <AccountingSettingToggle
                title="Accounting masters"
                description="Groups and ledgers are enabled with protected system masters."
                checked={accountingSettingsDraft.accountingMastersEnabled}
                meta={`${masters?.groups.length ?? 0} groups`}
                onChange={(checked) =>
                  setAccountingSettingsDraft((current) => ({
                    ...current,
                    accountingMastersEnabled: checked,
                  }))
                }
              />
              <AccountingSettingToggle
                title="Voucher controls"
                description="Payment, receipt, contra, journal, debit note and credit note are enabled."
                checked={accountingSettingsDraft.accountingVouchersEnabled}
                meta={accountingSettingsDraft.accountingVouchersEnabled ? "Enabled" : "Disabled"}
                onChange={(checked) =>
                  setAccountingSettingsDraft((current) => ({
                    ...current,
                    accountingVouchersEnabled: checked,
                  }))
                }
              />
              <AccountingSettingToggle
                title="Taxation"
                description="GST, TDS and TCS ledgers are available under Duties & Taxes."
                checked={accountingSettingsDraft.accountingTaxationEnabled}
                meta={`${taxLedgerSummary.readyCount}/4 ready`}
                onChange={(checked) =>
                  setAccountingSettingsDraft((current) => ({
                    ...current,
                    accountingTaxationEnabled: checked,
                  }))
                }
              />
              <AccountingSettingToggle
                title="Reports"
                description="Trial balance, P&L, balance sheet, GST, aging and day book use posted vouchers."
                checked={accountingSettingsDraft.accountingReportsEnabled}
                meta="Posted only"
                onChange={(checked) =>
                  setAccountingSettingsDraft((current) => ({
                    ...current,
                    accountingReportsEnabled: checked,
                  }))
                }
              />
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Tax ledgers</h3>
              <div className="mt-3 grid gap-2">
                {taxLedgerSummary.rows.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.ledgerId ? "Mapped under accounting masters" : "Will be created when masters refresh"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={row.ledgerId ? "outline" : "secondary"}>
                        {row.ledgerId ? "Ready" : "Pending"}
                      </Badge>
                      {row.name.startsWith("TDS") ? (
                        <MiniToggle
                          checked={accountingSettingsDraft.tdsEnabled}
                          onChange={(checked) =>
                            setAccountingSettingsDraft((current) => ({
                              ...current,
                              tdsEnabled: checked,
                            }))
                          }
                        />
                      ) : null}
                      {row.name.startsWith("TCS") ? (
                        <MiniToggle
                          checked={accountingSettingsDraft.tcsEnabled}
                          onChange={(checked) =>
                            setAccountingSettingsDraft((current) => ({
                              ...current,
                              tcsEnabled: checked,
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => {
                  setWorkspace("MASTERS");
                  setAccountingSettingsOpen(false);
                }}
              >
                <Landmark className="mr-2 h-4 w-4" />
                Open Masters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setWorkspace("TAXES");
                  setAccountingSettingsOpen(false);
                }}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Open Taxes
              </Button>
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={saveAccountingSettings}
              disabled={updateOrganizationSettingsState.isLoading}
            >
              Save Settings
            </Button>
            <SheetClose asChild>
              <Button variant="outline">Done</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
              This will delete {deleteLedgerTarget?.name}. Ledgers with voucher
              entries, bills or accounting history are protected and cannot be
              deleted.
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
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="text-xl font-semibold sm:text-2xl">
          {loading ? "..." : value}
        </div>
      </CardContent>
    </Card>
  );
}

function MasterMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}

function VoucherTotalTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-300">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function DayBookMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-slate-50 p-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function TaxMetric({
  label,
  value,
  helper,
  loading,
  tone = "light",
}: {
  label: string;
  value: string;
  helper: string;
  loading: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={[
        "rounded-md border p-3",
        tone === "dark"
          ? "border-slate-900 bg-slate-950 text-white"
          : "bg-white",
      ].join(" ")}
    >
      <div
        className={[
          "text-xs font-medium uppercase tracking-wide",
          tone === "dark" ? "text-slate-300" : "text-muted-foreground",
        ].join(" ")}
      >
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{loading ? "..." : value}</div>
      <div
        className={[
          "mt-1 line-clamp-2 text-xs",
          tone === "dark" ? "text-slate-300" : "text-muted-foreground",
        ].join(" ")}
      >
        {helper}
      </div>
    </div>
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

function AccountingSettingRow({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </div>
      <Badge variant="outline" className="shrink-0">
        {value}
      </Badge>
    </div>
  );
}

function AccountingSettingToggle({
  title,
  description,
  checked,
  meta,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  meta: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        <div className="mt-2">
          <Badge variant="outline">{meta}</Badge>
        </div>
      </div>
      <MiniToggle checked={checked} onChange={onChange} />
    </div>
  );
}

function MiniToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Select
      value={checked ? "YES" : "NO"}
      onValueChange={(value) => onChange(value === "YES")}
    >
      <SelectTrigger className="h-8 w-[84px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="YES">Yes</SelectItem>
        <SelectItem value="NO">No</SelectItem>
      </SelectContent>
    </Select>
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
      <div className="overflow-x-auto rounded-md border">
        <div className="flex items-center justify-between bg-muted px-3 py-2 text-sm font-semibold">
          <span>{title}</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <table className="responsive-table w-full text-sm">
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
              <td className="p-3 font-medium" data-label="Ledger">
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
              <td className="p-3" data-label="Group">{row.groupName ?? "-"}</td>
              <td className="p-3 text-right font-semibold" data-label="Amount">
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
        <table className="responsive-table w-full min-w-[720px] text-sm">
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
                <td className="p-3 font-medium" data-label="Bill">{row.billNumber}</td>
                <td className="p-3" data-label="Party">{row.partyName}</td>
                <td className="p-3" data-label="Due">{row.dueDate ?? row.billDate}</td>
                <td className="p-3 text-right" data-label="Days">{row.daysOverdue}</td>
                <td className="p-3" data-label="Bucket">{row.bucket}</td>
                <td className="p-3 text-right font-semibold" data-label="Outstanding">
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

function currentFinancialYearRange(startMonth = 4) {
  const now = new Date();
  const startYear =
    now.getMonth() + 1 >= startMonth ? now.getFullYear() : now.getFullYear() - 1;

  return {
    fromDate: toIsoDate(new Date(startYear, startMonth - 1, 1)),
    toDate: toIsoDate(new Date(startYear + 1, startMonth - 1, 0)),
  };
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

function apiErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeError = error as {
    data?: {
      message?: unknown;
    };
    error?: unknown;
  };

  if (typeof maybeError.data?.message === "string") {
    return maybeError.data.message;
  }

  if (typeof maybeError.error === "string") {
    return maybeError.error;
  }

  return null;
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
      debitNote: number;
      creditNote: number;
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
        debitNote: 0,
        creditNote: 0,
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
    } else if (voucher.voucherType === "DEBIT_NOTE") {
      row.debitNote += Number(voucher.totalDebit || 0);
    } else if (voucher.voucherType === "CREDIT_NOTE") {
      row.creditNote += Number(voucher.totalDebit || 0);
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

function summarizeTaxLedgers(
  vouchers: AccountingVoucher[],
  ledgers: AccountLedger[]
) {
  const taxDefinitions = [
    {
      name: "TDS Receivable",
      description: "TDS deducted by customers and recoverable/creditable.",
    },
    {
      name: "TDS Payable",
      description: "TDS deducted by factory and payable to government.",
    },
    {
      name: "TCS Receivable",
      description: "TCS paid/collected by counterparties and recoverable.",
    },
    {
      name: "TCS Payable",
      description: "TCS collected from customers and payable to government.",
    },
  ];

  const rows = taxDefinitions.map((definition) => {
    const ledger = ledgers.find(
      (item) => item.name.toLowerCase() === definition.name.toLowerCase()
    );

    const movement = vouchers.reduce(
      (total, voucher) => {
        voucher.lines
          .filter((line) => line.ledgerId === ledger?.id)
          .forEach((line) => {
            if (line.entryType === "DR") {
              total.debit += Number(line.amount || 0);
            } else {
              total.credit += Number(line.amount || 0);
            }
          });

        return total;
      },
      { debit: 0, credit: 0 }
    );

    return {
      ...definition,
      ledgerId: ledger?.id ?? null,
      debit: movement.debit,
      credit: movement.credit,
      net: Math.abs(movement.debit - movement.credit),
    };
  });

  return {
    rows,
    readyCount: rows.filter((row) => row.ledgerId).length,
  };
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

function formatDisplayDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function emptyTaxSectionDraft(): TaxSectionDraft {
  return {
    id: null,
    taxType: "TDS",
    sectionCode: "",
    name: "",
    rate: "0",
    applicableFor: "",
    active: true,
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

  return null;
}

function voucherSurfaceFor(type: VoucherType) {
  switch (type) {
    case "CONTRA":
      return "var(--factory1-surface)";
    case "PAYMENT":
      return "var(--factory1-surface)";
    case "RECEIPT":
      return "var(--factory1-surface)";
    case "JOURNAL":
      return "var(--factory1-surface)";
    case "DEBIT_NOTE":
      return "var(--factory1-surface)";
    case "CREDIT_NOTE":
      return "var(--factory1-surface)";
    default:
      return "var(--factory1-surface)";
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
