import * as XLSX from "xlsx";

import type { EmployeeImportRowInput } from "../types/employee.types";

export type ImportRow = Record<string, unknown>;
export type ColumnMappingRecord = Record<string, string>;

export interface SheetMatrix {
  rows: unknown[][];
  /** 1-based spreadsheet row number of rows[0]. */
  firstRowNumber: number;
}

export interface SourceRow {
  /** 1-based spreadsheet row number, as shown in Excel. */
  rowNumber: number;
  values: ImportRow;
}

export interface ExtractedSheet {
  columns: string[];
  rows: SourceRow[];
  blankRowNumbers: number[];
}

export const SALARY_NOT_IN_FILE = "__NOT_IN_FILE__";
export const SALARY_TYPE_COLUMN_PREFIX = "COLUMN:";
export const SALARY_TYPE_FIXED_PREFIX = "FIXED:";
export const VALID_SALARY_TYPES = ["HOURLY", "DAILY", "MONTHLY"];

export interface SalarySelection {
  /** "" = not chosen yet, SALARY_NOT_IN_FILE, or a source column name. */
  rateColumn: string;
  /** "" = not chosen, SALARY_NOT_IN_FILE, `COLUMN:<name>` or `FIXED:<TYPE>`. */
  typeSource: string;
}

// Salary fields are deliberately absent: amounts and pay type must always be
// chosen explicitly by the user, never inferred from a header name.
export const COLUMN_SYNONYMS: Record<string, string[]> = {
  employeeCode: [
    "employee code",
    "emp code",
    "empcode",
    "emp id",
    "employee id",
    "employee no",
    "emp no",
    "employee number",
    "e code",
    "code",
    "id",
  ],
  name: [
    "name",
    "employee name",
    "emp name",
    "name of employee",
    "name of the employee",
    "full name",
    "worker name",
    "staff name",
  ],
  phone: ["phone", "phone no", "phone number", "telephone"],
  mobile: ["mobile", "mobile no", "mobile number", "contact", "contact no", "contact number"],
  email: ["email", "email id", "email address", "e mail"],
  designation: ["designation", "role", "job title", "position"],
  department: ["department", "dept", "team"],
  joiningDate: ["joining date", "join date", "date of joining", "date of join", "doj"],
  status: ["status", "employee status"],
  location: ["location", "site", "plant", "branch location"],
  dateOfBirth: ["date of birth", "dob", "birth date"],
  gender: ["gender", "sex"],
  employmentBasis: ["emp type", "employment basis", "employment type", "type"],
  reportingTo: ["reporting to", "manager", "reports to", "reporting manager"],
  address: ["address", "current address", "present address"],
  permanentAddress: ["permanent address", "permanent addr"],
  maritalStatus: ["marital status", "maritalstatus"],
  aadhaarNumber: [
    "aadhaar number",
    "aadhaar",
    "aadhaar no",
    "aadhar number",
    "aadhar",
    "aadhar no",
  ],
  bankAccountNumber: [
    "account no",
    "account number",
    "bank account no",
    "bank account number",
    "bank account",
    "a/c no",
    "bank a/c no",
    "a/c number",
  ],
  bankName: ["bank name", "bank"],
  bankBranchName: ["branch name", "bank branch name", "bank branch"],
  bankIfscCode: ["ifsc code", "ifsc", "ifsc no"],
  panNumber: ["pan number", "pan", "pan no"],
  uan: ["uan", "uan no", "uan number"],
  pfAccountNumber: [
    "pf no",
    "pf number",
    "pf account no",
    "pf account number",
    "pf a/c no",
    "epf no",
    "epf number",
  ],
  taxRegime: ["tax regime"],
  fatherName: ["father's name", "father name", "father/husband name", "f/h name"],
  fatherDateOfBirth: ["father's dob", "father dob", "father date of birth"],
  fatherGender: ["father's gender", "father gender"],
  motherName: ["mother's name", "mother name"],
  motherDateOfBirth: ["mother's dob", "mother dob", "mother date of birth"],
  motherGender: ["mother's gender", "mother gender"],
  spouseName: ["spouse name"],
  spouseDateOfBirth: ["spouse dob", "spouse date of birth"],
  spouseGender: ["spouse gender"],
  child1Name: ["child 1 name", "child1 name"],
  child1DateOfBirth: ["child 1 dob", "child1 dob"],
  child1Gender: ["child 1 gender", "child1 gender"],
  child2Name: ["child 2 name", "child2 name"],
  child2DateOfBirth: ["child 2 dob", "child2 dob"],
  child2Gender: ["child 2 gender", "child2 gender"],
  heightCm: ["height", "height cm", "height (cm)"],
  weightKg: ["weight", "weight kg", "weight (kg)"],
  smoker: ["smoker", "smoker / non-smoker", "smoking status"],
  occupation: ["occupation"],
  organizationName: ["organisation name", "organization name"],
  annualIncome: ["annual income"],
  education: ["education", "qualification"],
  nomineeName: ["nominee name"],
  nomineeDateOfBirth: ["nominee dob", "nominee date of birth"],
  nomineeGender: ["nominee gender"],
  nomineeRelationship: ["relationship with employee", "nominee relationship"],
};

