"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { saveFile } from "@/features/import-export/utils/localExportFiles";
import { toEmployeeReportParams } from "@/features/import-export/utils/importReportParams";
import { Download, FileText, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { FileValidationSummary } from "@/components/file-upload/FileValidationSummary";
import {
  ColumnMapping,
  ColumnMappingValue,
  TargetField,
} from "@/components/file-upload/ColumnMapping";
import {
  FileValidationTable,
  ValidationRow,
} from "@/components/file-upload/FileValidationTable";
import { useRouter } from "next/navigation";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { getImportTemplateCsv } from "@/features/import-export/utils/importTemplates";
import {
  useGetEmployeesQuery,
  useImportEmployeesMutation,
  usePreviewEmployeeImportMutation,
} from "../api/employeeApi";
import { EmployeeImportRowInput } from "../types/employee.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportRow = Record<string, unknown>;
type ExistingCodeResolution = "SKIP" | "UPDATE";

const EMPLOYEE_TARGET_FIELDS: TargetField[] = [
  { label: "Employee Code", value: "employeeCode", required: true },
  { label: "Name", value: "name", required: true },
  { label: "Phone", value: "phone" },
  { label: "Mobile", value: "mobile" },
  { label: "Email", value: "email" },
  { label: "Designation", value: "designation" },
  { label: "Department", value: "department" },
  { label: "Salary Rate", value: "salaryRate", required: true },
  { label: "Salary Type", value: "salaryType", required: true },
  { label: "Joining Date", value: "joiningDate" },
  { label: "Status", value: "status" },
  { label: "Location", value: "location" },
  { label: "Date of Birth", value: "dateOfBirth" },
  { label: "Gender", value: "gender" },
  { label: "Employment Basis", value: "employmentBasis" },
  { label: "Reporting To", value: "reportingTo" },
  { label: "Address", value: "address" },
  { label: "Permanent Address", value: "permanentAddress" },
  { label: "Marital Status", value: "maritalStatus" },
  { label: "Aadhaar Number", value: "aadhaarNumber" },
  { label: "Account No", value: "bankAccountNumber" },
  { label: "Bank Name", value: "bankName" },
  { label: "Branch Name", value: "bankBranchName" },
  { label: "IFSC Code", value: "bankIfscCode" },
  { label: "PAN Number", value: "panNumber" },
  { label: "UAN", value: "uan" },
  { label: "Tax Regime", value: "taxRegime" },
];

const REQUIRED_TARGET_FIELDS = EMPLOYEE_TARGET_FIELDS.filter(
  (field) => field.required
).map((field) => field.value);

const VALID_SALARY_TYPES = ["HOURLY", "DAILY", "MONTHLY"];
const VALID_STATUS = ["ACTIVE", "INACTIVE"];
const VALID_GENDERS = ["MALE", "FEMALE", "OTHER"];
const VALID_MARITAL_STATUSES = [
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
  "OTHER",
];
const VALID_EMPLOYMENT_BASIS = ["FULL_TIME", "PART_TIME", "CONTRACT"];
const VALID_TAX_REGIMES = ["OLD", "NEW"];

const COLUMN_SYNONYMS: Record<string, string[]> = {
  employeeCode: [
    "employee code",
    "emp code",
    "emp id",
    "employee id",
    "employee no",
    "employee number",
    "code",
    "id",
  ],
  name: ["name", "employee name", "emp name", "full name", "worker name", "staff name"],
  phone: ["phone"],
  mobile: ["mobile", "mobile number", "contact", "contact number"],
  email: ["email", "email id", "email address"],
  designation: ["designation", "role", "job title", "position"],
  department: ["department", "dept", "team"],
  salaryRate: ["salary", "salary rate", "wage", "rate", "amount", "pay"],
  salaryType: ["salary type", "pay type", "wage type"],
  joiningDate: ["joining date", "join date", "date of joining", "date of join", "doj"],
  status: ["status", "employee status"],
  location: ["location", "site", "plant", "branch location"],
  dateOfBirth: ["date of birth", "dob", "birth date"],
  gender: ["gender", "sex"],
  employmentBasis: ["emp type", "employment basis", "employment type", "type"],
  reportingTo: ["reporting to", "manager", "reports to", "reporting manager"],
  address: ["address", "current address"],
  permanentAddress: ["permanent address", "permanent addr"],
  maritalStatus: ["marital status", "maritalstatus"],
  aadhaarNumber: ["aadhaar number", "aadhaar", "aadhar number", "aadhar"],
  bankAccountNumber: ["account no", "account number", "bank account no", "bank account number"],
  bankName: ["bank name"],
  bankBranchName: ["branch name", "bank branch name", "bank branch"],
  bankIfscCode: ["ifsc code", "ifsc"],
  panNumber: ["pan number", "pan"],
  uan: ["uan"],
  taxRegime: ["tax regime"],
};

function normalizeColumnName(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, " ");
}

