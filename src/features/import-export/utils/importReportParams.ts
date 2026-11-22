const META_KEYS = ["rowNumber", "error"];

function stripMeta(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (!META_KEYS.includes(key)) out[key] = row[key];
  }
  return out;
}

export type StoredErrorRow = {
  rowNumber: number;
  data: Record<string, unknown>;
  messages: string[];
};

// Convert parsed import rows (client-side validation shape) into the minimal
// data needed to later regenerate an error report or the imported data CSV.
export function toImportReportParams(rows: Array<Record<string, unknown>>) {
  const sample = rows[0] ?? {};
  const headers = Object.keys(sample).filter((k) => !META_KEYS.includes(k));

  const validRows = rows.filter((r) => !r.error).map(stripMeta);

  const errorRows: StoredErrorRow[] = rows
    .filter((r) => r.error)
    .map((r) => ({
      rowNumber: Number(r.rowNumber),
      data: stripMeta(r),
      messages: [String(r.error ?? "Invalid row")],
    }));

  return { headers, validRows, errorRows };
}

// Employee imports store metadata only: employee rows (names, identifiers,
// salaries) must never be copied into import/export history.
export function toEmployeeImportHistoryParams(input: {
  sheetName: string;
  headerRowNumber: number;
  totalRows: number;
  importedRows: number;
  errorRowNumbers: number[];
  skippedRowNumbers: number[];
}) {
  return {
    reportType: "IMPORT_TEMPLATE",
    module: "EMPLOYEE",
    sheetName: input.sheetName,
    headerRowNumber: input.headerRowNumber,
    totalRows: input.totalRows,
    importedRows: input.importedRows,
    errorRowNumbers: input.errorRowNumbers,
    skippedRowNumbers: input.skippedRowNumbers,
  };
}