// Used only to score candidate header rows, never for mapping.
const HEADER_HINTS = [
  "salary",
  "salary rate",
  "salary type",
  "wage",
  "wages",
  "rate",
  "basic",
  "gross",
  "net pay",
  "sr no",
  "s no",
  "sl no",
];

export const DATE_TARGET_FIELDS = new Set([
  "dateOfBirth",
  "joiningDate",
  "fatherDateOfBirth",
  "motherDateOfBirth",
  "spouseDateOfBirth",
  "child1DateOfBirth",
  "child2DateOfBirth",
  "nomineeDateOfBirth",
]);

/** Identifiers that are masked whenever they are displayed or exported. */
export const SENSITIVE_IDENTIFIER_FIELDS = new Set([
  "aadhaarNumber",
  "bankAccountNumber",
  "panNumber",
  "uan",
  "pfAccountNumber",
]);

/** Fields that must keep their exact digits / leading zeros as text. */
export const IDENTIFIER_FIELDS = new Set([
  ...SENSITIVE_IDENTIFIER_FIELDS,
  "employeeCode",
  "reportingTo",
  "mobile",
  "phone",
  "bankIfscCode",
]);

export function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[\s/_\-:#()\\]+/g, " ")
    .trim();
}

const SYNONYM_LOOKUP = (() => {
  const lookup = new Map<string, string>();
  Object.entries(COLUMN_SYNONYMS).forEach(([target, synonyms]) => {
    synonyms.forEach((synonym) => {
      const key = normalizeHeader(synonym);
      if (!lookup.has(key)) lookup.set(key, target);
    });
  });
  return lookup;
})();

const HEADER_HINT_SET = new Set(HEADER_HINTS.map(normalizeHeader));

export function cellText(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (raw instanceof Date) return raw.toISOString();
  return String(raw).trim();
}

export function readWorkbook(buffer: ArrayBuffer) {
  return XLSX.read(buffer, { type: "array", cellDates: true });
}

export function readSheetMatrix(
  workbook: XLSX.WorkBook,
  sheetName: string
): SheetMatrix {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet || !worksheet["!ref"]) return { rows: [], firstRowNumber: 1 };

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: true,
    raw: true,
  });

  return { rows, firstRowNumber: range.s.r + 1 };
}

function scoreHeaderRow(cells: unknown[]) {
  const seenTargets = new Set<string>();
  let score = 0;
  cells.forEach((cell) => {
    const key = normalizeHeader(cellText(cell));
    if (!key) return;
    const target = SYNONYM_LOOKUP.get(key);
    if (target && !seenTargets.has(target)) {
      seenTargets.add(target);
      score += 1;
    } else if (HEADER_HINT_SET.has(key)) {
      score += 1;
    }
  });
  return score;
}

