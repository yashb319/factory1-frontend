"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGetBillsQuery,
  useCreateBillMutation,
  useGetBillNumberSuggestionQuery,
} from "../api/billingApi";
import { useGetCustomersQuery } from "@/features/customers/api/customerApi";
import { useGetSuppliersQuery } from "@/features/suppliers/api/supplierApi";
import { useGetOrganizationSettingsQuery } from "@/features/organization-settings/api/organizationSettingsApi";
import { invoiceHtml, printInvoice } from "@/features/billing/utils/invoicePrint";
import { downloadDocument, shareDocument } from "@/lib/tallyDocuments";
import type { Bill, BillType } from "../types/billing.types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

type Screen = "list" | "create";

export function BillingTallyView({
  initialScreen = "list",
}: {
  initialScreen?: Screen;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = (searchParams.get("type") as BillType) || "SALES";
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);

  const { data, isFetching } = useGetBillsQuery({
    type: typeParam,
    page: 0,
    size: 100,
  });
  const bills = useMemo(() => data?.content ?? [], [data]);

  const [createBill, createState] = useCreateBillMutation();
  const { data: suggestedNumber } = useGetBillNumberSuggestionQuery(typeParam);
  const { data: customersPage } = useGetCustomersQuery({
    page: 0,
    size: 300,
  });
  const { data: suppliersPage } = useGetSuppliersQuery({
    page: 0,
    size: 300,
  });
  const { data: orgSettingsResponse } = useGetOrganizationSettingsQuery();
  const orgSettings = orgSettingsResponse?.data;

  const partyOptions = useMemo(() => {
    const list =
      typeParam === "SALES"
        ? customersPage?.content ?? []
        : suppliersPage?.content ?? [];
    return list.map((p: { id: string; name: string }) => ({
      value: p.id,
      label: p.name,
    }));
  }, [typeParam, customersPage, suppliersPage]);

  const [draft, setDraft] = useState<Record<string, unknown>>({
    billNumber: "",
    billDate: new Date().toISOString().slice(0, 10),
    partyId: "",
    itemName: "",
    quantity: 1,
    rate: 0,
    intraState: true,
  });
  const [editMode, setEditMode] = useState(false);
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndex = bills.length ? Math.min(selectedIndex, bills.length - 1) : 0;

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-bill-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (screen === "create") {
      fieldRefs.current[0]?.focus();
    }
  }, [screen]);

  const resolvedBillNumber =
    (draft.billNumber as string) || suggestedNumber?.billNumber || "";

  const submitCreate = async () => {
    if (!resolvedBillNumber) {
      toast.error("Bill number required");
      return;
    }
    if (!draft.partyId) {
      toast.error("Select a party");
      return;
    }
    try {
      await createBill({
        type: typeParam,
        billDate: String(draft.billDate),
        intraState: Boolean(draft.intraState),
        billNumber: String(resolvedBillNumber),
        ...(typeParam === "SALES"
          ? { customerId: String(draft.partyId) }
          : { supplierId: String(draft.partyId) }),
        items: [
          {
            itemName: (draft.itemName as string) || "Item",
            quantity: Number(draft.quantity) || 1,
            rate: Number(draft.rate) || 0,
          },
        ],
      }).unwrap();
      toast.success("Bill created");
      setScreen("list");
    } catch {
      toast.error("Could not create bill");
    }
  };

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (detailBill) return;
      if (screen === "create") {
        const fields = fieldRefs.current.filter(Boolean) as HTMLElement[];
        const currentIndex = fields.findIndex(
          (el) => el === document.activeElement
        );
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (editMode) {
            setEditMode(false);
            return;
          }
          setScreen("list");
          return;
        }
        if (editMode) {
          if (event.key === "Enter") {
            event.preventDefault();
            setEditMode(false);
          }
          return;
        }
        if (event.key.toLowerCase() === "a" && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
          playUiSound("post");
          submitCreate();
          return;
        }
        if (event.key.toLowerCase() === "q") {
          event.preventDefault();
          event.stopImmediatePropagation();
          setScreen("list");
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          setEditMode(true);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          const next = Math.min(currentIndex + 1, fields.length - 1);
          fields[next >= 0 ? next : 0]?.focus();
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          const prev = Math.max(currentIndex - 1, 0);
          fields[prev]?.focus();
          return;
        }
        return;
      }

      if (screen === "list") {
        if (event.key === "Escape") {
          event.preventDefault();
          router.push("/gateway?menu=billing");
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((c) => Math.min(c + 1, bills.length - 1));
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((c) => Math.max(c - 1, 0));
          return;
        }
        if (event.key.toLowerCase() === "n") {
          event.preventDefault();
          setScreen("create");
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const bill = bills[activeIndex];
          if (bill) setDetailBill(bill);
          return;
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, bills, activeIndex, draft, editMode, typeParam, detailBill]);

  if (screen === "create") {
    const setField = (key: string, value: unknown) =>
      setDraft((c) => ({ ...c, [key]: value }));
    return (
      <div className="tally-entry-screen" data-tally-nav-scope>
        <div className="tally-entry-title">
          <span>{typeParam === "SALES" ? "Sales Invoice" : "Purchase Invoice"}</span>
          <span>Factory1</span>
          <span>Ctrl + M</span>
        </div>

        <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
          <div className="mx-auto grid w-full max-w-lg gap-y-3">
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">
                Bill Number
              </span>
              <input
                ref={(el) => {
                  fieldRefs.current[0] = el;
                }}
                value={resolvedBillNumber}
                onChange={(e) => setField("billNumber", e.target.value)}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Bill Date</span>
              <input
                ref={(el) => {
                  fieldRefs.current[1] = el;
                }}
                type="date"
                value={(draft.billDate as string) ?? ""}
                onChange={(e) => setField("billDate", e.target.value)}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">
                {typeParam === "SALES" ? "Customer" : "Supplier"}
              </span>
              <select
                ref={(el) => {
                  fieldRefs.current[2] = el;
                }}
                value={(draft.partyId as string) ?? ""}
                onChange={(e) => setField("partyId", e.target.value)}
                className="tally-select h-6 w-full"
              >
                <option value="">---</option>
                {partyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Item Name</span>
              <input
                ref={(el) => {
                  fieldRefs.current[3] = el;
                }}
                value={(draft.itemName as string) ?? ""}
                onChange={(e) => setField("itemName", e.target.value)}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Quantity</span>
              <input
                ref={(el) => {
                  fieldRefs.current[4] = el;
                }}
                type="number"
                value={Number(draft.quantity) || 0}
                onChange={(e) => setField("quantity", Number(e.target.value))}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Rate</span>
              <input
                ref={(el) => {
                  fieldRefs.current[5] = el;
                }}
                type="number"
                value={Number(draft.rate) || 0}
                onChange={(e) => setField("rate", Number(e.target.value))}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("list")}
          >
            Q: Back
          </button>
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={createState.isLoading}
            onClick={() => {
              playUiSound("post");
              submitCreate();
            }}
          >
            A: Accept
          </button>
          <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
            O: Close
          </span>
          <button
            type="button"
            className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("list")}
          >
            X: Cancel
          </button>
        </div>
      </div>
    );
  }

  if (detailBill) {
    return (
      <BillTallyDetail
        bill={detailBill}
        orgSettings={orgSettings}
        onBack={() => setDetailBill(null)}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold">
          {typeParam === "SALES" ? "Sales Invoices" : "Purchase Invoices"}
        </div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">
          Factory1
        </div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">
          Ctrl + M
        </div>
      </div>

      <div className="h-[calc(100%-7rem)] overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[#C8E6C9]">
            <tr className="border-b border-[#0F766E] text-left">
              <th className="w-12 px-2 py-1">S.No.</th>
              <th className="px-2 py-1">Bill No.</th>
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Party</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill, index) => {
              const selected = index === activeIndex;
              return (
                <tr
                  key={bill.id}
                  data-bill-index={index}
                  onClick={() => setSelectedIndex(index)}
                  className={[
                    "cursor-pointer border-b border-[#94A3B8]/40",
                    selected ? "bg-[#0F172A] text-white" : "hover:bg-[#6366F1]/10",
                  ].join(" ")}
                >
                  <td className="px-2 py-0.5 text-center">{index + 1}</td>
                  <td className="px-2 py-0.5 font-semibold">{bill.billNumber}</td>
                  <td className="px-2 py-0.5">{bill.billDate}</td>
                  <td className="px-2 py-0.5">{bill.partyName}</td>
                  <td className="px-2 py-0.5">{bill.status}</td>
                  <td className="px-2 py-0.5 text-right">
                    {formatCurrency(bill.grandTotal)}
                  </td>
                </tr>
              );
            })}
            {bills.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-8 text-center text-slate-500"
                >
                  {isFetching
                    ? "Loading..."
                    : "No invoices. Press N to create one."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => setScreen("create")}
        >
          N: Create
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/tally/billing?type=PURCHASE")}
        >
          P: Purchase
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/tally/billing?type=SALES")}
        >
          S: Sales
        </button>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/gateway?menu=billing")}
        >
          O: Close
        </button>
      </div>
    </div>
  );
}

