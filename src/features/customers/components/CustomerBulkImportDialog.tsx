"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBulkCreateCustomersMutation } from "../api/customerApi";
import { saveFile } from "@/features/import-export/utils/localExportFiles";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { toImportReportParams } from "@/features/import-export/utils/importReportParams";
import type {
  CustomerRequest,
  CustomerStatus,
} from "../types/customer.types";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ParsedRow = CustomerRequest & {
  rowNumber: number;
  error?: string;
  customerCode?: string;
};

export function CustomerBulkImportDialog({ open, onClose }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [message, setMessage] = useState("");

  const [bulkCreate, state] = useBulkCreateCustomersMutation();
  const logDataJob = useLogDataJob();

  const validRows = useMemo(() => rows.filter((row) => !row.error), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => row.error), [rows]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const text = await file.text();
    setRows(parseCsv(text));
    setMessage("");
  };

  const handleImport = async () => {
    try {
      const response = await bulkCreate({
        customers: validRows.map(
          ({ rowNumber, error, customerCode, ...customer }) => customer
        ),
      }).unwrap();

      const msg = `Imported ${response.data.successCount} customer(s). Failed ${response.data.failedCount}.`;
      setMessage(msg);

      if (response.data.failedCount > 0) toast.warning(msg);
      else toast.success("Customers imported successfully");

      const report = toImportReportParams(rows as Array<Record<string, unknown>>);

      logDataJob({
        operation: "IMPORT",
        module: "CUSTOMER",
        fileName: "customers-import.csv",
        status:
          response.data.failedCount > 0 ? "PARTIAL_SUCCESS" : "COMPLETED",
        progress: 100,
        totalRows: validRows.length,
        successRows: response.data.successCount,
        failedRows: response.data.failedCount,
        parameters: {
          reportType: "IMPORT_TEMPLATE",
          module: "CUSTOMER",
          headers: report.headers,
          validRows: report.validRows,
          errorRows: report.errorRows,
        },
        notes: msg,
      });
    } catch {
      toast.error("Failed to import customers");
    }
  };

  const downloadTemplate = async () => {
    const csv = [
      [
        "customerCode",
        "name",
        "phone",
        "email",
        "gstNumber",
        "billingAddress",
        "shippingAddress",
        "city",
        "state",
        "contactPerson",
        "paymentTerms",
        "status",
        "notes",
      ].join(","),
      [
        "CUS-001",
        "XYZ Retailers",
        "9876543210",
        "xyz@example.com",
        "29ABCDE1234F1Z5",
        "MG Road Bangalore",
        "Warehouse Area Bangalore",
        "Bangalore",
        "Karnataka",
        "Amit",
        "15 days credit",
        "ACTIVE",
        "Regular buyer",
      ].join(","),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    await saveFile({ fileName: "customer-import-template.csv", content: blob });
    toast.success("Customer import template downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Customers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            Upload CSV with customerCode, name, phone, email, gstNumber,
            billingAddress, shippingAddress, city, state, contactPerson,
            paymentTerms, status, notes.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              Download Template
            </Button>

            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="rounded-md border p-2 text-sm"
            />
          </div>

          {rows.length > 0 && (
            <div className="flex gap-3 text-sm">
              <div>Valid: {validRows.length}</div>
              <div>Invalid: {invalidRows.length}</div>
            </div>
          )}

          {message && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {message}
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="responsive-table w-full min-w-[900px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                    <th className="px-3 py-2 text-left">GST</th>
                    <th className="px-3 py-2 text-left">City</th>
                    <th className="px-3 py-2 text-left">Error</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className="border-t">
                      <td className="px-3 py-2" data-label="Row">{row.rowNumber}</td>
                      <td className="px-3 py-2" data-label="Code">{row.customerCode}</td>
                      <td className="px-3 py-2" data-label="Name">{row.name}</td>
                      <td className="px-3 py-2" data-label="Phone">{row.phone}</td>
                      <td className="px-3 py-2" data-label="GST">{row.gstNumber}</td>
                      <td className="px-3 py-2" data-label="City">{row.city}</td>
                      <td className="px-3 py-2 text-red-600" data-label="Error">
                        {row.error || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>

            <Button
              disabled={validRows.length === 0 || state.isLoading}
              onClick={handleImport}
            >
              {state.isLoading ? "Importing..." : "Import Valid Rows"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const [, ...dataLines] = lines;

  return dataLines.map((line, index) => {
    const cols = splitCsvLine(line);

    const row: ParsedRow = {
      rowNumber: index + 2,
      customerCode: cols[0] ?? "",
      name: cols[1] ?? "",
      phone: cols[2] ?? "",
      email: cols[3] ?? "",
      gstNumber: cols[4] ?? "",
      billingAddress: cols[5] ?? "",
      shippingAddress: cols[6] ?? "",
      city: cols[7] ?? "",
      state: cols[8] ?? "",
      contactPerson: cols[9] ?? "",
      paymentTerms: cols[10] ?? "",
      status: ((cols[11] ?? "ACTIVE") as CustomerStatus) || "ACTIVE",
      notes: cols[12] ?? "",
    };

    row.error = validateRow(row);

    return row;
  });
}

function validateRow(row: ParsedRow) {
  if (!row.name) return "Name is required";

  if (row.status && !["ACTIVE", "INACTIVE"].includes(row.status)) {
    return "Invalid status";
  }

  return undefined;
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') insideQuotes = !insideQuotes;
    else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }

  result.push(current.trim());

  return result.map((value) => value.replace(/^"|"$/g, ""));
}