const HEADER_SCAN_LIMIT = 30;

/** Returns the most likely 1-based header row number, or null when empty. */
export function detectHeaderRowNumber(matrix: SheetMatrix): number | null {
  let bestRow: number | null = null;
  let bestScore = 1;
  let firstNonEmpty: number | null = null;

  matrix.rows.slice(0, HEADER_SCAN_LIMIT).forEach((cells, index) => {
    const rowNumber = matrix.firstRowNumber + index;
    if (!cells.some((cell) => cellText(cell))) return;
    if (firstNonEmpty === null) firstNonEmpty = rowNumber;
    const score = scoreHeaderRow(cells);
    if (score > bestScore) {
      bestScore = score;
      bestRow = rowNumber;
    }
  });

  return bestRow ?? firstNonEmpty;
}

/** Picks the sheet whose detected header looks most like employee data. */
export function suggestSheetName(workbook: XLSX.WorkBook): string {
  let bestName = workbook.SheetNames[0] ?? "";
  let bestScore = -1;

  workbook.SheetNames.forEach((sheetName) => {
    const matrix = readSheetMatrix(workbook, sheetName);
    const headerRowNumber = detectHeaderRowNumber(matrix);
    if (headerRowNumber === null) return;
    const cells = matrix.rows[headerRowNumber - matrix.firstRowNumber] ?? [];
    const score = scoreHeaderRow(cells) + (/employee/i.test(sheetName) ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestName = sheetName;
    }
  });

  return bestName;
}

export function headerRowCandidates(matrix: SheetMatrix) {
  return matrix.rows
    .slice(0, HEADER_SCAN_LIMIT)
    .map((cells, index) => ({
      rowNumber: matrix.firstRowNumber + index,
      filledCells: cells.filter((cell) => cellText(cell)).length,
    }))
    .filter((candidate) => candidate.filledCells > 0);
}

export function extractSheetRows(
  matrix: SheetMatrix,
  headerRowNumber: number
): ExtractedSheet {
  const headerIndex = headerRowNumber - matrix.firstRowNumber;
  const headerCells = matrix.rows[headerIndex] ?? [];
  const dataRows = matrix.rows.slice(headerIndex + 1);
  const width = Math.max(
    headerCells.length,
    ...dataRows.map((cells) => cells.length),
    0
  );

  const used = new Map<string, number>();
  const columnIndexes: number[] = [];
  const columns: string[] = [];

  for (let index = 0; index < width; index += 1) {
    const header = cellText(headerCells[index]).replace(/\s+/g, " ");
    const hasData = dataRows.some((cells) => cellText(cells[index]));
    if (!header && !hasData) continue;

    const letter = XLSX.utils.encode_col(index);
    let name = header || `Column ${letter}`;
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count > 0) name = `${name} (${letter})`;

    columns.push(name);
    columnIndexes.push(index);
  }

  const rows: SourceRow[] = [];
  const blankRowNumbers: number[] = [];

  dataRows.forEach((cells, offset) => {
    const rowNumber = headerRowNumber + 1 + offset;
    if (!cells.some((cell) => cellText(cell))) {
      blankRowNumbers.push(rowNumber);
      return;
    }
    const values: ImportRow = {};
    columns.forEach((column, position) => {
      values[column] = cells[columnIndexes[position]] ?? "";
    });
    rows.push({ rowNumber, values });
  });

  return { columns, rows, blankRowNumbers };
}

/** Auto-maps columns by header synonym; each target is used at most once. */
export function autoMapColumns(columns: string[]): ColumnMappingRecord {
  const mapping: ColumnMappingRecord = {};
  const usedTargets = new Set<string>();

  columns.forEach((column) => {
    const target = SYNONYM_LOOKUP.get(normalizeHeader(column));
    if (target && !usedTargets.has(target)) {
      usedTargets.add(target);
      mapping[column] = target;
    } else {
      mapping[column] = "IGNORE";
    }
  });

  return mapping;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
}