function BillTallyDetail({
  bill,
  orgSettings,
  onBack,
}: {
  bill: Bill;
  orgSettings?: unknown;
  onBack: () => void;
}) {
  async function onPrint() {
    if (!(await printInvoice(bill, orgSettings as never))) {
      toast.error("Could not open print window");
    }
  }

  async function onDownload() {
    const html = invoiceHtml(bill, orgSettings as never);
    await downloadDocument(`${bill.billNumber || "bill"}.html`, html);
    toast.success("Invoice downloaded");
  }

  async function onShare() {
    const html = invoiceHtml(bill, orgSettings as never);
    const handled = await shareDocument(
      `${bill.billNumber} - ${bill.partyName}`,
      html,
    );
    if (!handled) toast.info("Sharing not supported — use Print or Download");
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "q" || key === "o") {
        event.preventDefault();
        onBack();
      } else if (key === "p") {
        event.preventDefault();
        void onPrint();
      } else if (key === "h") {
        event.preventDefault();
        void onShare();
      } else if (key === "d") {
        event.preventDefault();
        void onDownload();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [bill, orgSettings]);

  const isSale = bill.type === "SALES";

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold">
          {isSale ? "Sales Invoice" : "Purchase Invoice"} Detail
        </div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">
          {bill.billNumber}
        </div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">
          Ctrl + M
        </div>
      </div>

      <div className="h-[calc(100%-7rem)] overflow-auto p-4">
        <div className="mx-auto max-w-2xl space-y-1 text-[13px]">
          <DetailRow label="Bill Number" value={bill.billNumber} />
          <DetailRow label="Date" value={bill.billDate} />
          <DetailRow label="Party" value={bill.partyName} />
          <DetailRow label="GST" value={bill.partyGstNumber || "—"} />
          <DetailRow label="Status" value={`${bill.status} / ${bill.paymentStatus}`} />

          {bill.items?.length ? (
            <div className="mt-2 border border-[#0F766E]">
              <div className="grid grid-cols-[1fr_60px_70px_90px] gap-1 border-b border-[#0F766E] bg-[#C8E6C9] px-2 py-1 text-[11px] uppercase">
                <span>Particulars</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Amount</span>
              </div>
              {bill.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_60px_70px_90px] gap-1 border-b border-[#94A3B8]/40 px-2 py-0.5"
                >
                  <span>{item.itemName}</span>
                  <span className="text-right">{item.quantity}</span>
                  <span className="text-right">{formatCurrency(item.rate)}</span>
                  <span className="text-right">
                    {formatCurrency(
                      (item.taxableAmount ?? item.quantity * item.rate) || 0,
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-2">
            <DetailRow label="Taxable" value={formatCurrency(bill.taxableAmount)} />
            <DetailRow label="CGST" value={formatCurrency(bill.cgstAmount)} />
            <DetailRow label="SGST" value={formatCurrency(bill.sgstAmount)} />
            <DetailRow label="IGST" value={formatCurrency(bill.igstAmount)} />
            <DetailRow
              label="Grand Total"
              value={formatCurrency(bill.grandTotal)}
              bold
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          Q: Back
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onPrint}
        >
          P: Print
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onShare}
        >
          H: Share
        </button>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onDownload}
        >
          D: Download
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#94A3B8]/40 py-1">
      <span className="text-slate-600">{label}</span>
      <span className={bold ? "font-bold" : ""}>{value}</span>
    </div>
  );
}
