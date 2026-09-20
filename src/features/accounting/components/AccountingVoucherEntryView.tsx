"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCreateAccountingVoucherDraftMutation,
  useGetAccountingPeriodsQuery,
  useGetAccountMastersQuery,
  usePostAccountingVoucherMutation,
  useUpdateAccountingVoucherMutation,
} from "@/features/accounting/api/accountingApi";
import type {
  AccountingVoucher,
  BalanceType,
  VoucherType,
} from "@/features/accounting/types/accounting.types";
import { labelCase } from "@/features/accounting/utils/accountingFormat";
import { voucherHtml } from "@/features/accounting/utils/voucherPrint";
import { downloadDocument, printDocument, shareDocument } from "@/lib/tallyDocuments";
import { playUiSound } from "@/lib/uiSounds";

type LineDraft = {
  ledgerId: string;
  entryType: BalanceType;
  amount: string;
  description: string;
};

const EMPTY_LINE: LineDraft = {
  ledgerId: "",
  entryType: "DR",
  amount: "",
  description: "",
};

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-tally-focus]"),
  );
}

function isEditableControl(target: HTMLElement) {
  return (
    target.isContentEditable ||
    target.matches("input, textarea, select, [contenteditable='true']") ||
    target.getAttribute("role") === "combobox" ||
    Boolean(
      target.closest(
        "[contenteditable]:not([contenteditable='false']), [role='combobox']",
      ),
    )
  );
}

