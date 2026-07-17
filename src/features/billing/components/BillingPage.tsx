"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeIndianRupee,
  Download,
  FileSpreadsheet,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  ReceiptIndianRupee,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGetActiveCustomersQuery } from "@/features/customers/api/customerApi";
import { useGetActiveSuppliersQuery } from "@/features/suppliers/api/supplierApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import { useGetProductsQuery } from "@/features/products/api/productsApi";
import { useGetOrganizationSettingsQuery } from "@/features/organization-settings/api/organizationSettingsApi";
import type { InventoryItem } from "@/features/inventory/types/inventory.types";
import type { Product } from "@/features/products/types/product.types";
import {
  useCancelBillMutation,
  useCancelEwayBillMutation,
  useCheckBillNumberAvailabilityQuery,
  useCreateBillMutation,
  useGenerateEwayBillMutation,
  useGetBillsQuery,
  useGetEwayBillDetailsMutation,
  useGetBillNumberSuggestionQuery,
  usePostBillMutation,
  useLazyGetGstReportQuery,
  useLazyGetGstSuggestionsQuery,
  useRecordBillPaymentMutation,
} from "../api/billingApi";
import type { Bill, BillStatus, BillType, GstRateSuggestion, PaymentStatus } from "../types/billing.types";
import { exportBillsCsv } from "../utils/billingExport";
import { exportGstReportCsv } from "../utils/gstReportExport";
import { printInvoice } from "../utils/invoicePrint";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { inferIntraState, stateNameFromGstNumber } from "@/lib/gstState";
import { handleTallyFieldNavigation } from "@/lib/tallyKeyboard";
import { playUiSound } from "@/lib/uiSounds";
import { GstIntegrationPanel } from "@/features/gst-integration/components/GstIntegrationPanel";
import { AutoPurchaseBillImportDialog } from "./AutoPurchaseBillImportDialog";

type DraftItem = {
  rowId: string;
  productId: string;
  inventoryItemId: string;
  itemName: string;
  hsnCode: string;
  unit: string;
  quantity: number;
  rate: number;
  discountAmount: number;
  gstRate: number;
  suggestions: GstRateSuggestion[];
};

type PartyLike = {
  gstNumber?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  paymentTerms?: string | null;
};

type VoucherMode = {
  type: BillType;
  title: string;
  subtitle: string;
  icon: typeof ArrowUpFromLine;
};

const today = new Date().toISOString().slice(0, 10);

const voucherModes: VoucherMode[] = [
  {
    type: "SALES",
    title: "Sales Voucher",
    subtitle: "Customer invoice, stock out, output GST",
    icon: ArrowUpFromLine,
  },
  {
    type: "PURCHASE",
    title: "Purchase Voucher",
    subtitle: "Supplier bill, stock in, input GST",
    icon: ArrowDownToLine,
  },
];

const newItem = (): DraftItem => ({
  rowId: crypto.randomUUID(),
  productId: "",
  inventoryItemId: "",
  itemName: "",
  hsnCode: "",
  unit: "PCS",
  quantity: 1,
  rate: 0,
  discountAmount: 0,
  gstRate: 18,
  suggestions: [],
});

