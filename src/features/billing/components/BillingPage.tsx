"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, ReceiptIndianRupee, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGetActiveCustomersQuery } from "@/features/customers/api/customerApi";
import { useGetActiveSuppliersQuery } from "@/features/suppliers/api/supplierApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import { useGetProductsQuery } from "@/features/products/api/productsApi";
import type { InventoryItem } from "@/features/inventory/types/inventory.types";
import type { Product } from "@/features/products/types/product.types";
import {
  useCancelBillMutation,
  useCreateBillMutation,
  useGetBillsQuery,
  useLazyGetGstSuggestionsQuery,
} from "../api/billingApi";
import type { BillType, GstRateSuggestion } from "../types/billing.types";

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

const today = new Date().toISOString().slice(0, 10);

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
  const [type, setType] = useState<BillType>("SALES");
  const [partyId, setPartyId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [intraState, setIntraState] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "PARTIAL" | "PAID">("UNPAID");
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
  const { data: billsPage, isLoading: billsLoading } = useGetBillsQuery({
    type,
    page: 0,
    size: 10,
  });

  const [createBill, createState] = useCreateBillMutation();
  const [cancelBill, cancelState] = useCancelBillMutation();
  const [getGstSuggestions, gstState] = useLazyGetGstSuggestionsQuery();

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

  const totals = useMemo(() => calculateTotals(items, intraState), [items, intraState]);

  const parties = type === "SALES" ? customers : suppliers;

  const updateItem = (rowId: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item))
    );
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
      unit: product?.unit ?? inventoryItem?.unit ?? "PCS",
      rate: Number(inventoryItem?.sellingPrice ?? 0),
    });
  };

  const selectInventoryItem = (rowId: string, inventoryItemId: string) => {
    const inventoryItem = inventoryById.get(inventoryItemId);

    updateItem(rowId, {
      inventoryItemId,
      itemName: inventoryItem?.name ?? "",
      unit: inventoryItem?.unit ?? "PCS",
      rate: Number(inventoryItem?.purchasePrice ?? inventoryItem?.sellingPrice ?? 0),
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

  const handleCreate = async () => {
    const validItems = items.filter(
      (item) => item.quantity > 0 && item.rate >= 0 && item.inventoryItemId
    );

    if (!partyId) {
      toast.error(type === "SALES" ? "Select customer" : "Select supplier");
      return;
    }

    if (!validItems.length) {
      toast.error("Add at least one valid item");
      return;
    }

    try {
      await createBill({
        type,
        status: "POSTED",
        paymentStatus,
        customerId: type === "SALES" ? partyId : undefined,
        supplierId: type === "PURCHASE" ? partyId : undefined,
        billNumber: billNumber || undefined,
        billDate,
        dueDate: dueDate || undefined,
        placeOfSupply,
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
        type === "SALES"
          ? "Sales bill posted and stock reduced"
          : "Supplier bill posted and stock increased"
      );

      setBillNumber("");
      setPartyId("");
      setNotes("");
      setItems([newItem()]);
    } catch {
      toast.error("Failed to create bill");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Create sales and supplier bills with GST totals and stock updates.
          </p>
        </div>

        <div className="flex rounded-md border p-1">
          {(["SALES", "PURCHASE"] as BillType[]).map((billType) => (
            <Button
              key={billType}
              type="button"
              variant={type === billType ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setType(billType);
                setPartyId("");
                setItems([newItem()]);
              }}
            >
              {billType === "SALES" ? "Sales Bill" : "Supplier Bill"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptIndianRupee className="h-5 w-5" />
                {type === "SALES" ? "New Sales Bill" : "New Supplier Bill"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {type === "SALES" ? "Customer" : "Supplier"}
                  </label>
                  <select
                    value={partyId}
                    onChange={(event) => setPartyId(event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select party</option>
                    {parties.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Field label="Bill Number">
                  <Input
                    value={billNumber}
                    onChange={(event) => setBillNumber(event.target.value)}
                    placeholder="Auto if blank"
                  />
                </Field>

                <Field label="Bill Date">
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
                  />
                </Field>

                <div className="space-y-2">
                  <label className="text-sm font-medium">GST Type</label>
                  <select
                    value={intraState ? "INTRA" : "INTER"}
                    onChange={(event) => setIntraState(event.target.value === "INTRA")}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="INTRA">CGST + SGST</option>
                    <option value="INTER">IGST</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Item</th>
                      <th className="p-3 text-left">HSN</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-left">Unit</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-right">GST %</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const line = calculateLine(item, intraState);

                      return (
                        <tr key={item.rowId} className="border-t align-top">
                          <td className="w-72 p-3">
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
                              placeholder="Display item name"
                            />
                          </td>
                          <td className="w-48 p-3">
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
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                            {item.suggestions.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {item.suggestions.slice(0, 2).map((suggestion) => (
                                  <button
                                    key={`${suggestion.hsnCode}-${suggestion.description}`}
                                    type="button"
                                    onClick={() => applySuggestion(item.rowId, suggestion)}
                                    className="block w-full rounded-md border bg-muted/30 px-2 py-1 text-left text-xs"
                                  >
                                    {suggestion.hsnCode} - {suggestion.igstRate}% GST
                                  </button>
                                ))}
                              </div>
                            )}
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
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(line.lineTotal)}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
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

              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItems((prev) => [...prev, newItem()])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>

                <div className="w-full max-w-sm space-y-2 rounded-md border bg-muted/20 p-4 text-sm">
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
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <Field label="Notes">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Transport, reference, payment note..."
                  />
                </Field>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(event) =>
                      setPaymentStatus(event.target.value as "UNPAID" | "PARTIAL" | "PAID")
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleCreate} disabled={createState.isLoading}>
                  <FileText className="mr-2 h-4 w-4" />
                  {createState.isLoading ? "Posting..." : "Post Bill"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit rounded-lg">
          <CardHeader>
            <CardTitle>Recent {type === "SALES" ? "Sales" : "Supplier"} Bills</CardTitle>
          </CardHeader>
          <CardContent>
            {billsLoading ? (
              <p className="text-sm text-muted-foreground">Loading bills...</p>
            ) : (
              <div className="space-y-3">
                {(billsPage?.content ?? []).map((bill) => (
                  <div key={bill.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{bill.billNumber}</div>
                        <div className="text-muted-foreground">{bill.partyName}</div>
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
                      <span className="font-semibold">
                        {formatCurrency(Number(bill.grandTotal))}
                      </span>
                      {bill.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancelState.isLoading}
                          onClick={async () => {
                            try {
                              await cancelBill(bill.id).unwrap();
                              toast.success("Bill cancelled and stock reversed");
                            } catch {
                              toast.error("Failed to cancel bill");
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {!billsPage?.content?.length && (
                  <p className="text-sm text-muted-foreground">No bills found.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