/**
 * Normalizes a raw import cell into YYYY-MM-DD. Handles Date objects, Excel
 * serials, ISO strings and DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY. Unparseable
 * input is returned trimmed so validation can flag it.
 */
export function normalizeDateForImport(raw: unknown): string {
  if (raw === null || raw === undefined) return "";

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return "";
    // XLSX may produce dates a few seconds before midnight UTC; round to the
    // nearest minute before reading UTC parts so the day does not shift.
    const rounded = new Date(Math.round(raw.getTime() / 60000) * 60000);
    return `${rounded.getUTCFullYear()}-${pad2(rounded.getUTCMonth() + 1)}-${pad2(rounded.getUTCDate())}`;
  }

  if (typeof raw === "number") return excelSerialToIsoDate(raw) ?? "";

  const text = String(raw).trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const iso = excelSerialToIsoDate(Number(text));
    if (iso) return iso;
  }

  const slashMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) {
    return `${parsedDate.getFullYear()}-${pad2(parsedDate.getMonth() + 1)}-${pad2(parsedDate.getDate())}`;
  }

  return text;
}

/** Keeps identifiers as exact text (no exponent notation, no trailing ".0"). */
export function identifierText(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Number.isInteger(raw)
      ? raw.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 0 })
      : String(raw);
  }
  return cellText(raw);
}

/** Numeric cells above 2^53 have already lost digits inside the spreadsheet. */
export function isUnsafeNumericIdentifier(raw: unknown) {
  return typeof raw === "number" && Math.abs(raw) > Number.MAX_SAFE_INTEGER;
}

export function maskIdentifier(raw: unknown): string {
  const text = cellText(raw);
  if (!text) return "";
  if (text.length <= 4) return "•".repeat(text.length);
  return `${"•".repeat(Math.min(text.length - 4, 8))}${text.slice(-4)}`;
}

export function maskSensitiveFields(row: ImportRow): ImportRow {
  const masked: ImportRow = { ...row };
  Object.keys(masked).forEach((key) => {
    if (SENSITIVE_IDENTIFIER_FIELDS.has(key)) masked[key] = maskIdentifier(masked[key]);
  });
  return masked;
}

