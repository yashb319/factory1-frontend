import * as XLSX from "xlsx";

import {
  autoMapColumns,
  cellText,
  classifyNonEmployeeRow,
  type ExtractedSheet,
  identifierText,
  isUnsafeNumericIdentifier,
  normalizeHeader,
} from "@/features/employees/utils/employeeImportWorkbook";
import type { PayrollHistoryImportRequest } from "../types/payrollHistory.types";

export interface HistoryColumn {
  /** Column name as extracted from the sheet (used to read row values). */
  sourceName: string;
  /** Original header text (blank when the header cell was empty). */
  label: string;
  /** 1-based source column number. */
  columnNumber: number;
  /** Excel column letter, e.g. "C". */
  letter: string;
  /** Unique archive key: column number + label, never guessed or renamed. */
  key: string;
  /** Set when the column carries employee identity / personal data. */
  identityReason: string | null;
}

export interface HistoryRowIssue {
  rowNumber: number;
  message: string;
}

export interface HistoryPreviewRow {
  rowNumber: number;
  employeeCode: string;
  values: Record<string, number>;
  blankColumns: string[];
}

export interface HistoryPreview {
  rows: HistoryPreviewRow[];
  errors: HistoryRowIssue[];
  skipped: HistoryRowIssue[];
}

// Matches identity / personal-data headers that must never be archived as values.
const IDENTITY_HEADER =
  /\b(name|aadhaa?r|account|a c no|acct|ifsc|bank|pan|uan|mobile|phone|email|address|birth|dob|father|mother|spouse|nominee|designation|department|gender|joining|doj|esic? no|esic? number|ip no|pf no|pf number|pf ac|pf account)\b/;

export function historyColumnKey(columnNumber: number, label: string) {
  const text = label.trim() || "(no header)";
  return `${columnNumber}: ${text}`;
}

export function buildHistoryColumns(
  extracted: Pick<ExtractedSheet, "columns" | "columnIndexes">,
  headerCells: unknown[]
): HistoryColumn[] {
  const mapped = autoMapColumns(extracted.columns);

  return extracted.columns.map((sourceName, position) => {
    const index = extracted.columnIndexes[position];
    const label = cellText(headerCells[index]).replace(/\s+/g, " ");
    const normalized = normalizeHeader(label);
    const target = mapped[sourceName];
    let identityReason: string | null = null;
    if (target && target !== "IGNORE" && target !== "employeeCode") {
      identityReason = "Employee profile column";
    } else if (normalized && IDENTITY_HEADER.test(normalized)) {
      identityReason = "Identity / personal data column";
    }
    return {
      sourceName,
      label,
      columnNumber: index + 1,
      letter: XLSX.utils.encode_col(index),
      key: historyColumnKey(index + 1, label),
      identityReason,
    };
  });
}

export function suggestEmployeeCodeColumn(columns: HistoryColumn[]) {
  const mapped = autoMapColumns(columns.map((column) => column.sourceName));
  return columns.find((column) => mapped[column.sourceName] === "employeeCode")
    ?.sourceName;
}

/**
 * Parses a payroll figure exactly as written. Returns null for blank cells
 * (never treated as zero) and NaN for anything that is not a plain number.
 */
export function parseHistoryNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : Number.NaN;
  if (raw instanceof Date || typeof raw === "boolean") return Number.NaN;
  const text = String(raw)
    .trim()
    .replace(/^(rs\.?|inr|₹)\s*/i, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  if (!text || text === "-") return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(text)) return Number.NaN;
  return Number(text);
}

export function buildHistoryPreview(
  extracted: Pick<ExtractedSheet, "rows">,
  columns: HistoryColumn[],
  employeeCodeColumn: string,
  valueColumnNames: string[]
): HistoryPreview {
  const byName = new Map(columns.map((column) => [column.sourceName, column]));
  const valueColumns = valueColumnNames
    .map((name) => byName.get(name))
    .filter((column): column is HistoryColumn => Boolean(column));

  const rows: HistoryPreviewRow[] = [];
  const errors: HistoryRowIssue[] = [];
  const skipped: HistoryRowIssue[] = [];
  const seenCodes = new Map<string, number>();

  extracted.rows.forEach(({ rowNumber, values }) => {
    const rawCode = values[employeeCodeColumn];
    const employeeCode = identifierText(rawCode);

    const skipReason = classifyNonEmployeeRow(values, {
      employeeCode,
      name: "",
    });
    if (skipReason) {
      const hasFigures = valueColumns.some(
        (column) => parseHistoryNumber(values[column.sourceName]) !== null
      );
      if (!employeeCode && hasFigures && !/total|summary/i.test(skipReason)) {
        errors.push({
          rowNumber,
          message: "Row has payroll figures but no Employee Code",
        });
      } else {
        skipped.push({ rowNumber, message: skipReason });
      }
      return;
    }

    if (isUnsafeNumericIdentifier(rawCode)) {
      errors.push({
        rowNumber,
        message: "Employee Code is too long to read exactly; format the column as Text",
      });
      return;
    }

    const rowErrors: string[] = [];
    const duplicateOf = seenCodes.get(employeeCode);
    if (duplicateOf !== undefined) {
      rowErrors.push(`Duplicate Employee Code (also on row ${duplicateOf})`);
    } else {
      seenCodes.set(employeeCode, rowNumber);
    }

    const rowValues: Record<string, number> = {};
    const blankColumns: string[] = [];
    valueColumns.forEach((column) => {
      const parsed = parseHistoryNumber(values[column.sourceName]);
      if (parsed === null) {
        blankColumns.push(column.key);
      } else if (Number.isNaN(parsed)) {
        rowErrors.push(`Column ${column.letter} (${column.label || "no header"}) is not a number`);
      } else {
        rowValues[column.key] = parsed;
      }
    });

    if (rowErrors.length) {
      rowErrors.forEach((message) => errors.push({ rowNumber, message }));
      return;
    }

    rows.push({ rowNumber, employeeCode, values: rowValues, blankColumns });
  });

  return { rows, errors, skipped };
}

export function toPayrollHistoryRequest(
  year: number,
  month: number,
  preview: HistoryPreview
): PayrollHistoryImportRequest {
  return {
    year,
    month,
    rows: preview.rows.map(({ rowNumber, employeeCode, values }) => ({
      rowNumber,
      employeeCode,
      values,
    })),
  };
}