// Target fields whose value must reach the backend as YYYY-MM-DD, regardless
// of how the source spreadsheet cell was authored/parsed.
const DATE_TARGET_FIELDS = new Set(["dateOfBirth", "joiningDate"]);

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
 * Normalizes a raw import cell into a YYYY-MM-DD string. Handles:
 * - JS Date objects (e.g. from XLSX.read with cellDates: true)
 * - Excel date serial numbers (e.g. when cellDates wasn't applied, or the
 *   source data was copy-pasted as a plain number)
 * - Strings already in YYYY-MM-DD (optionally with a time suffix)
 * - Strings in DD/MM/YYYY or DD-MM-YYYY (common in Indian spreadsheets)
 * - Any other parseable date string, via a native Date fallback
 * Unparseable input is returned trimmed as-is so downstream validation can
 * flag it, rather than silently dropping the value.
 */
function normalizeDateForImport(raw: unknown): string {
  if (raw === null || raw === undefined) return "";

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return "";
    // XLSX constructs date cells via Date.UTC(...), so read UTC parts to
    // avoid the date shifting by a day in non-UTC local timezones.
    return `${raw.getUTCFullYear()}-${pad2(raw.getUTCMonth() + 1)}-${pad2(raw.getUTCDate())}`;
  }

  if (typeof raw === "number") {
    return excelSerialToIsoDate(raw) ?? "";
  }

  const text = String(raw).trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Pure numeric string: some parsers stringify a numeric/date cell.
  if (/^\d+(\.\d+)?$/.test(text)) {
    const iso = excelSerialToIsoDate(Number(text));
    if (iso) return iso;
  }

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
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

const PAYROLL_REQUIRED_FIELDS = ["salaryRate", "salaryType"];

function targetFieldLabel(value: string): string {
  return (
    EMPLOYEE_TARGET_FIELDS.find((field) => field.value === value)?.label ??
    value
  );
}

function autoMapColumns(columns: string[]): ColumnMappingValue {
  const mapping: ColumnMappingValue = {};

  columns.forEach((column) => {
    const normalizedColumn = normalizeColumnName(column);

    const matchedTarget = Object.entries(COLUMN_SYNONYMS).find(([, synonyms]) =>
      synonyms.some(
        (synonym) => normalizeColumnName(synonym) === normalizedColumn
      )
    );

    mapping[column] = matchedTarget ? matchedTarget[0] : "IGNORE";
  });

  return mapping;
}

function mapRowsToEmployeeFields(
  rows: ImportRow[],
  mapping: ColumnMappingValue
): ImportRow[] {
  return rows.map((row) => {
    const mappedRow: ImportRow = {};

    Object.entries(mapping).forEach(([sourceColumn, targetField]) => {
      if (targetField === "IGNORE") return;
      const raw = row[sourceColumn];
      mappedRow[targetField] = DATE_TARGET_FIELDS.has(targetField)
        ? normalizeDateForImport(raw)
        : raw;
    });

    return mappedRow;
  });
}

function value(value: unknown) {
  return String(value ?? "").trim();
}