/** Strips currency symbols and thousands separators; never invents a value. */
export function normalizeSalaryRate(raw: unknown): string {
  if (typeof raw === "number") return Number.isFinite(raw) ? String(raw) : "";
  return cellText(raw)
    .replace(/^(rs\.?|inr|₹)\s*/i, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
}

export function normalizeSalaryType(raw: unknown): string {
  return cellText(raw).toUpperCase();
}

export function salarySelectionComplete(selection: SalarySelection) {
  return Boolean(selection.rateColumn) && Boolean(selection.typeSource);
}

export function mapSourceRow(
  values: ImportRow,
  mapping: ColumnMappingRecord,
  salary: SalarySelection
): ImportRow {
  const mapped: ImportRow = {};

  Object.entries(mapping).forEach(([column, target]) => {
    if (target === "IGNORE" || target === "salaryRate" || target === "salaryType") {
      return;
    }
    const raw = values[column];
    if (DATE_TARGET_FIELDS.has(target)) {
      mapped[target] = normalizeDateForImport(raw);
    } else if (IDENTIFIER_FIELDS.has(target)) {
      mapped[target] = identifierText(raw);
    } else {
      mapped[target] = raw;
    }
  });

  if (salary.rateColumn && salary.rateColumn !== SALARY_NOT_IN_FILE) {
    mapped.salaryRate = normalizeSalaryRate(values[salary.rateColumn]);
  }

  if (salary.typeSource.startsWith(SALARY_TYPE_COLUMN_PREFIX)) {
    const column = salary.typeSource.slice(SALARY_TYPE_COLUMN_PREFIX.length);
    mapped.salaryType = normalizeSalaryType(values[column]);
  } else if (salary.typeSource.startsWith(SALARY_TYPE_FIXED_PREFIX)) {
    mapped.salaryType = salary.typeSource.slice(SALARY_TYPE_FIXED_PREFIX.length);
  }

  return mapped;
}

/** Mapped identifier columns whose numeric cells exceed 2^53 in this row. */
export function unsafeIdentifierFields(
  values: ImportRow,
  mapping: ColumnMappingRecord
): string[] {
  return Object.entries(mapping)
    .filter(
      ([column, target]) =>
        IDENTIFIER_FIELDS.has(target) && isUnsafeNumericIdentifier(values[column])
    )
    .map(([, target]) => target);
}

const SUMMARY_LABEL =
  /^((grand|sub|net)\s*)?totals?\b|^summary\b|^total\s+(employees?|amount|salary|wages?)\b/i;

/**
 * Classifies a non-blank data row that should not be imported: total/summary
 * lines and rows without any Employee Code or Name. Returns null for rows that
 * look like employees.
 */
export function classifyNonEmployeeRow(
  values: ImportRow,
  mapped: ImportRow
): string | null {
  const code = cellText(mapped.employeeCode);
  const name = cellText(mapped.name);

  const textCells = Object.values(values)
    .filter((cell) => typeof cell === "string")
    .map((cell) => cellText(cell));

  if (
    SUMMARY_LABEL.test(code) ||
    SUMMARY_LABEL.test(name) ||
    textCells.some((cell) => SUMMARY_LABEL.test(cell))
  ) {
    return "Total / summary row — not imported";
  }

  if (!code && !name) {
    return "No Employee Code or Name — treated as a non-employee row and not imported";
  }

  return null;
}

const ROW_INPUT_FIELDS = [
  "employeeCode",
  "name",
  "phone",
  "mobile",
  "email",
  "photoDataUrl",
  "designation",
  "department",
  "salaryRate",
  "salaryType",
  "joiningDate",
  "status",
  "dateOfBirth",
  "gender",
  "employmentBasis",
  "reportingTo",
  "address",
  "permanentAddress",
  "maritalStatus",
  "aadhaarNumber",
  "bankAccountNumber",
  "bankName",
  "bankBranchName",
  "bankIfscCode",
  "panNumber",
  "uan",
  "pfAccountNumber",
  "taxRegime",
  "fatherName",
  "fatherDateOfBirth",
  "fatherGender",
  "motherName",
  "motherDateOfBirth",
  "motherGender",
  "spouseName",
  "spouseDateOfBirth",
  "spouseGender",
  "child1Name",
  "child1DateOfBirth",
  "child1Gender",
  "child2Name",
  "child2DateOfBirth",
  "child2Gender",
  "heightCm",
  "weightKg",
  "smoker",
  "occupation",
  "organizationName",
  "annualIncome",
  "education",
  "nomineeName",
  "nomineeDateOfBirth",
  "nomineeGender",
  "nomineeRelationship",
] as const;

function smokerValue(raw: unknown) {
  const normalized = cellText(raw).toLowerCase();
  if (["smoker", "yes", "y", "true", "1"].includes(normalized)) return "true";
  if (["non-smoker", "non smoker", "no", "n", "false", "0"].includes(normalized)) {
    return "false";
  }
  return normalized;
}

/**
 * Builds the backend row payload. Blank cells and unmapped fields are omitted
 * so an UPDATE from a partial workbook never overwrites existing values.
 */
export function toEmployeeImportRowInput(
  row: ImportRow,
  rowNumber: number
): EmployeeImportRowInput {
  const input: Record<string, unknown> = { rowNumber };

  ROW_INPUT_FIELDS.forEach((field) => {
    const text = field === "smoker" ? smokerValue(row.smoker) : cellText(row[field]);
    if (text) input[field] = text;
  });

  const location = cellText(row.location);
  if (location) input.locationRaw = location;

  return input as unknown as EmployeeImportRowInput;
}
