"use client";

import { useMemo, useState } from "react";
import type * as XLSX from "xlsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { getErrorMessage } from "@/lib/apiError";
import {
  detectHeaderRowNumber,
  type ExtractedSheet,
  extractSheetRows,
  headerRowCandidates,
  readSheetMatrix,
  readWorkbook,
} from "@/features/employees/utils/employeeImportWorkbook";

import { useImportPayrollHistoryMutation } from "../api/payrollHistoryApi";
import { getMonthName } from "../utils/payroll.utils";
import {
  buildHistoryColumns,
  buildHistoryPreview,
  type HistoryColumn,
  suggestEmployeeCodeColumn,
  toPayrollHistoryRequest,
} from "../utils/payrollHistoryWorkbook";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (id: string) => void;
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-white px-2 text-sm disabled:opacity-50";
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const PREVIEW_LIMIT = 50;

export function PayrollHistoryImportDialog({ open, onOpenChange, onImported }: Props) {
  const [fileName, setFileName] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [headerRowNumber, setHeaderRowNumber] = useState<number | null>(null);
  const [extracted, setExtracted] = useState<ExtractedSheet | null>(null);
  const [columns, setColumns] = useState<HistoryColumn[]>([]);
  const [codeColumn, setCodeColumn] = useState("");
  const [valueColumns, setValueColumns] = useState<string[]>([]);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [serverError, setServerError] = useState("");

  const [importHistory, { isLoading: importing }] = useImportPayrollHistoryMutation();

  const matrix = useMemo(
    () => (workbook && sheetName ? readSheetMatrix(workbook, sheetName) : null),
    [workbook, sheetName]
  );
  const headerCandidates = useMemo(
    () => (matrix ? headerRowCandidates(matrix) : []),
    [matrix]
  );

  const preview = useMemo(() => {
    if (!extracted || !codeColumn) return null;
    return buildHistoryPreview(extracted, columns, codeColumn, valueColumns);
  }, [extracted, columns, codeColumn, valueColumns]);

  const selectableColumns = columns.filter(
    (column) => column.sourceName !== codeColumn && !column.identityReason
  );
  const excludedColumns = columns.filter(
    (column) => column.sourceName !== codeColumn && column.identityReason
  );
  const unselectedColumns = selectableColumns.filter(
    (column) => !valueColumns.includes(column.sourceName)
  );
  const selectedColumns = columns.filter((column) =>
    valueColumns.includes(column.sourceName)
  );

  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const periodValid =
    Number.isInteger(yearNumber) &&
    yearNumber >= 1990 &&
    yearNumber <= 2100 &&
    monthNumber >= 1 &&
    monthNumber <= 12;

  const canImport =
    Boolean(preview) &&
    valueColumns.length > 0 &&
    (preview?.rows.length ?? 0) > 0 &&
    (preview?.errors.length ?? 1) === 0 &&
    periodValid &&
    confirmed &&
    !importing;

  function applyHeader(nextWorkbook: XLSX.WorkBook, nextSheet: string, header: number | null) {
    const nextMatrix = readSheetMatrix(nextWorkbook, nextSheet);
    const resolved = header ?? detectHeaderRowNumber(nextMatrix);
    setServerError("");
    setConfirmed(false);
    setValueColumns([]);
    if (resolved === null) {
      setHeaderRowNumber(null);
      setExtracted(null);
      setColumns([]);
      setCodeColumn("");
      return;
    }
    const nextExtracted = extractSheetRows(nextMatrix, resolved);
    const headerCells = nextMatrix.rows[resolved - nextMatrix.firstRowNumber] ?? [];
    const nextColumns = buildHistoryColumns(nextExtracted, headerCells);
    setHeaderRowNumber(resolved);
    setExtracted(nextExtracted);
    setColumns(nextColumns);
    setCodeColumn(suggestEmployeeCodeColumn(nextColumns) ?? "");
  }

  async function handleFileSelect(file: File) {
    try {
      const nextWorkbook = readWorkbook(await file.arrayBuffer());
      if (!nextWorkbook.SheetNames.length) {
        toast.error("No sheets found in file");
        return;
      }
      const nextSheet = nextWorkbook.SheetNames[0];
      setFileName(file.name);
      setWorkbook(nextWorkbook);
      setSheetName(nextSheet);
      applyHeader(nextWorkbook, nextSheet, null);
    } catch {
      toast.error("Failed to parse file");
      reset();
    }
  }

  function reset() {
    setFileName("");
    setWorkbook(null);
    setSheetName("");
    setHeaderRowNumber(null);
    setExtracted(null);
    setColumns([]);
    setCodeColumn("");
    setValueColumns([]);
    setYear("");
    setMonth("");
    setConfirmed(false);
    setServerError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  function toggleValueColumn(name: string, checked: boolean) {
    setConfirmed(false);
    setValueColumns((current) =>
      checked ? [...current, name] : current.filter((item) => item !== name)
    );
  }

  async function handleImport() {
    if (!preview || !canImport) return;
    setServerError("");
    try {
      const result = await importHistory(
        toPayrollHistoryRequest(yearNumber, monthNumber, preview)
      ).unwrap();
      toast.success(
        `Archived ${result.employeeCount} employee rows for ${getMonthName(result.month)} ${result.year}`
      );
      onImported?.(result.id);
      handleOpenChange(false);
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          "Import rejected. Nothing was archived; fix the file and try again."
        )
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Import Historical Payroll (read-only archive)</DialogTitle>
        </DialogHeader>

        <div className="h-[calc(90vh-73px)] space-y-5 overflow-y-auto px-6 py-6 text-sm">
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Stores past earnings and deductions exactly as they appear in the sheet, as a
            read-only record. This does not create or change a payroll run. Nothing is
            recalculated and no payments are made. Every row must match an existing employee
            code. If any row is rejected, nothing is archived.
          </p>

          {!workbook ? (
            <FileDropzone onFileSelect={handleFileSelect} />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium">File</span>
                  <div className="flex h-9 items-center justify-between rounded-md border px-2">
                    <span className="truncate">{fileName}</span>
                    <button type="button" className="text-xs underline" onClick={reset}>
                      Change
                    </button>
                  </div>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium">Sheet</span>
                  <select
                    aria-label="Sheet"
                    className={selectClass}
                    value={sheetName}
                    onChange={(event) => {
                      setSheetName(event.target.value);
                      applyHeader(workbook, event.target.value, null);
                    }}
                  >
                    {workbook.SheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium">Header row</span>
                  <select
                    aria-label="Header row"
                    className={selectClass}
                    value={headerRowNumber ?? ""}
                    onChange={(event) =>
                      applyHeader(workbook, sheetName, Number(event.target.value))
                    }
                  >
                    {headerCandidates.map((candidate) => (
                      <option key={candidate.rowNumber} value={candidate.rowNumber}>
                        Row {candidate.rowNumber} ({candidate.filledCells} filled cells)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium">Employee Code column</span>
                <select
                  aria-label="Employee Code column"
                  className={selectClass}
                  value={codeColumn}
                  onChange={(event) => {
                    setCodeColumn(event.target.value);
                    setValueColumns((current) =>
                      current.filter((name) => name !== event.target.value)
                    );
                    setConfirmed(false);
                  }}
                >
                  <option value="">Choose column…</option>
                  {columns.map((column) => (
                    <option key={column.sourceName} value={column.sourceName}>
                      {column.letter}: {column.label || "(no header)"}
                    </option>
                  ))}
                </select>
              </label>

              {codeColumn && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Payroll value columns to archive</h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setConfirmed(false);
                          setValueColumns(selectableColumns.map((column) => column.sourceName));
                        }}
                      >
                        Select all listed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setConfirmed(false);
                          setValueColumns([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose each numeric earnings, deduction or working-day column to keep. Values
                    are stored under the source column number and header (for example
                    &quot;7: Basic&quot;). Blank cells are left out, never stored as 0.
                  </p>
                  <div className="grid gap-1 md:grid-cols-3">
                    {selectableColumns.map((column) => (
                      <label key={column.sourceName} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={valueColumns.includes(column.sourceName)}
                          onChange={(event) =>
                            toggleValueColumn(column.sourceName, event.target.checked)
                          }
                        />
                        {column.key}
                      </label>
                    ))}
                  </div>
                  {excludedColumns.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Not archived (identity or personal data):{" "}
                      {excludedColumns.map((column) => column.key).join(", ")}
                    </p>
                  )}
                  {valueColumns.length > 0 && unselectedColumns.length > 0 && (
                    <p className="text-xs text-amber-800" data-testid="unselected-columns">
                      Not selected, so these columns will NOT be archived:{" "}
                      {unselectedColumns.map((column) => column.key).join(", ")}
                    </p>
                  )}
                </section>
              )}

              {preview && valueColumns.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Review</h3>
                  <p className="text-xs">
                    {preview.rows.length} employee rows ready · {preview.errors.length} errors ·{" "}
                    {preview.skipped.length} skipped rows
                    {extracted?.blankRowNumbers.length
                      ? ` · ${extracted.blankRowNumbers.length} blank rows ignored`
                      : ""}
                  </p>

                  {preview.errors.length > 0 && (
                    <ul className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800" aria-label="Row errors">
                      {preview.errors.map((issue, index) => (
                        <li key={`${issue.rowNumber}-${index}`}>
                          Row {issue.rowNumber}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}

                  {preview.skipped.length > 0 && (
                    <ul className="space-y-1 rounded-md border bg-slate-50 p-3 text-xs" aria-label="Skipped rows">
                      {preview.skipped.map((issue) => (
                        <li key={issue.rowNumber}>
                          Row {issue.rowNumber}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="max-h-80 overflow-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr>
                          <th className="px-2 py-1 text-left">Row</th>
                          <th className="px-2 py-1 text-left">Employee Code</th>
                          {selectedColumns.map((column) => (
                            <th key={column.key} className="whitespace-nowrap px-2 py-1 text-right">
                              {column.key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, PREVIEW_LIMIT).map((row) => (
                          <tr key={row.rowNumber} className="border-t">
                            <td className="px-2 py-1">{row.rowNumber}</td>
                            <td className="px-2 py-1">{row.employeeCode}</td>
                            {selectedColumns.map((column) => (
                              <td key={column.key} className="px-2 py-1 text-right">
                                {row.values[column.key] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.rows.length > PREVIEW_LIMIT && (
                    <p className="text-xs text-muted-foreground">
                      Showing first {PREVIEW_LIMIT} of {preview.rows.length} rows.
                    </p>
                  )}

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-xs font-medium">Payroll month</span>
                      <select
                        aria-label="Payroll month"
                        className={selectClass}
                        value={month}
                        onChange={(event) => {
                          setMonth(event.target.value);
                          setConfirmed(false);
                        }}
                      >
                        <option value="">Choose month…</option>
                        {MONTHS.map((value) => (
                          <option key={value} value={value}>
                            {getMonthName(value)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium">Payroll year</span>
                      <input
                        aria-label="Payroll year"
                        className={selectClass}
                        inputMode="numeric"
                        placeholder="e.g. 2024"
                        value={year}
                        onChange={(event) => {
                          setYear(event.target.value.replace(/\D/g, "").slice(0, 4));
                          setConfirmed(false);
                        }}
                      />
                    </label>
                  </div>

                  <label className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      aria-label="Confirm period"
                      disabled={!periodValid || preview.errors.length > 0}
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span>
                      I have reviewed the rows above. This sheet is the payroll for{" "}
                      <strong>
                        {periodValid ? `${getMonthName(monthNumber)} ${yearNumber}` : "the chosen period"}
                      </strong>
                      , and it should be archived as a read-only historical record.
                    </span>
                  </label>
                </section>
              )}

              {serverError && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {serverError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={!canImport} onClick={handleImport}>
                  {importing ? "Archiving…" : "Archive payroll history"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
