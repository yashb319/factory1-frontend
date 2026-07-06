"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { exportGstReportCsv } from "@/features/billing/utils/gstReportExport";
import {
  useGetLedgerReportQuery,
  useLazyGetAccountingGstSummaryQuery,
} from "../api/accountingApi";
import { exportLedgerCsv } from "../utils/ledgerExport";

export function AccountingPage() {
  const [fromDate, setFromDate] = useState(
    () => currentQuarterRange().fromDate
  );
  const [toDate, setToDate] = useState(
    () => currentQuarterRange().toDate
  );
  const range = { fromDate, toDate };
  const { data, isLoading, isFetching } = useGetLedgerReportQuery(range);
  const [getGstSummary, gstState] = useLazyGetAccountingGstSummaryQuery();
  const logDataJob = useLogDataJob();

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

        <div className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[150px_150px_auto_auto]">
          <Input
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
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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

      <Card className="rounded-lg">
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