export function AccountingVoucherEntryView({
  voucherType,
  mode,
  voucher,
  onBack,
}: {
  voucherType: VoucherType;
  mode: "create" | "alter";
  voucher?: AccountingVoucher;
  onBack: () => void;
}) {
  const { data: masters } = useGetAccountMastersQuery();

  const { data: periods = [], isSuccess: periodsLoaded } =
    useGetAccountingPeriodsQuery();
  const [createVoucherDraft, createState] =
    useCreateAccountingVoucherDraftMutation();
  const [updateVoucher, updateState] = useUpdateAccountingVoucherMutation();
  const [postVoucher, postState] = usePostAccountingVoucherMutation();

  const [voucherDate, setVoucherDate] = useState(
    voucher?.voucherDate ?? new Date().toISOString().slice(0, 10),
  );
  const [narration, setNarration] = useState(voucher?.narration ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    voucher?.lines?.length
      ? voucher.lines.map((line) => ({
          ledgerId: line.ledgerId,
          entryType: line.entryType,
          amount: String(line.amount ?? ""),
          description: line.description ?? "",
        }))
      : [
          { ...EMPTY_LINE },
          { ...EMPTY_LINE, entryType: "CR" },
        ],
  );
  const [focusIndex, setFocusIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const ledgers = masters?.ledgers ?? [];
  const historicalLedgerIds = useMemo(
    () => new Set(mode === "alter" ? voucher?.lines.map((line) => line.ledgerId) : []),
    [mode, voucher],
  );
  const selectableLedgers = useMemo(
    () =>
      ledgers.filter(
        (ledger) => ledger.active || historicalLedgerIds.has(ledger.id),
      ),
    [historicalLedgerIds, ledgers],
  );
  const ledgerNames = useMemo(() => {
    const map: Record<string, string> = {};
    ledgers.forEach((ledger) => {
      map[ledger.id] = ledger.name;
    });
    voucher?.lines?.forEach((line) => {
      if (line.ledgerName) map[line.ledgerId] = line.ledgerName;
    });
    return map;
  }, [ledgers, voucher]);

  const totals = useMemo(() => {
    const debit = lines.reduce(
      (sum, l) => (l.entryType === "DR" ? sum + (Number(l.amount) || 0) : sum),
      0,
    );
    const credit = lines.reduce(
      (sum, l) => (l.entryType === "CR" ? sum + (Number(l.amount) || 0) : sum),
      0,
    );
    return { debit, credit, difference: Math.abs(debit - credit) };
  }, [lines]);
  const voucherPeriod = periods.find(
    (period) =>
      period.startDate <= voucherDate && period.endDate >= voucherDate,
  );
  const dateWarning = periodsLoaded
    ? !voucherPeriod
      ? "Date is outside every configured accounting period."
      : voucherPeriod.status === "CLOSED"
        ? `${voucherPeriod.name} is closed. Save as draft or choose an open date to post.`
        : null
    : null;

  useEffect(() => {
    const nodes = focusables(rootRef.current);
    const target = nodes[Math.min(focusIndex, nodes.length - 1)];
    target?.focus();
  }, [focusIndex, lines.length]);

  function moveFocus(delta: number) {
    setFocusIndex((index) => {
      const count = focusables(rootRef.current).length;
      return Math.max(0, Math.min(count - 1, index + delta));
    });
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    playUiSound("enter");
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
    setTimeout(
      () => setFocusIndex(focusables(rootRef.current).length - 1),
      0,
    );
  }

  function removeLine(index: number) {
    if (lines.length <= 2) {
      toast.error("A voucher needs at least two entries");
      return;
    }
    playUiSound("enter");
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function buildPayload() {
    return {
      voucherType,
      voucherDate,
      narration: narration || null,
      lines: lines.map((line) => ({
        ledgerId: line.ledgerId,
        entryType: line.entryType,
        amount: Number(line.amount) || 0,
        description: line.description || null,
      })),
    };
  }

  function validate(intent: "draft" | "post"): boolean {
    if (!lines.length) {
      toast.error("Add at least one entry");
      return false;
    }
    for (const line of lines) {
      if (!line.ledgerId) {
        toast.error("Every entry needs a ledger");
        return false;
      }
      if (
        mode === "create" &&
        !ledgers.some((ledger) => ledger.id === line.ledgerId && ledger.active)
      ) {
        toast.error("New vouchers can only use active ledgers");
        return false;
      }
      if (!(Number(line.amount) > 0)) {
        toast.error("Every entry needs an amount greater than zero");
        return false;
      }
    }
    if (intent === "post" && totals.difference > 0.01) {
      toast.error(
        `Debits and credits must match. Difference: ₹${totals.difference.toFixed(2)}`,
      );
      return false;
    }
    return true;
  }

  async function accept(intent: "draft" | "post") {
    if (!validate(intent)) return;
    setSubmitError(null);
    let draft: AccountingVoucher | null = null;
    try {
      const payload = buildPayload();
      const draftId = voucher?.id ?? savedDraftId;
      if (draftId) {
        draft = (await updateVoucher({ id: draftId, ...payload }).unwrap()).data;
      } else {
        draft = (await createVoucherDraft(payload).unwrap()).data;
        setSavedDraftId(draft.id);
      }
      if (intent === "post") {
        await postVoucher(draft.id).unwrap();
        toast.success("Voucher posted");
        playUiSound("post");
      } else {
        toast.success(mode === "alter" ? "Draft updated" : "Draft saved");
      }
      onBack();
    } catch (error) {
      if (draft && intent === "post") {
        toast.info(`Draft ${draft.voucherNumber} was saved and remains editable`);
      }
      const message = apiErrorMessage(error) ??
        (intent === "post" ? "Could not post voucher" : "Could not save draft");
      setSubmitError(message);
      toast.error(message);
    }
  }

  function currentHtml(): string {
    const draft: AccountingVoucher = {
      id: voucher?.id ?? "draft",
      voucherNumber: voucher?.voucherNumber ?? "DRAFT",
      voucherType,
      voucherDate,
      narration,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      posted: voucher?.posted ?? false,
      lifecycleStatus: voucher?.lifecycleStatus ?? "DRAFT",
      lines: lines.map((line, i) => ({
        id: `line-${i}`,
        ledgerId: line.ledgerId,
        ledgerName: ledgerNames[line.ledgerId],
        entryType: line.entryType,
        amount: Number(line.amount) || 0,
        description: line.description,
      })),
    };
    return voucherHtml(draft);
  }

  async function onPrint() {
    if (!(await printDocument(currentHtml()))) {
      toast.error("Could not open print window");
    }
  }

  async function onDownload() {
    const name = `${labelCase(voucherType)}Voucher-${voucher?.voucherNumber ?? "draft"}.html`;
    await downloadDocument(name, currentHtml());
    toast.success("Voucher downloaded");
  }

  async function onShare() {
    const handled = await shareDocument(
      `${labelCase(voucherType)} Voucher ${voucher?.voucherNumber ?? ""}`,
      currentHtml(),
    );
    if (!handled) toast.info("Sharing not supported on this device — use Print or Download");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const tag = target.tagName;
      if (isEditableControl(target)) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveFocus(1);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveFocus(-1);
          return;
        }
        if (event.key === "Enter" && tag !== "TEXTAREA" && tag !== "SELECT") {
          event.preventDefault();
          moveFocus(1);
        }
        return;
      }

      const key = event.key.toLowerCase();
      const unmodified =
        !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (unmodified && key === "a") {
        event.preventDefault();
        void accept("draft");
      } else if (unmodified && (key === "q" || key === "o")) {
        event.preventDefault();
        onBack();
      } else if (unmodified && key === "p") {
        event.preventDefault();
        void onPrint();
      } else if (unmodified && key === "h") {
        event.preventDefault();
        void onShare();
      } else if (unmodified && key === "d") {
        event.preventDefault();
        void onDownload();
      } else if (key === "insert") {
        event.preventDefault();
        addLine();
      } else if (key === "delete") {
        const lineIdx = Number(
          target.closest<HTMLElement>("[data-tally-line-index]")?.dataset
            .tallyLineIndex,
        );
        if (lineIdx >= 0 && lineIdx < lines.length) {
          event.preventDefault();
          removeLine(lineIdx);
        }
      } else if (key === "escape") {
        event.preventDefault();
        onBack();
      }
    }

    const root = rootRef.current;
    root?.addEventListener("keydown", onKeyDown, true);
    return () => root?.removeEventListener("keydown", onKeyDown, true);
  }, [lines, totals, narration, voucherDate, voucher, mode, voucherType, ledgerNames]);

  const saving = createState.isLoading || updateState.isLoading || postState.isLoading;

  return (
    <div
      ref={rootRef}
      className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]"
    >
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold">
          {labelCase(voucherType)} Voucher {mode === "alter" ? "Alteration" : "Creation"}
        </div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">Factory1</div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">Ctrl + M</div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2">
        <label className="grid grid-cols-[120px_1fr] items-center gap-3">
          <span className="px-1 font-bold">Voucher Date</span>
          <input
            data-tally-focus
            type="date"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
            className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
          />
          {dateWarning ? (
            <span role="status" className="col-span-2 text-[11px] text-amber-700">
              {dateWarning}
            </span>
          ) : voucherPeriod ? (
            <span className="col-span-2 text-[11px] text-emerald-700">
              Open period: {voucherPeriod.name}
            </span>
          ) : null}
        </label>
        <label className="grid grid-cols-[100px_1fr] items-center gap-3">
          <span className="px-1 font-bold">Narration</span>
          <input
            data-tally-focus
            type="text"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Optional"
            className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
          />
        </label>
      </div>

      <div className="grid grid-cols-[40px_1fr_80px_140px_1fr_28px] gap-2 border-b border-[#0F766E] bg-[#C8E6C9] px-4 py-1 text-[11px] uppercase">
        <span className="text-center">#</span>
        <span>Ledger</span>
        <span>Type</span>
        <span className="text-right">Amount</span>
        <span>Description</span>
        <span />
      </div>

      <div className="h-[calc(100%-15rem)] overflow-auto px-4">
        {lines.map((line, index) => (
          <div
            key={index}
            data-tally-line-index={index}
            className="my-1 grid grid-cols-[40px_1fr_80px_140px_1fr_28px] items-center gap-2"
          >
            <span className="text-center text-[var(--factory1-text-muted)]">{index + 1}</span>
            <select
              data-tally-focus
              value={line.ledgerId}
              onChange={(e) => updateLine(index, { ledgerId: e.target.value })}
              className="h-6 w-full border-0 border-b border-[#0F766E] bg-transparent outline-none focus:bg-[#FFF7C2]"
            >
              <option value="">Select Ledger</option>
              {selectableLedgers.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.name}{ledger.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            <select
              data-tally-focus
              value={line.entryType}
              onChange={(e) => updateLine(index, { entryType: e.target.value as BalanceType })}
              className="h-6 w-full border-0 border-b border-[#0F766E] bg-transparent outline-none focus:bg-[#FFF7C2]"
            >
              <option value="DR">Dr</option>
              <option value="CR">Cr</option>
            </select>
            <input
              data-tally-focus
              type="number"
              min="0"
              step="0.01"
              value={line.amount}
              onChange={(e) => updateLine(index, { amount: e.target.value })}
              className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 text-right outline-none focus:bg-[#FFF7C2]"
            />
            <input
              data-tally-focus
              type="text"
              value={line.description}
              onChange={(e) => updateLine(index, { description: e.target.value })}
              placeholder="Optional"
              className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
            />
            <button
              type="button"
              data-tally-focus
              onClick={() => removeLine(index)}
              aria-label={`Remove voucher line ${index + 1}`}
              className="h-6 rounded border border-[#0F766E] hover:bg-[#6366F1] hover:text-white"
            >
              X
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#0F766E] bg-[#D9F99D]/40 px-4 py-1 text-xs">
        <button
          type="button"
          data-tally-focus
          onClick={addLine}
          className="rounded border border-[#0F766E] px-3 py-1 hover:bg-[#6366F1] hover:text-white"
        >
          + Add Line (Ins)
        </button>
        <div className="flex gap-4">
          <span>
            Dr: <strong>₹{totals.debit.toFixed(2)}</strong>
          </span>
          <span>
            Cr: <strong>₹{totals.credit.toFixed(2)}</strong>
          </span>
          <span className={totals.difference > 0.01 ? "text-red-500" : "text-green-600"}>
            Diff: ₹{totals.difference.toFixed(2)}
          </span>
        </div>
      </div>

      {submitError ? (
        <div role="alert" className="border-t border-red-300 bg-red-50 px-3 py-1 text-xs text-red-800">
          {submitError} Your entered voucher has been preserved.
        </div>
      ) : null}
      <div className="grid grid-cols-5 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          Q: Back
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:opacity-60"
          disabled={saving}
          onClick={() => void accept("draft")}
        >
          A: Save Draft
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:opacity-60"
          disabled={saving || totals.difference > 0.01 || Boolean(dateWarning)}
          onClick={() => void accept("post")}
        >
          Post
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
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onShare}
        >
          H: Share
        </button>
      </div>
      <div className="grid grid-cols-3 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onDownload}
        >
          D: Download
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          Ins: Add Line
        </span>
        <span className="px-2 py-1 text-slate-600">Del: Remove Line</span>
      </div>
    </div>
  );
}

function apiErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const data = (error as { data?: { message?: unknown } }).data;
  return typeof data?.message === "string" ? data.message : null;
}
