"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toCsv } from "@/features/import-export/utils/csv";
import { downloadCsv } from "@/features/import-export/utils/localExportFiles";
import type {
  AccountLedger,
  AccountingVoucher,
} from "../types/accounting.types";
import { formatCurrency, labelCase } from "../utils/accountingFormat";

type Props = {
  vouchers: AccountingVoucher[];
  ledgers: AccountLedger[];
};

type CashBankRow = {
  voucherDate: string;
  voucherNumber: string;
  voucherType: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
};

export function CashBankBook({ vouchers, ledgers }: Props) {
  const cashBankLedgers = useMemo(
    () => ledgers.filter((ledger) => isCashBankLedger(ledger)),
    [ledgers]
  );
  const [selectedLedgerId, setSelectedLedgerId] = useState("");

  const selectedLedger =
    cashBankLedgers.find((ledger) => ledger.id === selectedLedgerId) ??
    cashBankLedgers[0];

  const rows = useMemo(
    () =>
      selectedLedger
        ? buildCashBankRows(vouchers, selectedLedger)
        : [],
    [selectedLedger, vouchers]
  );
  const totals = rows.reduce(
    (summary, row) => {
      summary.debit += row.debit;
      summary.credit += row.credit;
      summary.closing = row.balance;
      return summary;
    },
    {
      debit: 0,
      credit: 0,
      closing: openingBalance(selectedLedger),
    }
  );

  function exportRows() {
    if (!selectedLedger || !rows.length) {
      toast.info("No cash/bank rows to export");
      return;
    }

    const content = toCsv([
      [
        "Date",
        "Voucher Number",
        "Voucher Type",
        "Particulars",
        "Debit",
        "Credit",
        "Running Balance",
      ],
      ...rows.map((row) => [
        row.voucherDate,
        row.voucherNumber,
        row.voucherType,
        row.particulars,
        row.debit,
        row.credit,
        row.balance,
      ]),
    ]);

    downloadCsv({
      fileName: `cash-bank-book-${selectedLedger.name}.csv`,
      content,
    });
    toast.success("Cash/Bank Book CSV downloaded");
  }

  return (
    <Card id="cash-bank-book" className="rounded-lg scroll-mt-24">
      <CardHeader className="border-b">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <CardTitle>Cash/Bank Book</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Running balance from posted cash and bank voucher lines.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label>Ledger</Label>
              <Select
                value={selectedLedger?.id ?? ""}
                onValueChange={setSelectedLedgerId}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select cash/bank ledger" />
                </SelectTrigger>
                <SelectContent>
                  {cashBankLedgers.map((ledger) => (
                    <SelectItem key={ledger.id} value={ledger.id}>
                      {ledger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportRows} disabled={!rows.length}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="rounded-lg border border-slate-900 bg-slate-950 p-4 text-white">
            <div className="text-xs uppercase tracking-wide text-slate-300">
              Closing Balance
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {formatCurrency(totals.closing)}
            </div>
            <div className="mt-2 text-xs text-slate-300">
              {selectedLedger?.name ?? "No cash/bank ledger selected"}
            </div>
          </div>
          <Metric title="Receipts / Debits" value={formatCurrency(totals.debit)} />
          <Metric title="Payments / Credits" value={formatCurrency(totals.credit)} />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="responsive-table w-full min-w-[920px] text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Voucher</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Particulars</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.voucherNumber}-${row.particulars}-${row.debit}-${row.credit}`}
                  className="border-t"
                >
                  <td className="p-3" data-label="Date">{row.voucherDate}</td>
                  <td className="p-3 font-medium" data-label="Voucher">{row.voucherNumber}</td>
                  <td className="p-3" data-label="Type">{row.voucherType}</td>
                  <td className="p-3" data-label="Particulars">{row.particulars}</td>
                  <td className="p-3 text-right" data-label="Debit">
                    {row.debit ? formatCurrency(row.debit) : "-"}
                  </td>
                  <td className="p-3 text-right" data-label="Credit">
                    {row.credit ? formatCurrency(row.credit) : "-"}
                  </td>
                  <td className="p-3 text-right font-semibold" data-label="Balance">
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td
                    className="p-8 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    No cash/bank movement found for this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function buildCashBankRows(
  vouchers: AccountingVoucher[],
  ledger: AccountLedger
): CashBankRow[] {
  let runningBalance = openingBalance(ledger);

  return vouchers
    .flatMap((voucher) =>
      voucher.lines
        .filter((line) => line.ledgerId === ledger.id)
        .map((line) => {
          const amount = Number(line.amount || 0);
          const debit = line.entryType === "DR" ? amount : 0;
          const credit = line.entryType === "CR" ? amount : 0;
          runningBalance += debit - credit;

          const oppositeLedgers = voucher.lines
            .filter((other) => other.ledgerId !== ledger.id)
            .map((other) => other.ledgerName)
            .filter(Boolean)
            .join(", ");

          return {
            voucherDate: voucher.voucherDate,
            voucherNumber: voucher.voucherNumber,
            voucherType: labelCase(voucher.voucherType),
            particulars: oppositeLedgers || voucher.narration || "Voucher movement",
            debit,
            credit,
            balance: runningBalance,
          };
        })
    );
}

function isCashBankLedger(ledger: AccountLedger) {
  const value = `${ledger.name} ${ledger.groupName ?? ""}`.toLowerCase();
  return [
    "cash",
    "bank",
    "upi",
    "current account",
    "savings",
    "hdfc",
    "icici",
    "sbi",
    "axis",
    "kotak",
  ].some((keyword) => value.includes(keyword));
}

function openingBalance(ledger: AccountLedger | undefined) {
  if (!ledger) return 0;
  return ledger.balanceType === "DR"
    ? Number(ledger.openingBalance || 0)
    : -Number(ledger.openingBalance || 0);
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