function toEmployeeImportRowInput(
  row: ImportRow,
  rowNumber: number
): EmployeeImportRowInput {
  return {
    rowNumber,
    employeeCode: value(row.employeeCode),
    name: value(row.name),
    phone: value(row.phone),
    mobile: value(row.mobile),
    email: value(row.email),
    photoDataUrl: value(row.photoDataUrl),
    designation: value(row.designation),
    department: value(row.department),
    salaryRate: value(row.salaryRate),
    salaryType: value(row.salaryType),
    joiningDate: value(row.joiningDate),
    status: value(row.status),
    locationRaw: value(row.location),
    dateOfBirth: value(row.dateOfBirth),
    gender: value(row.gender),
    employmentBasis: value(row.employmentBasis),
    reportingTo: value(row.reportingTo),
    address: value(row.address),
    permanentAddress: value(row.permanentAddress),
    maritalStatus: value(row.maritalStatus),
    aadhaarNumber: value(row.aadhaarNumber),
    bankAccountNumber: value(row.bankAccountNumber),
    bankName: value(row.bankName),
    bankBranchName: value(row.bankBranchName),
    bankIfscCode: value(row.bankIfscCode),
    panNumber: value(row.panNumber),
    uan: value(row.uan),
    taxRegime: value(row.taxRegime),
  };
}

function validateRows(
  mappedRows: ImportRow[],
  reportingToResolved: boolean[] = [],
  existingEmployeeCodes: Set<string> = new Set()
): ValidationRow[] {
  const employeeCodeCount = new Map<string, number>();

  mappedRows.forEach((row) => {
    const code = value(row.employeeCode).toUpperCase();
    if (!code) return;
    employeeCodeCount.set(code, (employeeCodeCount.get(code) ?? 0) + 1);
  });

  return mappedRows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const employeeCode = value(row.employeeCode);
    const name = value(row.name);
    const salaryRate = value(row.salaryRate);
    const salaryType = value(row.salaryType);
    const status = value(row.status);
    const gender = value(row.gender);
    const maritalStatus = value(row.maritalStatus);
    const employmentBasis = value(row.employmentBasis);
    const taxRegime = value(row.taxRegime);
    const reportingTo = value(row.reportingTo);
    const mobile = value(row.mobile);
    const dateOfBirth = value(row.dateOfBirth);
    const joiningDate = value(row.joiningDate);

    if (!employeeCode) errors.push("Employee Code is required");
    if (!name) errors.push("Name is required");
    if (!salaryRate) errors.push("Salary Rate is required");
    if (!salaryType) errors.push("Salary Type is required");

    if (employeeCode && employeeCodeCount.get(employeeCode)! > 1) {
      errors.push("Duplicate Employee Code in uploaded file");
    }

    if (salaryRate && Number.isNaN(Number(salaryRate))) {
      errors.push("Salary Rate must be a number");
    } else if (salaryRate && Number(salaryRate) < 0) {
      errors.push("Salary Rate cannot be negative");
    }

    if (salaryType && !VALID_SALARY_TYPES.includes(salaryType)) {
      errors.push("Invalid Salary Type (use HOURLY, DAILY or MONTHLY)");
    }

    if (status && !VALID_STATUS.includes(status)) {
      errors.push("Invalid Status (use ACTIVE or INACTIVE)");
    }

    if (gender && !VALID_GENDERS.includes(gender)) {
      errors.push("Invalid Gender (use MALE, FEMALE or OTHER)");
    }

    if (maritalStatus && !VALID_MARITAL_STATUSES.includes(maritalStatus)) {
      errors.push(
        "Invalid Marital Status (use SINGLE, MARRIED, DIVORCED, WIDOWED or OTHER)"
      );
    }

    if (employmentBasis && !VALID_EMPLOYMENT_BASIS.includes(employmentBasis)) {
      errors.push(
        "Invalid Emp Type / Employment Basis (use FULL_TIME, PART_TIME or CONTRACT)"
      );
    }

    if (taxRegime && !VALID_TAX_REGIMES.includes(taxRegime)) {
      errors.push("Invalid Tax Regime (use OLD or NEW)");
    }

    if (
      reportingTo &&
      reportingTo.toUpperCase() === employeeCode.toUpperCase()
    ) {
      errors.push("Reporting To cannot be the employee's own code");
    }

    if (mobile && !/^\d{10}$/.test(mobile)) {
      errors.push("Mobile must contain exactly 10 digits");
    }

    if (dateOfBirth && joiningDate && dateOfBirth >= joiningDate) {
      errors.push("Date of Birth must be before Joining Date");
    }

    if (
      employeeCode &&
      existingEmployeeCodes.has(employeeCode.toUpperCase())
    ) {
      warnings.push(
        "Employee Code already exists; choose whether to update or skip this employee"
      );
    }

    if (!row.phone) warnings.push("Phone missing");
    if (!row.email) warnings.push("Email missing");
    if (!row.department) warnings.push("Department missing");
    if (!row.designation) warnings.push("Designation missing");
    if (reportingTo && !reportingToResolved[index]) {
      warnings.push(
        "Reporting To could not be matched to an existing employee code — it will be sent as entered"
      );
    }

    const statusValue: ValidationRow["status"] =
      errors.length > 0 ? "ERROR" : warnings.length > 0 ? "WARNING" : "VALID";

    return {
      rowNumber: index + 2,
      data: row,
      status: statusValue,
      messages: [...errors, ...warnings],
    };
  });
}

