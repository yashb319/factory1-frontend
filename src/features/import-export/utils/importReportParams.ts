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

// Employee imports use a richer validation shape (status / data / messages).
export function toEmployeeReportParams(
  validationRows: Array<{
    rowNumber: number;
    status: string;
    data: Record<string, unknown>;
    messages: string[];
  }>
) {
  const headers = validationRows[0] ? Object.keys(validationRows[0].data) : [];

  const validRows = validationRows
    .filter((r) => r.status === "VALID")
    .map((r) => r.data);

  const errorRows: StoredErrorRow[] = validationRows
    .filter((r) => r.status === "ERROR")
    .map((r) => ({
      rowNumber: r.rowNumber,
      data: r.data,
      messages: r.messages,
    }));

  return { headers, validRows, errorRows };
}
