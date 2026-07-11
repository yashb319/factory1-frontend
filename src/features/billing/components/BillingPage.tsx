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
  useCreateBillMutation,
  useGetBillsQuery,
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
  tallyKey: string;
  subtitle: string;
  icon: typeof ArrowUpFromLine;
};

const today = new Date().toISOString().slice(0, 10);

const voucherModes: VoucherMode[] = [
  {
    type: "SALES",
    title: "Sales Voucher",
    tallyKey: "F8",
    subtitle: "Customer invoice, stock out, output GST",
    icon: ArrowUpFromLine,
  },
  {
    type: "PURCHASE",
    title: "Purchase Voucher",
    tallyKey: "F9",
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
  const [billDate, setBillDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [intraState, setIntraState] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);

  const { data: customers = [] } = useGetActiveCustomersQuery();
  const { data: suppliers = [] } = useGetActiveSuppliersQuery();
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 500,
    status: "ACTIVE",
  });
  const { data: productsPage } = useGetProductsQuery({ page: 0, size: 300 });
  const { data: orgSettingsResponse } = useGetOrganizationSettingsQuery();
  const { data: billsPage, isLoading: billsLoading } = useGetBillsQuery({
    type,
    page: 0,
    size: 8,
  });

  const [createBill, createState] = useCreateBillMutation();
  const [cancelBill, cancelState] = useCancelBillMutation();
  const [postBill, postState] = usePostBillMutation();
  const [recordBillPayment, paymentState] = useRecordBillPaymentMutation();
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

  const switchVoucher = (billType: BillType) => {
    setType(billType);
    setPartyId("");
    setItems([newItem()]);
  };

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

      setBillNumber("");
      setPartyId("");
      setNotes("");
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
      router.push("/inventory");
      return;
    }

    if (key === "F5") {
      router.push("/payroll");
      return;
    }

    if (key === "F6") {
      router.push("/customers");
      return;
    }

    if (key === "F7") {
      router.push("/accounting");
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
      router.push("/products");
      return;
    }

    if (key === "F11") {
      router.push("/import-export");
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
    function handleKeyDown(event: KeyboardEvent) {
      if (isAddLineShortcut(event)) {
        event.preventDefault();
        addItem();
        return;
      }

      if (isPostVoucherShortcut(event)) {
        event.preventDefault();
        void handleCreate();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Accounting Voucher Entry
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Billing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Post sales and purchase vouchers with stock movement, GST, ledger impact and exports.
          </p>
        </div>

        <div className="grid gap-2 rounded-lg border bg-white p-2 sm:grid-cols-2">
          {voucherModes.map((entry) => {
            const Icon = entry.icon;
            const active = type === entry.type;

            return (
              <button
                key={entry.type}
                type="button"
                onClick={() => switchVoucher(entry.type)}
                className={`flex items-start gap-3 rounded-md border p-3 text-left transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-300"
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
                    <kbd
                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                        active ? "border-white/30" : "bg-white text-slate-500"
                      }`}
                    >
                      {entry.tallyKey}
                    </kbd>
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
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MetricTile
          label="Voucher Total"
          value={formatCurrency(totals.grandTotal)}
          tone="dark"
        />
        <MetricTile
          label={intraState ? "CGST + SGST" : "IGST"}
          value={formatCurrency(intraState ? totals.cgst + totals.sgst : totals.igst)}
        />
        <MetricTile
          label="Taxable Value"
          value={formatCurrency(totals.taxable)}
        />
        <MetricTile
          label="Lines"
          value={String(items.length)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_380px_180px]">
        <div className="space-y-5">
          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-base">
                  <ReceiptIndianRupee className="h-5 w-5" />
                  {mode.title}
                </span>
                <span className="flex flex-wrap gap-2 text-xs font-normal text-muted-foreground">
                  <kbd className="rounded border bg-slate-50 px-2 py-1">
                    Win Alt+A / Mac Cmd+Shift+A
                  </kbd>
                  <kbd className="rounded border bg-slate-50 px-2 py-1">
                    Win Alt+S / Mac Cmd+Enter
                  </kbd>
                  <span className="rounded border bg-slate-50 px-2 py-1 sm:hidden">
                    Mobile: use buttons
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <BadgeIndianRupee className="h-4 w-4 text-slate-500" />
                  <h2 className="text-sm font-semibold">Voucher Details</h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-4">
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
                    <Input
                      value={billNumber}
                      onChange={(event) => setBillNumber(event.target.value)}
                      placeholder="Auto if blank"
                    />
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

                  <div className="rounded-md border bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-950">Stock impact</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {type === "SALES"
                        ? "Posting reduces finished goods stock."
                        : "Posting increases selected inventory stock."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border bg-slate-50 p-3 text-sm">
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

                  <div className="rounded-md border bg-slate-50 p-3 text-sm">
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

              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">Item Register</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select stock item, verify HSN/GST, quantity and rate before posting.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[1120px] text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-3 text-left">Stock / Product</th>
                        <th className="p-3 text-left">HSN</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-left">Unit</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3 text-right">Discount</th>
                        <th className="p-3 text-right">GST %</th>
                        <th className="p-3 text-right">Taxable</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="w-14 p-3 text-right" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const line = calculateLine(item, intraState);

                        return (
                          <tr key={item.rowId} className="border-t align-top">
                            <td className="w-80 p-3">
                              <div className="mb-2 text-xs font-medium text-muted-foreground">
                                #{index + 1}
                              </div>
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
                                className="mt-2"
                                placeholder="Printed item name"
                              />
                            </td>
                            <td className="w-52 p-3">
                              <div className="flex gap-2">
                                <Input
                                  value={item.hsnCode}
                                  onChange={(event) =>
                                    updateItem(item.rowId, { hsnCode: event.target.value })
                                  }
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
                                <div className="mt-2 space-y-1">
                                  {item.suggestions.slice(0, 2).map((suggestion) => (
                                    <button
                                      key={`${suggestion.hsnCode}-${suggestion.description}`}
                                      type="button"
                                      onClick={() => applySuggestion(item.rowId, suggestion)}
                                      className="block w-full rounded-md border bg-slate-50 px-2 py-1 text-left text-xs hover:bg-slate-100"
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
                            <td className="p-3">
                              <NumberInput
                                value={item.quantity}
                                onChange={(value) => updateItem(item.rowId, { quantity: value })}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={item.unit}
                                onChange={(event) =>
                                  updateItem(item.rowId, { unit: event.target.value })
                                }
                                className="min-w-20"
                              />
                            </td>
                            <td className="p-3">
                              <NumberInput
                                value={item.rate}
                                onChange={(value) => updateItem(item.rowId, { rate: value })}
                              />
                            </td>
                            <td className="p-3">
                              <NumberInput
                                value={item.discountAmount}
                                onChange={(value) =>
                                  updateItem(item.rowId, { discountAmount: value })
                                }
                              />
                            </td>
                            <td className="p-3">
                              <NumberInput
                                value={item.gstRate}
                                onChange={(value) => updateItem(item.rowId, { gstRate: value })}
                              />
                            </td>
                            <td className="p-3 text-right">
                              {formatCurrency(line.taxable)}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {formatCurrency(line.lineTotal)}
                            </td>
                            <td className="p-3 text-right">
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
                  </table>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <Field label="Narration">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Transport, LR number, payment terms, dispatch note..."
                    className="min-h-24"
                  />
                </Field>
                <div className="flex flex-col justify-end gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleCreate("DRAFT")}
                    disabled={createState.isLoading}
                    className="w-full"
                  >
                    Save Draft
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleCreate("POSTED")}
                    disabled={createState.isLoading}
                    className="w-full"
                    title="Post voucher. Windows: Alt+S. Mac: Cmd+Enter."
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {createState.isLoading ? "Saving..." : `Post ${mode.title}`}
                  </Button>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <VoucherPreview
            mode={mode.title}
            partyName={selectedParty?.name ?? "Select ledger"}
            billNumber={billNumber || "Auto generated"}
            billDate={billDate}
            paymentStatus={paymentStatus}
            intraState={intraState}
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
                          onPrint={async () => {
                            if (!(await printInvoice(bill))) {
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

        <TallyActionRail
          activeType={type}
          onSales={() => switchVoucher("SALES")}
          onPurchase={() => switchVoucher("PURCHASE")}
          onNavigate={(href) => router.push(href)}
        />
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
    </div>
  );
}

function TallyActionRail({
  activeType,
  onSales,
  onPurchase,
  onNavigate,
}: {
  activeType: BillType;
  onSales: () => void;
  onPurchase: () => void;
  onNavigate: (href: string) => void;
}) {
  const actions = [
    {
      key: "F2",
      label: "Date",
      hint: "Change voucher date",
      onClick: () => document.querySelector<HTMLInputElement>("input[type='date']")?.focus(),
    },
    {
      key: "F4",
      label: "Contra",
      hint: "Stock movement",
      onClick: () => onNavigate("/inventory"),
    },
    {
      key: "F5",
      label: "Payment",
      hint: "Payroll/payment",
      onClick: () => onNavigate("/payroll"),
    },
    {
      key: "F6",
      label: "Receipt",
      hint: "Customers",
      onClick: () => onNavigate("/customers"),
    },
    {
      key: "F7",
      label: "Journal",
      hint: "Ledgers",
      onClick: () => onNavigate("/accounting"),
    },
    {
      key: "F8",
      label: "Sales",
      hint: "Sales voucher",
      active: activeType === "SALES",
      onClick: onSales,
    },
    {
      key: "F9",
      label: "Purchase",
      hint: "Purchase voucher",
      active: activeType === "PURCHASE",
      onClick: onPurchase,
    },
    {
      key: "F10",
      label: "Other Vch",
      hint: "Products/BOM",
      onClick: () => onNavigate("/products"),
    },
    {
      key: "F11",
      label: "Features",
      hint: "Import/export",
      onClick: () => onNavigate("/import-export"),
    },
    {
      key: "F12",
      label: "Configure",
      hint: "Settings",
      onClick: () => onNavigate("/organization-settings"),
    },
  ];

  return (
    <aside className="hidden 2xl:block">
      <div className="sticky top-20 rounded-lg border bg-white p-2 shadow-sm">
        <div className="border-b px-2 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tally Keys
          </p>
        </div>
        <div className="mt-2 space-y-1">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
                action.active
                  ? "bg-slate-950 text-white"
                  : "hover:bg-slate-100"
              }`}
            >
              <kbd
                className={`min-w-9 rounded border px-1.5 py-0.5 text-center text-[11px] font-semibold ${
                  action.active
                    ? "border-white/30 text-white"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                {action.key}
              </kbd>
              <span className="min-w-0">
                <span className="block truncate font-medium">{action.label}</span>
                <span
                  className={`block truncate text-[11px] ${
                    action.active ? "text-slate-200" : "text-muted-foreground"
                  }`}
                >
                  {action.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
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
  totals,
}: {
  mode: string;
  partyName: string;
  billNumber: string;
  billDate: string;
  paymentStatus: PaymentStatus;
  intraState: boolean;
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
  onPrint,
  onPost,
  onCancel,
  onPayment,
}: {
  bill: Bill;
  cancelling: boolean;
  posting: boolean;
  recordingPayment: boolean;
  onPrint: () => void;
  onPost: () => void;
  onCancel: () => void;
  onPayment: () => void;
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
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
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
      className="min-w-24 text-right"
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

function isAddLineShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  return (
    (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && key === "a")
    || (event.metaKey && event.shiftKey && !event.altKey && !event.ctrlKey && key === "a")
    || (event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && key === "a")
  );
}

function isPostVoucherShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  return (
    (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && key === "s")
    || ((event.metaKey || event.ctrlKey) && !event.altKey && key === "enter")
    || ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === "s")
  );
}