async function downloadErrorRows(rows: ValidationRow[]) {
  const errorRows = rows.filter((row) => row.status === "ERROR");

  if (!errorRows.length) {
    toast.info("No error rows to download");
    return;
  }

  const data = errorRows.map((row) => ({
    rowNumber: row.rowNumber,
    ...row.data,
    validationErrors: row.messages.join("; "),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  await saveFile({ fileName: "employee-import-errors.csv", content: blob });
}


async function downloadTemplate() {
  const template = getImportTemplateCsv("EMPLOYEE");
  if (!template) return;

  const blob = new Blob([template.content], {
    type: "text/csv;charset=utf-8;",
  });

  await saveFile({ fileName: template.fileName, content: blob });
  toast.success("Employee import template downloaded");
}

export function EmployeeImportDialog({ open, onOpenChange }: Props) {
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<ImportRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMappingValue>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingCodeResolution, setExistingCodeResolution] =
    useState<ExistingCodeResolution | "">("");
  const [backendPreview, setBackendPreview] = useState<{
    validRows?: number;
    invalidRows?: number;
  } | null>(null);
  const [previewEmployeeImport] = usePreviewEmployeeImportMutation();
  const [importEmployees, importState] = useImportEmployeesMutation();
  const { data: orgEmployeesPage } = useGetEmployeesQuery(
    { size: 1000 },
    { skip: !open }
  );

  const router = useRouter();
  const logDataJob = useLogDataJob();

  const managerLookup = useMemo(() => {
    const codeSet = new Set<string>();
    const nameToCode = new Map<string, string>();

    (orgEmployeesPage?.content ?? []).forEach((candidate) => {
      codeSet.add(candidate.employeeCode);
      nameToCode.set(candidate.name.trim().toLowerCase(), candidate.employeeCode);
    });

    return { codeSet, nameToCode };
  }, [orgEmployeesPage]);

  const existingEmployeeCodes = useMemo(
    () =>
      new Set(
        (orgEmployeesPage?.content ?? []).map((employee) =>
          employee.employeeCode.trim().toUpperCase()
        )
      ),
    [orgEmployeesPage]
  );

  const sourceColumns = useMemo(() => {
    if (!rawRows.length) return [];
    return Object.keys(rawRows[0]);
  }, [rawRows]);

  const mappedRows = useMemo(() => {
    return mapRowsToEmployeeFields(rawRows, mapping);
  }, [rawRows, mapping]);

  // Resolve "Reporting To" manager names to employee codes where possible,
  // since the import contract expects reportingTo to be a manager's
  // employeeCode. Rows already using a valid code are left untouched.
  const { resolvedRows, reportingToResolved } = useMemo(() => {
    const resolvedFlags: boolean[] = [];

    const rows = mappedRows.map((row) => {
      const rawReportingTo = value(row.reportingTo);
      if (!rawReportingTo) {
        resolvedFlags.push(true);
        return row;
      }

      if (managerLookup.codeSet.has(rawReportingTo)) {
        resolvedFlags.push(true);
        return row;
      }

      const matchedCode = managerLookup.nameToCode.get(
        rawReportingTo.toLowerCase()
      );

      if (matchedCode) {
        resolvedFlags.push(true);
        return { ...row, reportingTo: matchedCode };
      }

      resolvedFlags.push(false);
      return row;
    });

    return { resolvedRows: rows, reportingToResolved: resolvedFlags };
  }, [mappedRows, managerLookup]);

  const validationRows = useMemo(() => {
    return validateRows(
      resolvedRows,
      reportingToResolved,
      existingEmployeeCodes
    );
  }, [existingEmployeeCodes, resolvedRows, reportingToResolved]);

  const conflictingRowNumbers = useMemo(
    () =>
      new Set(
        validationRows
          .filter(
            (row) =>
              row.status !== "ERROR" &&
              existingEmployeeCodes.has(
                value(row.data.employeeCode).toUpperCase()
              )
          )
          .map((row) => row.rowNumber)
      ),
    [existingEmployeeCodes, validationRows]
  );

  const conflictRows = validationRows.filter((row) =>
    conflictingRowNumbers.has(row.rowNumber)
  );

  const validation = useMemo(() => {
    const mappedTargetFields = Object.values(mapping).filter(
      (field) => field !== "IGNORE"
    );

    const missingRequiredMappings = REQUIRED_TARGET_FIELDS.filter(
      (field) => !mappedTargetFields.includes(field)
    );

    const missingPayrollFields = PAYROLL_REQUIRED_FIELDS.filter((field) =>
      missingRequiredMappings.includes(field)
    );

    return {
      valid: validationRows.filter((row) => row.status === "VALID").length,
      warning: validationRows.filter((row) => row.status === "WARNING").length,
      invalid: validationRows.filter((row) => row.status === "ERROR").length,
      missingRequiredMappings,
      missingPayrollFields,
    };
  }, [validationRows, mapping]);

  async function handleStartImport() {
    if (!selectedFile) return;

    try {
      const rows: EmployeeImportRowInput[] = importableRows.map((row) =>
        toEmployeeImportRowInput(row.data, row.rowNumber)
      );
      const result = await importEmployees({
        rows,
        existingCodeResolution: existingCodeResolution || "SKIP",
      }).unwrap();
      toast.success(
        `Import complete: ${result.createdRows} created, ${result.updatedRows} updated${result.skippedRows ? `, ${result.skippedRows} skipped` : ""}.`
      );
    } catch {
      toast.error("Employee import failed. Review the file and try again.");
      return;
    }

    const report = toEmployeeReportParams(validationRows);

    void logDataJob({
      operation: "IMPORT",
      module: "EMPLOYEE",
      fileName: fileName || `employees-${new Date().toISOString().slice(0, 10)}.csv`,
      status: validation.invalid > 0 ? "PARTIAL_SUCCESS" : "COMPLETED",
      progress: 100,
      totalRows: validationRows.length,
      successRows: importableRows.length,
      failedRows: validation.invalid,
      parameters: {
        reportType: "IMPORT_TEMPLATE",
        module: "EMPLOYEE",
        headers: report.headers,
        validRows: report.validRows,
        errorRows: report.errorRows,
      },
      notes: "Employee import completed after client and server-side preview validation.",
    });
    toast.success("Import job started. Track progress in Import / Export History.");

    handleOpenChange(false);

    router.push("/import-export");
  }

  async function handleFileSelect(file: File) {
    try {
      setFileName(file.name);
      setSelectedFile(file);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const parsedRows = XLSX.utils.sheet_to_json<ImportRow>(worksheet, {
        defval: "",
      });

      if (!parsedRows.length) {
        toast.error("No rows found in file");
        return;
      }

      const columns = Object.keys(parsedRows[0]);

      const initialMapping = autoMapColumns(columns);
      setRawRows(parsedRows);
      setMapping(initialMapping);

      const mappedRows = mapRowsToEmployeeFields(parsedRows, initialMapping);
      const rows: EmployeeImportRowInput[] = mappedRows.map((row, index) =>
        toEmployeeImportRowInput(row, index + 2)
      );

      const preview = await previewEmployeeImport(rows).unwrap();
      setBackendPreview({
        validRows: preview.validRows,
        invalidRows: preview.invalidRows,
      });

      toast.success("File parsed successfully");
    } catch {
      toast.error("Failed to parse file");
      setRawRows([]);
      setFileName("");
      setMapping({});
      setSelectedFile(null);
      setBackendPreview(null);
      setExistingCodeResolution("");
    }
  }

  function resetImport() {
    setRawRows([]);
    setFileName("");
    setMapping({});
    setSelectedFile(null);
    setBackendPreview(null);
    setExistingCodeResolution("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetImport();
    onOpenChange(nextOpen);
  }

  const importableRows = validationRows.filter(
    (row) =>
      (row.status === "VALID" || row.status === "WARNING") &&
      (!conflictingRowNumbers.has(row.rowNumber) ||
        existingCodeResolution === "UPDATE")
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Import Employees</DialogTitle>
        </DialogHeader>

        <div className="h-[calc(90vh-73px)] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {!rawRows.length && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                <FileDropzone onFileSelect={handleFileSelect} />
              </div>
            )}

            {rawRows.length > 0 && (
              <>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-medium">Reporting To mapping</p>
                  <p className="mt-1">
                    Enter the manager&apos;s <strong>Employee Code</strong> or
                    their exact <strong>name</strong> as it appears in
                    Factory1 — matching names are resolved to employee codes
                    automatically. Unmatched values are still submitted as
                    entered, and the server will report a clear error if no
                    matching employee is found.
                  </p>
                </div>

                <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {rawRows.length} rows detected
                        {backendPreview?.invalidRows !== undefined
                          ? ` · ${backendPreview.invalidRows} server validation errors`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <Button variant="outline" onClick={resetImport}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Choose another file
                  </Button>
                </div>

                <ColumnMapping
                  sourceColumns={sourceColumns}
                  targetFields={EMPLOYEE_TARGET_FIELDS}
                  value={mapping}
                  onChange={(nextMapping) => {
                    setMapping(nextMapping);
                    setExistingCodeResolution("");
                  }}
                />

                <FileValidationSummary
                  valid={validation.valid}
                  warning={validation.warning}
                  invalid={validation.invalid}
                />

                {conflictRows.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <div>
                      <p className="font-medium">
                        {conflictRows.length} existing employee code
                        {conflictRows.length === 1 ? "" : "s"} found
                      </p>
                      <p className="mt-1 text-sm">
                        Factory1 can update matching employees with the imported
                        values, or skip those rows. Choose explicitly before
                        importing; existing employees are never overwritten
                        automatically.
                      </p>
                    </div>
                    <Select
                      value={existingCodeResolution}
                      onValueChange={(nextValue) =>
                        setExistingCodeResolution(
                          nextValue as ExistingCodeResolution
                        )
                      }
                    >
                      <SelectTrigger className="w-full bg-background sm:max-w-sm">
                        <SelectValue placeholder="Choose conflict resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SKIP">
                          Skip existing employees
                        </SelectItem>
                        <SelectItem value="UPDATE">
                          Update existing employees from this file
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="max-h-36 overflow-y-auto rounded-md border border-amber-200 bg-background">
                      {conflictRows.slice(0, 20).map((row) => (
                        <div
                          key={row.rowNumber}
                          className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                        >
                          <span>
                            Row {row.rowNumber}:{" "}
                            <strong>{value(row.data.employeeCode)}</strong>
                            {value(row.data.name)
                              ? ` — ${value(row.data.name)}`
                              : ""}
                          </span>
                          <span className="font-medium">
                            {existingCodeResolution === "UPDATE"
                              ? "Will update"
                              : existingCodeResolution === "SKIP"
                                ? "Will skip"
                                : "Decision required"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validation.missingRequiredMappings.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-medium text-destructive">
                      Missing required mappings
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Please map these fields:{" "}
                      <span className="font-medium">
                        {validation.missingRequiredMappings
                          .map(targetFieldLabel)
                          .join(", ")}
                      </span>
                    </p>

                    {validation.missingPayrollFields.length > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-destructive">
                          Payroll classification is required:
                        </span>{" "}
                        your spreadsheet has no column for{" "}
                        {validation.missingPayrollFields
                          .map(targetFieldLabel)
                          .join(", ")}
                        . Add these as columns (or map existing ones) in your
                        source file — Factory1 will not guess or default
                        these values, so rows will fail to import until they
                        are provided. Salary Type accepts{" "}
                        {VALID_SALARY_TYPES.join(", ")}.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Validation Preview
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Showing first 50 rows with row-level validation.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      disabled={validation.invalid === 0}
                      onClick={() => downloadErrorRows(validationRows)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Error Rows
                    </Button>
                  </div>

                  <FileValidationTable rows={validationRows} />
                </div>

                <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background pt-5">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    disabled={
                      importableRows.length === 0 ||
                      validation.missingRequiredMappings.length > 0 ||
                      (conflictRows.length > 0 && !existingCodeResolution)
                    }
                    onClick={handleStartImport}
                  >
                    {importState.isLoading ? "Importing…" : "Confirm Import"}{" "}
                    {importableRows.length > 0 ? `(${importableRows.length})` : ""}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
