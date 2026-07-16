"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import type { AuthUser } from "@/features/auth/types";
import type {
  AccountingVoucher,
  VoucherType,
} from "@/features/accounting/types/accounting.types";
import { labelCase } from "@/features/accounting/utils/accountingFormat";

type TallyVoucherListProps = {
  voucherType: VoucherType;
  vouchers: AccountingVoucher[];
  isFetching: boolean;
  onSelectVoucher: (voucher: AccountingVoucher) => void;
  onCreateNew: () => void;
  onBack: () => void;
};

const voucherHelp: Record<VoucherType, string> = {
  PAYMENT: "Money paid out to suppliers, expenses, employees or bank charges.",
  RECEIPT: "Money received from customers, owners, banks or other income.",
  CONTRA: "Transfer between cash and bank ledgers without changing profit.",
  JOURNAL: "Manual adjustment entry for provisions, corrections and transfers.",
  DEBIT_NOTE:
    "Increase receivable or reduce supplier payable for returns, shortages or rate differences.",
  CREDIT_NOTE:
    "Reduce customer receivable or increase payable for sales returns, discounts or corrections.",
  SALES:
    "Goods or services sold on credit or cash; books revenue and the corresponding ledger.",
  PURCHASE:
    "Goods or services bought on credit or cash; books expense and the corresponding ledger.",
};

const topActions = [
  { key: "Ctrl+L", label: "Licence", enabled: false },
  { key: "Alt+E", label: "Export", enabled: false },
  { key: "Alt+G", label: "Go To", enabled: false },
  { key: "F4", label: "Contra", enabled: true },
  { key: "F5", label: "Payment", enabled: true },
  { key: "F6", label: "Receipt", enabled: true },
  { key: "F7", label: "Journal", enabled: true },
  { key: "F8", label: "Sales", enabled: true },
  { key: "F9", label: "Purchase", enabled: true },
  { key: "F12", label: "Configure", enabled: false },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TallyVoucherList({
  voucherType,
  vouchers,
  isFetching,
  onSelectVoucher,
  onCreateNew,
  onBack,
}: TallyVoucherListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showQuitPrompt, setShowQuitPrompt] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () =>
      [...vouchers].sort(
        (a, b) =>
          new Date(b.voucherDate).getTime() - new Date(a.voucherDate).getTime()
      ),
    [vouchers]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [vouchers]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-voucher-index="${selectedIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("role") === "combobox"
      ) {
        return;
      }

      if (showQuitPrompt) {
        if (event.key === "Escape" || event.key.toLowerCase() === "n") {
          event.preventDefault();
          setShowQuitPrompt(false);
          return;
        }
        if (event.key === "Enter" || event.key.toLowerCase() === "y") {
          event.preventDefault();
          onBack();
          return;
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setShowQuitPrompt(true);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((c) => Math.min(c + 1, sorted.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((c) => Math.max(c - 1, 0));
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setSelectedIndex(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        setSelectedIndex(Math.max(sorted.length - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const v = sorted[selectedIndex];
        if (v) onSelectVoucher(v);
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        onCreateNew();
        return;
      }

      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        onBack();
        return;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showQuitPrompt, selectedIndex, sorted, onSelectVoucher, onCreateNew, onBack]);

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid min-h-7 grid-cols-2 border-b border-[#0F766E] bg-[#C8E6C9] text-xs sm:grid-cols-4 lg:grid-cols-8">
        {topActions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={!action.enabled}
            className={[
              "border-r border-[#0F766E] px-2 py-1 text-left",
              action.enabled
                ? "hover:bg-[#6366F1] hover:text-white"
                : "cursor-not-allowed text-slate-500 opacity-60",
            ].join(" ")}
            title={action.label}
          >
            <span
              className={[
                "font-bold",
                action.enabled ? "text-[#EF4444]" : "text-slate-500",
              ].join(" ")}
            >
              {action.key}
            </span>
            <span>: {action.label}</span>
          </button>
        ))}
      </div>

      <div className="flex h-[calc(100%-7rem)] min-h-0 flex-col overflow-hidden">
        <div className="border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2">
          <div className="text-center text-sm font-bold">
            {labelCase(voucherType)} Register
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-normal text-slate-600">
              {voucherHelp[voucherType]}
            </span>
            <span className="text-slate-600">
              {sorted.length} voucher{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#C8E6C9]">
              <tr className="border-b border-[#0F766E] text-left">
                <th className="w-12 px-2 py-1">S.No.</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Vch No.</th>
                <th className="px-2 py-1">Particulars</th>
                <th className="px-2 py-1 text-right">Debit</th>
                <th className="px-2 py-1 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((voucher, index) => {
                const isSelected = index === selectedIndex;
                const particulars = voucher.lines
                  .map((l) => l.ledgerName ?? l.ledgerId)
                  .slice(0, 2)
                  .join(", ");

                return (
                  <tr
                    key={voucher.id}
                    data-voucher-index={index}
                    onClick={() => {
                      setSelectedIndex(index);
                      onSelectVoucher(voucher);
                    }}
                    className={[
                      "cursor-pointer border-b border-[#94A3B8]/40",
                      isSelected
                        ? "bg-[#0F172A] text-white"
                        : "hover:bg-[#6366F1]/10",
                      voucher.cancelledAt
                        ? "line-through opacity-60"
                        : "",
                    ].join(" ")}
                  >
                    <td className="px-2 py-0.5 text-center">{index + 1}</td>
                    <td className="px-2 py-0.5">{formatDate(voucher.voucherDate)}</td>
                    <td className="px-2 py-0.5 font-semibold">
                      {voucher.voucherNumber || "---"}
                    </td>
                    <td className="px-2 py-0.5">{particulars || "---"}</td>
                    <td className="px-2 py-0.5 text-right">
                      {voucher.totalDebit > 0
                        ? formatCurrency(voucher.totalDebit)
                        : ""}
                    </td>
                    <td className="px-2 py-0.5 text-right">
                      {voucher.totalCredit > 0
                        ? formatCurrency(voucher.totalCredit)
                        : ""}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-2 py-8 text-center text-slate-500"
                  >
                    {isFetching
                      ? "Loading vouchers..."
                      : "No vouchers found. Press N to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onCreateNew}
        >
          N: Create
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => {
            const v = sorted[selectedIndex];
            if (v) onSelectVoucher(v);
          }}
        >
          Enter: Alter
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          P: Print
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          O: Close
        </button>
      </div>

      {showQuitPrompt && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <div className="w-72 border-2 border-[#0F766E] bg-[#FEFCE8] shadow-lg">
            <div className="bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
              Quit?
            </div>
            <div className="space-y-3 px-5 py-4 text-center">
              <div className="font-bold">Yes or No</div>
              <div className="text-[11px] text-slate-600">
                Press Enter or &apos;Y&apos; to confirm, Escape or &apos;N&apos; to cancel.
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <button
                  type="button"
                  autoFocus
                  className="border border-[#0F766E] bg-[#0F172A] px-3 py-1 font-bold text-white"
                  onClick={onBack}
                >
                  Y: Yes
                </button>
                <button
                  type="button"
                  className="border border-[#0F766E] px-3 py-1 hover:bg-[#6366F1] hover:text-white"
                  onClick={() => setShowQuitPrompt(false)}
                >
                  N: No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