export function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [type, setType] = useState<BillType>(() =>
    initialBillType(searchParams.get("type"))
  );
  const [partyId, setPartyId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billNumberTouched, setBillNumberTouched] = useState(false);
  const [billDate, setBillDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [intraState, setIntraState] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");
  const [ewayBillDate, setEwayBillDate] = useState("");
  const [ewayBillValidUntil, setEwayBillValidUntil] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dispatchFrom, setDispatchFrom] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);

  const { data: customers = [] } = useGetActiveCustomersQuery();
  const { data: suppliers = [] } = useGetActiveSuppliersQuery();
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 500,
    status: "ACTIVE",
  });
  const { data: productsPage } = useGetProductsQuery({ page: 0, size: 300 });
  const { data: orgSettingsResponse } = useGetOrganizationSettingsQuery();
  const { data: billNumberSuggestion } = useGetBillNumberSuggestionQuery(type);
  const billNumberForCheck = billNumber.trim();
  const {
    data: billNumberAvailability,
    isFetching: billNumberChecking,
  } = useCheckBillNumberAvailabilityQuery(billNumberForCheck, {
    skip: !billNumberForCheck,
  });
  const { data: billsPage, isLoading: billsLoading } = useGetBillsQuery({
    type,
    page: 0,
    size: 8,
  });

  const [createBill, createState] = useCreateBillMutation();
  const [cancelBill, cancelState] = useCancelBillMutation();
  const [postBill, postState] = usePostBillMutation();
  const [recordBillPayment, paymentState] = useRecordBillPaymentMutation();
  const [generateEwayBill, generateEwayState] = useGenerateEwayBillMutation();
  const [getEwayBillDetails, ewayDetailsState] = useGetEwayBillDetailsMutation();
  const [cancelEwayBill, cancelEwayState] = useCancelEwayBillMutation();
  const [getGstSuggestions, gstState] = useLazyGetGstSuggestionsQuery();
  const [getGstReport, gstReportState] = useLazyGetGstReportQuery();
  const logDataJob = useLogDataJob();

  const inventoryItems = useMemo(
    () => inventoryPage?.content ?? [],
    [inventoryPage]
  );
  const products = useMemo(
    () => productsPage?.content ?? [],
    [productsPage]
  );
  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems]
  );
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const totals = useMemo(
    () => calculateTotals(items, intraState),
    [items, intraState]
  );
  const mode =
    voucherModes.find((entry) => entry.type === type) ?? voucherModes[0];
  const parties = type === "SALES" ? customers : suppliers;
  const selectedParty = parties.find((party) => party.id === partyId);
  const orgSettings = orgSettingsResponse?.data;
  const factoryState =
    orgSettings?.state || stateNameFromGstNumber(orgSettings?.gstNumber) || "";
  const selectedPartyAddress = selectedParty
    ? getPartyAddress(selectedParty)
    : "";
  const selectedPartyDestination = selectedParty
    ? getPartyDestination(selectedParty)
    : "";
  const inferredGstTreatment = inferIntraState(
    factoryState,
    selectedParty?.state || stateNameFromGstNumber(selectedParty?.gstNumber) || placeOfSupply
  );
  const voucherSurface = "var(--factory1-surface)";
  const voucherSubtleSurface = "var(--factory1-background)";
  const billNumberUnavailable =
    Boolean(billNumberForCheck) && billNumberAvailability?.available === false;

  useEffect(() => {
    const factoryDispatch =
      [orgSettings?.city, orgSettings?.state].filter(Boolean).join(", ") ||
      orgSettings?.location ||
      "";

    if (factoryDispatch) {
      setDispatchFrom(factoryDispatch);
    }
  }, [orgSettings?.city, orgSettings?.location, orgSettings?.state]);

  useEffect(() => {
    if (!billNumberTouched && billNumberSuggestion?.billNumber) {
      setBillNumber(billNumberSuggestion.billNumber);
    }
  }, [billNumberSuggestion?.billNumber, billNumberTouched]);

  useEffect(() => {
    if (!orgSettings?.activeAccountingPeriodStart || !orgSettings.activeAccountingPeriodEnd) {
      return;
    }
    const activePeriodStart = orgSettings.activeAccountingPeriodStart;
    const activePeriodEnd = orgSettings.activeAccountingPeriodEnd;

    setBillDate((current) =>
      dateWithinRange(
        current,
        activePeriodStart,
        activePeriodEnd
      )
        ? current
        : activePeriodEnd
    );
  }, [orgSettings?.activeAccountingPeriodStart, orgSettings?.activeAccountingPeriodEnd]);

  const switchVoucher = (
    billType: BillType,
    options: { syncUrl?: boolean } = {}
  ) => {
    setType(billType);
    setPartyId("");
    setItems([newItem()]);
    setBillNumber("");
    setBillNumberTouched(false);

    if (options.syncUrl === false) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("type", billType);
    router.replace(`/billing?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const requestedType = searchParams.get("type");

    if (!requestedType) {
      return;
    }

    const nextType = initialBillType(requestedType);
    if (nextType !== type) {
      switchVoucher(nextType, { syncUrl: false });
    }
  }, [searchParams, type]);

  const addItem = () => {
    setItems((current) => [...current, newItem()]);
  };

  const updateItem = (rowId: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item))
    );
  };

  const openPaymentDialog = (bill: Bill) => {
    setPaymentBill(bill);
    setPaymentAmount(String(bill.paidAmount ?? 0));
  };

  const closePaymentDialog = () => {
    setPaymentBill(null);
    setPaymentAmount("");
  };

  const submitPayment = async () => {
    if (!paymentBill) {
      return;
    }

    const paidAmount = Number(paymentAmount);
    if (
      Number.isNaN(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > Number(paymentBill.grandTotal)
    ) {
      toast.error("Enter a valid paid amount");
      return;
    }

    try {
      await recordBillPayment({
        id: paymentBill.id,
        paidAmount,
      }).unwrap();
      toast.success("Payment updated");
      closePaymentDialog();
    } catch {
      toast.error("Failed to update payment");
    }
  };

  const selectProduct = (rowId: string, productId: string) => {
    const product = productsById.get(productId);
    const inventoryItem = product
      ? inventoryById.get(product.finishedGoodInventoryItemId)
      : undefined;

    updateItem(rowId, {
      productId,
      inventoryItemId: product?.finishedGoodInventoryItemId ?? "",
      itemName: product?.name ?? "",
      hsnCode: inventoryItem?.hsnCode ?? "",
      unit: product?.unit ?? inventoryItem?.unit ?? "PCS",
      rate: Number(inventoryItem?.sellingPrice ?? inventoryItem?.purchasePrice ?? 0),
      gstRate: Number(inventoryItem?.gstRate ?? 18),
      suggestions: [],
    });
  };

  const selectInventoryItem = (rowId: string, inventoryItemId: string) => {
    const inventoryItem = inventoryById.get(inventoryItemId);

    updateItem(rowId, {
      inventoryItemId,
      itemName: inventoryItem?.name ?? "",
      hsnCode: inventoryItem?.hsnCode ?? "",
      unit: inventoryItem?.unit ?? "PCS",
      rate:
        type === "PURCHASE"
          ? Number(inventoryItem?.purchasePrice ?? inventoryItem?.sellingPrice ?? 0)
          : Number(inventoryItem?.sellingPrice ?? inventoryItem?.purchasePrice ?? 0),
      gstRate: Number(inventoryItem?.gstRate ?? 18),
      suggestions: [],
    });
  };

  const lookupGst = async (item: DraftItem) => {
    const query = item.hsnCode || item.itemName;

    if (!query.trim()) {
      toast.error("Enter item name or HSN first");
      return;
    }

    try {
      const suggestions = await getGstSuggestions(query).unwrap();
      updateItem(item.rowId, { suggestions });

      if (!suggestions.length) {
        toast.info("No GST suggestion found. Please verify manually.");
      }
    } catch {
      toast.error("Could not fetch GST suggestion");
    }
  };

  const applySuggestion = (rowId: string, suggestion: GstRateSuggestion) => {
    updateItem(rowId, {
      hsnCode: suggestion.hsnCode,
      gstRate: Number(suggestion.igstRate ?? 0),
      suggestions: [],
    });
  };

  const handleCreate = async (status: BillStatus = "POSTED") => {
    const validItems = items.filter(
      (item) => item.quantity > 0 && item.rate >= 0 && item.inventoryItemId
    );

    if (!partyId) {
      toast.error(type === "SALES" ? "Select customer ledger" : "Select supplier ledger");
      return;
    }

    if (!validItems.length) {
      toast.error("Add at least one valid stock item");
      return;
    }

    if (billNumberUnavailable) {
      toast.error("Bill number already exists. Please change it before posting.");
      return;
    }

    try {
      await createBill({
        type,
        status,
        paymentStatus,
        customerId: type === "SALES" ? partyId : undefined,
        supplierId: type === "PURCHASE" ? partyId : undefined,
        billNumber: billNumber || undefined,
        billDate,
        dueDate: dueDate || undefined,
        placeOfSupply: placeOfSupply || selectedPartyDestination || selectedParty?.state || undefined,
        intraState,
        notes,
        ewayBillNumber: ewayBillNumber || undefined,
        ewayBillDate: ewayBillDate || undefined,
        ewayBillValidUntil: ewayBillValidUntil || undefined,
        transporterName: transporterName || undefined,
        vehicleNumber: vehicleNumber || undefined,
        dispatchFrom: dispatchFrom || undefined,
        shipTo: shipTo || undefined,
        items: validItems.map((item) => ({
          inventoryItemId: type === "PURCHASE" ? item.inventoryItemId : undefined,
          productId: type === "SALES" ? item.productId || undefined : undefined,
          itemName: item.itemName,
          hsnCode: item.hsnCode,
          unit: item.unit,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          discountAmount: Number(item.discountAmount || 0),
          gstRate: Number(item.gstRate || 0),
        })),
      }).unwrap();

      toast.success(
        status === "DRAFT"
          ? "Voucher saved as draft"
          : type === "SALES"
            ? "Sales voucher posted and stock reduced"
            : "Purchase voucher posted and stock increased"
      );
      if (status === "POSTED") {
        playUiSound("post");
      }

      setBillNumber("");
      setBillNumberTouched(false);
      setPartyId("");
      setNotes("");
      setEwayBillNumber("");
      setEwayBillDate("");
      setEwayBillValidUntil("");
      setTransporterName("");
      setVehicleNumber("");
      setDispatchFrom("");
      setShipTo("");
      setItems([newItem()]);
    } catch {
      toast.error("Failed to post voucher");
    }
  };

  const handleExportBills = () => {
    const bills = billsPage?.content ?? [];

    if (!bills.length) {
      toast.info("No vouchers to export");
      return;
    }

    const exported = exportBillsCsv(bills);

    void logDataJob({
      operation: "EXPORT",
      module: "BILLING",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: bills.length,
      successRows: bills.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
    });

    toast.success("Voucher CSV exported successfully");
  };

  const handleExportGstReport = async () => {
    const { fromDate, toDate } = currentMonthRange();

    try {
      const report = await getGstReport({ fromDate, toDate }).unwrap();

      if (!report.rows.length) {
        toast.info("No posted vouchers found for current month GST report");
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
        notes: `GST report ${fromDate} to ${toDate}`,
      });

      toast.success("GST report exported successfully");
    } catch {
      toast.error("Could not export GST report");
    }
  };

  const handleTallyShortcut = (key: string) => {
    if (key === "F2") {
      document.querySelector<HTMLInputElement>("input[type='date']")?.focus();
      return;
    }

    if (key === "F4") {
      router.push("/accounting?voucher=CONTRA");
      return;
    }

    if (key === "F5") {
      router.push("/accounting?voucher=PAYMENT");
      return;
    }

    if (key === "F6") {
      router.push("/accounting?voucher=RECEIPT");
      return;
    }

    if (key === "F7") {
      router.push("/accounting?voucher=JOURNAL");
      return;
    }

    if (key === "F8") {
      switchVoucher("SALES");
      return;
    }

    if (key === "F9") {
      switchVoucher("PURCHASE");
      return;
    }

    if (key === "F10") {
      router.push("/accounting?voucher=DEBIT_NOTE");
      return;
    }

    if (key === "F11") {
      toast.info("Features are managed from Accounting Settings and Organization Settings.");
      return;
    }

    if (key === "F12") {
      router.push("/organization-settings");
    }
  };

  useEffect(() => {
    if (!selectedParty) {
      return;
    }

    const destination = getPartyDestination(selectedParty);
    if (destination) {
      setPlaceOfSupply(destination);
      setShipTo(destination);
    }

    const address = getPartyAddress(selectedParty);
    if (address) {
      setShipTo(address);
    }

    const paymentTermDays = parsePaymentTermDays(selectedParty.paymentTerms);
    if (paymentTermDays !== null) {
      setDueDate(addDaysIso(billDate, paymentTermDays));
    }

    const inferred = inferIntraState(
      factoryState,
      selectedParty.state || stateNameFromGstNumber(selectedParty.gstNumber)
    );
    if (inferred !== null) {
      setIntraState(inferred);
    }
  }, [billDate, factoryState, selectedParty]);

  useEffect(() => {
    const inferred = inferIntraState(factoryState, placeOfSupply);
    if (inferred !== null) {
      setIntraState(inferred);
    }
  }, [factoryState, placeOfSupply]);

  useEffect(() => {
    function handleBillingShortcut(event: Event) {
      const shortcutEvent =
        event as CustomEvent<{
          key?: string;
        }>;

      if (shortcutEvent.detail?.key) {
        handleTallyShortcut(shortcutEvent.detail.key);
      }
    }

    window.addEventListener("factory1:billing-shortcut", handleBillingShortcut);

    return () =>
      window.removeEventListener(
        "factory1:billing-shortcut",
        handleBillingShortcut
      );
  });

  return (
    <div
      className="space-y-2 text-[12px]"
      data-tally-nav-scope
      onKeyDown={handleTallyFieldNavigation}
    >
      <div
        className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--factory1-border)] px-3 py-2 xl:flex-row xl:items-end"
        style={{ backgroundColor: voucherSurface }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--factory1-text-secondary)]">
            Accounting Voucher Entry
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">
            Billing
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--factory1-text-muted)]">
            Post sales and purchase vouchers with stock movement, GST, ledger impact and exports.
          </p>
        </div>

        <div className="space-y-2">
          {type === "PURCHASE" ? (
            <AutoPurchaseBillImportDialog className="h-8 w-full rounded-md text-xs" />
          ) : null}
          <div className="grid gap-1 rounded-md border border-[var(--factory1-border)] bg-white p-1 sm:grid-cols-2">
            {voucherModes.map((entry) => {
              const Icon = entry.icon;
              const active = type === entry.type;

              return (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => switchVoucher(entry.type)}
                  className={`flex items-start gap-2 border p-2 text-left transition ${
                    active
                      ? "border-[var(--factory1-primary)] bg-[var(--factory1-primary)] text-white"
                      : "border-[var(--factory1-border)] bg-[var(--factory1-background)] text-[var(--factory1-text-primary)] hover:border-[var(--factory1-primary)]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                      active ? "bg-white/15" : "bg-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {entry.title}
                    </span>
                    <span
                      className={`mt-1 block text-xs leading-5 ${
                        active ? "text-slate-200" : "text-muted-foreground"
                      }`}
                    >
                      {entry.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant={detailsOpen ? "default" : "outline"}
            className="h-8 w-full justify-center rounded-md border-[var(--factory1-border-strong)] text-xs"
            onClick={() => setDetailsOpen((current) => !current)}
          >
            {detailsOpen ? (
              <PanelRightClose className="mr-2 h-4 w-4" />
            ) : (
              <PanelRightOpen className="mr-2 h-4 w-4" />
            )}
            {detailsOpen ? "Hide details" : "Show details"}
          </Button>
        </div>
      </div>

      <div
        className={
          detailsOpen
            ? "grid grid-cols-1 gap-2 2xl:grid-cols-[minmax(0,1fr)_380px]"
            : "grid grid-cols-1 gap-2"
        }
      >
        <div className="space-y-2">
          <Card
            className="rounded-lg border-[var(--factory1-border)] shadow-none"
            style={{ backgroundColor: voucherSurface }}
          >
            <CardHeader className="border-b border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-bold text-[var(--factory1-text-primary)]">
                  <ReceiptIndianRupee className="h-4 w-4" />
                  {mode.title}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              <section>
                <div className="mb-2 flex items-center gap-2 border-b border-[var(--factory1-border)] pb-1">
                  <BadgeIndianRupee className="h-4 w-4 text-[var(--factory1-primary)]" />
                  <h2 className="text-xs font-bold text-[var(--factory1-text-primary)]">Voucher Details</h2>
                </div>
                <div className="grid gap-2 lg:grid-cols-4">
                  <Field label={type === "SALES" ? "Customer Ledger" : "Supplier Ledger"}>
                    <select
                      value={partyId}
                      onChange={(event) => setPartyId(event.target.value)}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Select ledger</option>
                      {parties.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Voucher Number">
                    <div className="space-y-1.5">
                      <Input
                        value={billNumber}
                        onChange={(event) => {
                          setBillNumber(event.target.value);
                          setBillNumberTouched(true);
                        }}
                        placeholder="Auto generated"
                        className={
                          billNumberUnavailable
                            ? "border-red-300 focus-visible:ring-red-500"
                            : billNumberAvailability?.available
                              ? "border-emerald-300 focus-visible:ring-emerald-500"
                              : undefined
                        }
                      />
                      <p
                        className={`text-xs ${
                          billNumberUnavailable
                            ? "text-red-600"
                            : billNumberAvailability?.available
                              ? "text-emerald-700"
                              : "text-muted-foreground"
                        }`}
                      >
                        {billNumberChecking
                          ? "Checking bill number..."
                          : billNumberForCheck
                            ? billNumberAvailability?.message ?? "Backend generated, editable"
                            : "Backend will generate this number"}
                      </p>
                    </div>
                  </Field>

                  <Field label="Voucher Date">
                    <Input
                      type="date"
                      value={billDate}
                      onChange={(event) => setBillDate(event.target.value)}
                    />
                  </Field>

                  <Field label="Due Date">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </Field>

                  <Field label="Place of Supply">
                    <Input
                      value={placeOfSupply}
                      onChange={(event) => setPlaceOfSupply(event.target.value)}
                      placeholder="State / city"
                    />
                  </Field>

                  <Field label="GST Treatment">
                    <select
                      value={intraState ? "INTRA" : "INTER"}
                      onChange={(event) => setIntraState(event.target.value === "INTRA")}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="INTRA">Intra-state: CGST + SGST</option>
                      <option value="INTER">Inter-state: IGST</option>
                    </select>
                  </Field>

                  <Field label="Payment Status">
                    <select
                      value={paymentStatus}
                      onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="UNPAID">Unpaid</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </Field>

                  <div
                    className="rounded-md border border-[var(--factory1-border)] p-2 text-xs"
                    style={{ backgroundColor: voucherSubtleSurface }}
                  >
                    <p className="font-medium text-slate-950">Stock impact</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {type === "SALES"
                        ? "Posting reduces finished goods stock."
                        : "Posting increases selected inventory stock."}
                    </p>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  <div
                    className="rounded-md border border-[var(--factory1-border)] p-2 text-xs"
                    style={{ backgroundColor: voucherSubtleSurface }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">
                        {type === "SALES" ? "Customer details" : "Supplier details"}
                      </p>
                      {selectedParty?.gstNumber ? (
                        <Badge variant="secondary" className="rounded-md">
                          GSTIN {selectedParty.gstNumber}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {selectedParty
                        ? [
                            selectedPartyAddress,
                            selectedPartyDestination,
                            selectedParty.paymentTerms
                              ? `Terms: ${selectedParty.paymentTerms}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Party master has limited details."
                        : "Select a ledger to auto-fill GST, address, place of supply and due date."}
                    </p>
                  </div>

                  <div
                    className="rounded-md border border-[var(--factory1-border)] p-2 text-xs"
                    style={{ backgroundColor: voucherSubtleSurface }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">Tax auto-fill</p>
                      <Badge variant="outline" className="rounded-md">
                        {intraState ? "CGST + SGST" : "IGST"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {factoryState
                        ? `Factory state: ${factoryState}. ${
                            inferredGstTreatment === null
                              ? "Verify GST treatment manually when party state is missing."
                              : "GST treatment is inferred from factory and party/place of supply."
                          }`
                        : "Add factory state or GSTIN in organization settings to infer IGST automatically."}
                    </p>
                  </div>
                </div>
              </section>

              <section
                className="rounded-lg border border-[var(--factory1-border)] p-2"
                style={{ backgroundColor: voucherSurface }}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold text-[var(--factory1-text-primary)]">E-way Bill</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional transport details for GST movement and printed invoices.
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-md">
                    Editable
                  </Badge>
                </div>
                <div className="grid gap-4 lg:grid-cols-4">
                  <Field label="E-way Bill No.">
                    <Input
                      value={ewayBillNumber}
                      onChange={(event) => setEwayBillNumber(event.target.value)}
                      placeholder="Example: 1712..."
                    />
                  </Field>
                  <Field label="E-way Date">
                    <Input
                      type="date"
                      value={ewayBillDate}
                      onChange={(event) => setEwayBillDate(event.target.value)}
                    />
                  </Field>
                  <Field label="Valid Until">
                    <Input
                      type="date"
                      value={ewayBillValidUntil}
                      onChange={(event) => setEwayBillValidUntil(event.target.value)}
                    />
                  </Field>
                  <Field label="Vehicle No.">
                    <Input
                      value={vehicleNumber}
                      onChange={(event) => setVehicleNumber(event.target.value.toUpperCase())}
                      placeholder="KA01AB1234"
                    />
                  </Field>
                  <Field label="Transporter">
                    <Input
                      value={transporterName}
                      onChange={(event) => setTransporterName(event.target.value)}
                      placeholder="Transporter name"
                    />
                  </Field>
                  <Field label="Dispatch From">
                    <Input
                      value={dispatchFrom}
                      onChange={(event) => setDispatchFrom(event.target.value)}
                      placeholder="Factory / warehouse"
                    />
                  </Field>
                  <Field label="Ship To">
                    <Input
                      value={shipTo}
                      onChange={(event) => setShipTo(event.target.value)}
                      placeholder="Delivery address"
                    />
                  </Field>
                  <div
                    className="rounded-md border border-[var(--factory1-border)] p-2 text-xs leading-5 text-[var(--factory1-text-secondary)]"
                    style={{ backgroundColor: voucherSubtleSurface }}
                  >
                    Govt e-way generation can be integrated later with NIC APIs. For now, these details are stored with the bill and printed/exported.
                  </div>
                </div>
              </section>

              <section
                className="rounded-lg border border-[var(--factory1-border)]"
                style={{ backgroundColor: voucherSurface }}
              >
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--factory1-border)] px-3 py-2"
                  style={{ backgroundColor: voucherSubtleSurface }}
                >
                  <div>
                    <h2 className="text-xs font-bold text-[var(--factory1-text-primary)]">Name of Item</h2>
                    <p className="mt-0.5 text-[11px] text-slate-700">
                      Press Enter to move across fields. Use the buttons only when you need lookup or row actions.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    data-ignore-tally-nav="true"
                    onClick={addItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-sm">
                    <thead className="bg-white text-xs text-[var(--factory1-text-primary)]">
                      <tr>
                        <th className="w-12 border-b p-2 text-center">Sl</th>
                        <th className="border-b p-2 text-left">Name of Item</th>
                        <th className="w-36 border-b p-2 text-left">HSN/SAC</th>
                        <th className="w-28 border-b p-2 text-right">Quantity</th>
                        <th className="w-24 border-b p-2 text-left">Unit</th>
                        <th className="w-28 border-b p-2 text-right">Rate</th>
                        <th className="w-28 border-b p-2 text-right">Disc.</th>
                        <th className="w-24 border-b p-2 text-right">GST %</th>
                        <th className="w-32 border-b p-2 text-right">Amount</th>
                        <th className="w-12 border-b p-2 text-right" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const line = calculateLine(item, intraState);

                        return (
                          <tr key={item.rowId} className="border-t border-[var(--factory1-border)] align-top hover:bg-[var(--factory1-background)]">
                            <td className="p-2 text-center text-muted-foreground">
                              {index + 1}
                            </td>
                            <td className="min-w-80 p-2">
                              {type === "SALES" ? (
                                <select
                                  value={item.productId}
                                  onChange={(event) =>
                                    selectProduct(item.rowId, event.target.value)
                                  }
                                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                  <option value="">Select product</option>
                                  {products.map((product: Product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.productCode} - {product.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={item.inventoryItemId}
                                  onChange={(event) =>
                                    selectInventoryItem(item.rowId, event.target.value)
                                  }
                                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                  <option value="">Select inventory item</option>
                                  {inventoryItems.map((inventoryItem: InventoryItem) => (
                                    <option key={inventoryItem.id} value={inventoryItem.id}>
                                      {inventoryItem.itemCode} - {inventoryItem.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <Input
                                value={item.itemName}
                                onChange={(event) =>
                                  updateItem(item.rowId, { itemName: event.target.value })
                                }
                                className="mt-1 h-9 rounded-sm"
                                placeholder="Printed item name"
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Input
                                  value={item.hsnCode}
                                  onChange={(event) =>
                                    updateItem(item.rowId, { hsnCode: event.target.value })
                                  }
                                  data-no-auto-select="false"
                                  placeholder="HSN"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  disabled={gstState.isFetching}
                                  onClick={() => lookupGst(item)}
                                  aria-label="Find GST suggestion"
                                >
                                  <Search className="h-4 w-4" />
                                </Button>
                              </div>
                              {item.suggestions.length > 0 ? (
                                <div className="mt-2 space-y-1" data-ignore-tally-nav="true">
                                  {item.suggestions.slice(0, 2).map((suggestion) => (
                                    <button
                                      key={`${suggestion.hsnCode}-${suggestion.description}`}
                                      type="button"
                                      onClick={() => applySuggestion(item.rowId, suggestion)}
                                      className="block w-full rounded-md border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-2 py-1 text-left text-xs hover:bg-white"
                                    >
                                      <span className="block font-medium">
                                        {suggestion.hsnCode || "HSN/SAC"} - {suggestion.igstRate}% GST
                                      </span>
                                      <span className="mt-0.5 block truncate text-muted-foreground">
                                        {suggestion.source?.toLowerCase().includes("ai")
                                          ? "AI suggestion, editable"
                                          : "Official/common suggestion, editable"}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </td>
                            <td className="p-2">
                              <NumberInput
                                value={item.quantity}
                                onChange={(value) => updateItem(item.rowId, { quantity: value })}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.unit}
                                onChange={(event) =>
                                  updateItem(item.rowId, { unit: event.target.value })
                                }
                                className="h-9 min-w-20 rounded-sm"
                              />
                            </td>
                            <td className="p-2">
                              <NumberInput
                                value={item.rate}
                                onChange={(value) => updateItem(item.rowId, { rate: value })}
                              />
                            </td>
                            <td className="p-2">
                              <NumberInput
                                value={item.discountAmount}
                                onChange={(value) =>
                                  updateItem(item.rowId, { discountAmount: value })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <NumberInput
                                value={item.gstRate}
                                onChange={(value) => updateItem(item.rowId, { gstRate: value })}
                              />
                            </td>
                            <td className="p-2 text-right font-semibold">
                              {formatCurrency(line.taxable)}
                            </td>
                            <td className="p-2 text-right" data-ignore-tally-nav="true">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Remove line"
                                onClick={() =>
                                  setItems((prev) =>
                                    prev.length === 1
                                      ? [newItem()]
                                      : prev.filter((entry) => entry.rowId !== item.rowId)
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t bg-slate-50 text-sm">
                      <tr>
                        <td className="p-2" />
                        <td className="p-2 text-right font-semibold">Taxable Value</td>
                        <td className="p-2" />
                        <td className="p-2 text-right font-semibold">
                          {items.length} line{items.length === 1 ? "" : "s"}
                        </td>
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2 text-right font-semibold">
                          {intraState ? "CGST + SGST" : "IGST"}
                        </td>
                        <td className="p-2 text-right font-semibold">
                          {formatCurrency(totals.taxable)}
                        </td>
                        <td className="p-2" />
                      </tr>
                      <tr>
                        <td className="p-2" />
                        <td className="p-2 text-right font-semibold">Tax</td>
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2 text-right font-semibold">
                          {formatCurrency(intraState ? totals.cgst + totals.sgst : totals.igst)}
                        </td>
                        <td className="p-2" />
                      </tr>
                      <tr className="border-t border-[var(--factory1-primary)] bg-[var(--factory1-primary)] text-white">
                        <td className="p-2" />
                        <td className="p-2 text-right font-semibold">Total</td>
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2" />
                        <td className="p-2 text-right text-base font-bold">
                          {formatCurrency(totals.grandTotal)}
                        </td>
                        <td className="p-2" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <section className="grid gap-2 lg:grid-cols-[1fr_280px]">
                <Field label="Narration">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        playUiSound("enter");
                        setPostConfirmOpen(true);
                      }
                    }}
                    placeholder="Transport, LR number, payment terms, dispatch note..."
                    className="min-h-20 rounded-md border-[var(--factory1-border-strong)] bg-white text-xs"
                  />
                </Field>
                <div className="flex flex-col justify-end gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleCreate("DRAFT")}
                    disabled={createState.isLoading || billNumberUnavailable}
                    className="w-full rounded-md border-[var(--factory1-border-strong)]"
                  >
                    Save Draft
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleCreate("POSTED")}
                    disabled={createState.isLoading || billNumberUnavailable}
                    className="w-full rounded-md"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {createState.isLoading ? "Saving..." : `Post ${mode.title}`}
                  </Button>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>

        {detailsOpen ? (
        <div className="space-y-2">
          <VoucherPreview
            mode={mode.title}
            partyName={selectedParty?.name ?? "Select ledger"}
            billNumber={billNumber || "Auto generated"}
            billDate={billDate}
            paymentStatus={paymentStatus}
            intraState={intraState}
            ewayBillNumber={ewayBillNumber}
            vehicleNumber={vehicleNumber}
            totals={totals}
          />

          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Reports</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportGstReport}
                  disabled={gstReportState.isFetching}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  GST
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportBills}
                disabled={!billsPage?.content?.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Export current voucher list
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                GST export uses posted sales and purchase vouchers for this month.
                Ledger reports are available in Accounting.
              </p>
            </CardContent>
          </Card>

          <GstIntegrationPanel compact />

          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-base">
                Recent {type === "SALES" ? "Sales" : "Purchase"} Vouchers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {billsLoading ? (
                <p className="text-sm text-muted-foreground">Loading vouchers...</p>
              ) : (
                <div className="space-y-3">
                  {(billsPage?.content ?? []).map((bill) => (
                    <div
                      key={bill.id}
                      className="rounded-md border bg-slate-50 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{bill.billNumber}</div>
                          <div className="truncate text-muted-foreground">
                            {bill.partyName}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {bill.billDate}
                          </div>
                          {bill.ewayStatus || bill.ewayBillNumber ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline" className="rounded-md">
                                E-way {bill.ewayStatus ?? "Saved"}
                              </Badge>
                              {bill.ewayBillNumber ? (
                                <span className="text-muted-foreground">
                                  {bill.ewayBillNumber}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <Badge
                          variant={bill.status === "CANCELLED" ? "destructive" : "secondary"}
                          className="rounded-md"
                        >
                          {bill.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <span className="font-semibold">
                            {formatCurrency(Number(bill.grandTotal))}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Paid {formatCurrency(Number(bill.paidAmount ?? 0))} · Due{" "}
                            {formatCurrency(
                              Math.max(
                                0,
                                Number(bill.grandTotal) - Number(bill.paidAmount ?? 0)
                              )
                            )}
                          </div>
                        </div>
                        <RecentVoucherActions
                          bill={bill}
                          cancelling={cancelState.isLoading}
                          posting={postState.isLoading}
                          recordingPayment={paymentState.isLoading}
                          ewayLoading={
                            generateEwayState.isLoading ||
                            ewayDetailsState.isLoading ||
                            cancelEwayState.isLoading
                          }
                          onPrint={async () => {
                            if (!(await printInvoice(bill, orgSettings))) {
                              toast.error("Could not open invoice print window");
                            }
                          }}
                          onPost={async () => {
                            try {
                              await postBill(bill.id).unwrap();
                              toast.success("Draft posted and stock updated");
                            } catch {
                              toast.error("Failed to post draft");
                            }
                          }}
                          onCancel={async () => {
                            try {
                              await cancelBill(bill.id).unwrap();
                              toast.success("Voucher cancelled and stock reversed");
                            } catch {
                              toast.error("Failed to cancel voucher");
                            }
                          }}
                          onPayment={() => openPaymentDialog(bill)}
                          onGenerateEway={async () => {
                            try {
                              const response = await generateEwayBill(bill.id).unwrap();
                              if (response.success) {
                                toast.success(response.alert || "E-way bill generated");
                              } else {
                                toast.error(response.message || "E-way bill generation failed");
                              }
                            } catch {
                              toast.error("Could not generate e-way bill");
                            }
                          }}
                          onEwayDetails={async () => {
                            try {
                              const response = await getEwayBillDetails(bill.id).unwrap();
                              if (response.success) {
                                toast.success(response.alert || "E-way bill details refreshed");
                              } else {
                                toast.error(response.message || "Could not fetch e-way bill details");
                              }
                            } catch {
                              toast.error("Could not fetch e-way bill details");
                            }
                          }}
                          onCancelEway={async () => {
                            try {
                              const response = await cancelEwayBill({
                                id: bill.id,
                                cancelRemark: "Cancelled from Factory1",
                              }).unwrap();
                              if (response.success) {
                                toast.success(response.alert || "E-way bill cancelled");
                              } else {
                                toast.error(response.message || "Could not cancel e-way bill");
                              }
                            } catch {
                              toast.error("Could not cancel e-way bill");
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {!billsPage?.content?.length ? (
                    <p className="text-sm text-muted-foreground">No vouchers found.</p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-lg md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" onClick={addItem}>
            Add Line
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCreate("DRAFT")}
            disabled={createState.isLoading}
          >
            Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleCreate("POSTED")}
            disabled={createState.isLoading}
          >
            Post
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(paymentBill)}
        onOpenChange={(open) => {
          if (!open) {
            closePaymentDialog();
          }
        }}
      >
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Update the total amount paid against this voucher.
            </DialogDescription>
          </DialogHeader>
          {paymentBill ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{paymentBill.billNumber}</div>
                <div className="text-muted-foreground">{paymentBill.partyName}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-semibold">
                      {formatCurrency(Number(paymentBill.grandTotal))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Due</div>
                    <div className="font-semibold">
                      {formatCurrency(
                        Math.max(
                          0,
                          Number(paymentBill.grandTotal) -
                            Number(paymentBill.paidAmount ?? 0)
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <Field label="Total paid amount">
                <Input
                  type="number"
                  min="0"
                  max={paymentBill.grandTotal}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={closePaymentDialog}>
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={paymentState.isLoading}>
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={postConfirmOpen} onOpenChange={setPostConfirmOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] rounded-lg border-[var(--factory1-border)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Accept Voucher?</DialogTitle>
            <DialogDescription>
              This will post the {type === "SALES" ? "sales" : "purchase"} voucher
              and update stock and accounting entries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-md"
              onClick={() => setPostConfirmOpen(false)}
            >
              Esc: Cancel
            </Button>
            <Button
              type="button"
              className="rounded-md"
              onClick={() => {
                setPostConfirmOpen(false);
                void handleCreate("POSTED");
              }}
            >
              A: Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = "light",
}: {
  label: string;
  value: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3 sm:p-4 ${
        tone === "dark" ? "bg-slate-950 text-white" : "bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          tone === "dark" ? "text-slate-300" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
    </div>
  );
}

function VoucherPreview({
  mode,
  partyName,
  billNumber,
  billDate,
  paymentStatus,
  intraState,
  ewayBillNumber,
  vehicleNumber,
  totals,
}: {
  mode: string;
  partyName: string;
  billNumber: string;
  billDate: string;
  paymentStatus: PaymentStatus;
  intraState: boolean;
  ewayBillNumber: string;
  vehicleNumber: string;
  totals: ReturnType<typeof calculateTotals>;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Voucher Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="rounded-md bg-slate-950 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
            {mode}
          </p>
          <p className="mt-3 text-2xl font-semibold">
            {formatCurrency(totals.grandTotal)}
          </p>
          <p className="mt-1 text-sm text-slate-300">{partyName}</p>
        </div>

        <div className="space-y-2 text-sm">
          <PreviewRow label="Voucher No." value={billNumber} />
          <PreviewRow label="Date" value={billDate} />
          <PreviewRow label="Payment" value={paymentStatus} />
          <PreviewRow label="GST" value={intraState ? "CGST + SGST" : "IGST"} />
          {ewayBillNumber || vehicleNumber ? (
            <PreviewRow
              label="E-way"
              value={[
                ewayBillNumber || "No e-way no.",
                vehicleNumber ? `Vehicle ${vehicleNumber}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : null}
        </div>

        <div className="space-y-2 rounded-md border bg-slate-50 p-3 text-sm">
          <TotalRow label="Subtotal" value={totals.subtotal} />
          <TotalRow label="Discount" value={totals.discount} />
          <TotalRow label="Taxable" value={totals.taxable} />
          {intraState ? (
            <>
              <TotalRow label="CGST" value={totals.cgst} />
              <TotalRow label="SGST" value={totals.sgst} />
            </>
          ) : (
            <TotalRow label="IGST" value={totals.igst} />
          )}
          <TotalRow label="Round Off" value={totals.roundOff} />
          <TotalRow label="Grand Total" value={totals.grandTotal} strong />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentVoucherActions({
  bill,
  cancelling,
  posting,
  recordingPayment,
  ewayLoading,
  onPrint,
  onPost,
  onCancel,
  onPayment,
  onGenerateEway,
  onEwayDetails,
  onCancelEway,
}: {
  bill: Bill;
  cancelling: boolean;
  posting: boolean;
  recordingPayment: boolean;
  ewayLoading: boolean;
  onPrint: () => void;
  onPost: () => void;
  onCancel: () => void;
  onPayment: () => void;
  onGenerateEway: () => void;
  onEwayDetails: () => void;
  onCancelEway: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={onPrint}>
        Print
      </Button>

      {bill.status === "DRAFT" ? (
        <Button size="sm" onClick={onPost} disabled={posting}>
          Post
        </Button>
      ) : null}

      {bill.status !== "CANCELLED" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={recordingPayment}
          onClick={onPayment}
        >
          Payment
        </Button>
      ) : null}

      {bill.status === "POSTED" && !bill.ewayBillNumber ? (
        <Button
          size="sm"
          variant="outline"
          disabled={ewayLoading}
          onClick={onGenerateEway}
        >
          Gen E-way
        </Button>
      ) : null}

      {bill.ewayBillNumber ? (
        <Button
          size="sm"
          variant="outline"
          disabled={ewayLoading}
          onClick={onEwayDetails}
        >
          E-way Details
        </Button>
      ) : null}

      {bill.ewayBillNumber && bill.ewayStatus !== "CANCELLED" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={ewayLoading}
          onClick={onCancelEway}
        >
          Cancel E-way
        </Button>
      ) : null}

      {bill.status !== "CANCELLED" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={cancelling}
          onClick={onCancel}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-[var(--factory1-text-primary)]">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value || 0))}
      className="h-9 min-w-24 rounded-md border-[var(--factory1-border-strong)] bg-white text-right text-xs"
    />
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value || "-"}</span>
    </div>
  );
}

function calculateLine(item: DraftItem, intraState: boolean) {
  const subtotal = Number(item.quantity || 0) * Number(item.rate || 0);
  const taxable = Math.max(0, subtotal - Number(item.discountAmount || 0));
  const gst = taxable * (Number(item.gstRate || 0) / 100);
  const cgst = intraState ? gst / 2 : 0;
  const sgst = intraState ? gst / 2 : 0;
  const igst = intraState ? 0 : gst;

  return {
    subtotal,
    taxable,
    cgst,
    sgst,
    igst,
    lineTotal: taxable + cgst + sgst + igst,
  };
}

function calculateTotals(items: DraftItem[], intraState: boolean) {
  const raw = items.reduce(
    (acc, item) => {
      const line = calculateLine(item, intraState);
      acc.subtotal += line.subtotal;
      acc.discount += Number(item.discountAmount || 0);
      acc.taxable += line.taxable;
      acc.cgst += line.cgst;
      acc.sgst += line.sgst;
      acc.igst += line.igst;
      return acc;
    },
    {
      subtotal: 0,
      discount: 0,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
    }
  );
  const total = raw.taxable + raw.cgst + raw.sgst + raw.igst;
  const grandTotal = Math.round(total);

  return {
    ...raw,
    roundOff: grandTotal - total,
    grandTotal,
  };
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPlainCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value || 0);
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

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

function initialBillType(value: string | null): BillType {
  return value === "PURCHASE" ? "PURCHASE" : "SALES";
}

function getPartyAddress(party: PartyLike) {
  return party.billingAddress || party.shippingAddress || party.address || "";
}

function getPartyDestination(party: PartyLike) {
  return [party.city, party.state].filter(Boolean).join(", ") || party.state || party.city || "";
}

function parsePaymentTermDays(paymentTerms?: string | null) {
  if (!paymentTerms) {
    return null;
  }

  const lower = paymentTerms.trim().toLowerCase();
  if (lower === "cash" || lower === "immediate" || lower.includes("advance")) {
    return 0;
  }

  const match = lower.match(/(\d{1,3})/);
  return match ? Number(match[1]) : null;
}

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateWithinRange(date: string, fromDate: string, toDate: string) {
  return date >= fromDate && date <= toDate;
}
