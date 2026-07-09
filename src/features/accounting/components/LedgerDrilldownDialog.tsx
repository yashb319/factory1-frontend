"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BalanceType, VoucherType } from "../types/accounting.types";
import { formatCurrency, labelCase } from "../utils/accountingFormat";

export type SelectedLedger = {
  id: string;
  name: string;
};

export type LedgerDrilldownRow = {
  voucherId: string;
  lineId: string;
  voucherNumber: string;
  voucherType: VoucherType;
  voucherDate: string;
  ledgerName: string;
  entryType: BalanceType;
  debit: number;
  credit: number;
  narration?: string | null;
  description?: string | null;
};

type Props = {
  selectedLedger: SelectedLedger | null;
  rows: LedgerDrilldownRow[];
  totals: {
    debit: number;
    credit: number;
  };
  fromDate: string;
  toDate: string;
  onClose: () => void;
  onExport: () => void;
};

export function LedgerDrilldownDialog({
  selectedLedger,
  rows,
  totals,
  fromDate,
  toDate,
  onClose,
  onExport,
}: Props) {
  return (
    <Dialog
      open={Boolean(selectedLedger)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{selectedLedger?.name ?? "Ledger"} Drill-down</DialogTitle>
          <DialogDescription>
            Voucher movement for {fromDate} to {toDate}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Debit" value={formatCurrency(totals.debit)} />
          <Metric title="Credit" value={formatCurrency(totals.credit)} />
          <Metric
            title="Net"
            value={formatCurrency(Math.abs(totals.debit - totals.credit))}
          />
        </div>

        <div className="max-h-[460px] overflow-auto rounded-md border">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Voucher</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Dr/Cr</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-left">Narration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.voucherId}-${row.lineId}`} className="border-t">
                  <td className="p-3">{row.voucherDate}</td>
                  <td className="p-3 font-medium">{row.voucherNumber}</td>
                  <td className="p-3">{labelCase(row.voucherType)}</td>
                  <td className="p-3">{row.entryType}</td>
                  <td className="p-3 text-right">
                    {row.debit ? formatCurrency(row.debit) : "-"}
                  </td>
                  <td className="p-3 text-right">
                    {row.credit ? formatCurrency(row.credit) : "-"}
                  </td>
                  <td className="p-3">
                    <div>{row.narration || "-"}</div>
                    {row.description ? (
                      <div className="text-xs text-muted-foreground">
                        {row.description}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td
                    className="p-8 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    No voucher movement found for this ledger in the selected period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onExport} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
