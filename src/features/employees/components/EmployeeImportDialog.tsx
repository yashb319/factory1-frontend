"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { saveFile } from "@/features/import-export/utils/localExportFiles";
import { toEmployeeImportHistoryParams } from "@/features/import-export/utils/importReportParams";
import { Download, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";

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
  filterValidationRows,
  ValidationRow,
  ValidationRowFilter,
} from "@/components/file-upload/FileValidationTable";
import { useRouter } from "next/navigation";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { getImportTemplateCsv } from "@/features/import-export/utils/importTemplates";
import {
  useGetEmployeesQuery,
  useImportEmployeesMutation,
  usePreviewEmployeeImportMutation,
} from "../api/employeeApi";
import {
  Gender,
  EmployeeImportPreviewResponse,
  EmployeeImportRowInput,
  SalaryComponentType,
} from "../types/employee.types";
import {
  autoMapColumns,
  classifyNonEmployeeRow,
  detectHeaderRowNumber,
  extractSheetRows,
  getGenderSourceValues,
  getUnmappedGenderSourceValues,
  headerRowCandidates,
  isValidMobileNumber,
  ImportRow,
  mapSalaryFieldsForImport,
  mapSourceRow,
  maskSensitiveFields,
  normalizeMappedGenderValues,
  readSheetMatrix,
  readWorkbook,
  SALARY_NOT_IN_FILE,
  SALARY_TYPE_COLUMN_PREFIX,
  SALARY_TYPE_FIXED_PREFIX,
  SalarySelection,
  SalaryComponentColumnMapping,
  SalaryImportMode,
  SourceRow,
  suggestSheetName,
  toEmployeeImportRowInput,
  unsafeIdentifierFields,
  VALID_SALARY_TYPES,
} from "../utils/employeeImportWorkbook";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExistingCodeResolution = "SKIP" | "UPDATE";

interface SkippedRow {
  rowNumber: number;
  reason: string;
}

// Salary Rate / Salary Type are chosen in the dedicated salary panel so they
// can never be implicitly auto-mapped from a header name.
const EMPLOYEE_TARGET_FIELDS: TargetField[] = [
  { label: "Employee Code", value: "employeeCode", required: true },
  { label: "Name", value: "name", required: true },
  { label: "Phone", value: "phone" },
  { label: "Mobile", value: "mobile" },
  { label: "Email", value: "email" },
  { label: "Designation", value: "designation" },
  { label: "Department", value: "department" },
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
  { label: "PF Account No", value: "pfAccountNumber" },
  { label: "Tax Regime", value: "taxRegime" },
  { label: "Father's Name", value: "fatherName" },
  { label: "Father's DOB", value: "fatherDateOfBirth" },
  { label: "Father's Gender", value: "fatherGender" },
  { label: "Mother's Name", value: "motherName" },
  { label: "Mother's DOB", value: "motherDateOfBirth" },
  { label: "Mother's Gender", value: "motherGender" },
  { label: "Spouse Name", value: "spouseName" },
  { label: "Spouse DOB", value: "spouseDateOfBirth" },
  { label: "Spouse Gender", value: "spouseGender" },
  { label: "Child 1 Name", value: "child1Name" },
  { label: "Child 1 DOB", value: "child1DateOfBirth" },
  { label: "Child 1 Gender", value: "child1Gender" },
  { label: "Child 2 Name", value: "child2Name" },
  { label: "Child 2 DOB", value: "child2DateOfBirth" },
  { label: "Child 2 Gender", value: "child2Gender" },
  { label: "Height (cm)", value: "heightCm" },
  { label: "Weight (kg)", value: "weightKg" },
  { label: "Smoker / Non-Smoker", value: "smoker" },
  { label: "Occupation", value: "occupation" },
  { label: "Organisation Name", value: "organizationName" },
  { label: "Annual Income", value: "annualIncome" },
  { label: "Education", value: "education" },
  { label: "Nominee Name", value: "nomineeName" },
  { label: "Nominee DOB", value: "nomineeDateOfBirth" },
  { label: "Nominee Gender", value: "nomineeGender" },
  { label: "Relationship with Employee", value: "nomineeRelationship" },
];

const REQUIRED_TARGET_FIELDS = EMPLOYEE_TARGET_FIELDS.filter(
  (field) => field.required
).map((field) => field.value);

const VALID_STATUS = ["ACTIVE", "INACTIVE"];
const VALID_GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];
const VALID_MARITAL_STATUSES = [
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
  "OTHER",
];
const VALID_EMPLOYMENT_BASIS = ["FULL_TIME", "PART_TIME", "CONTRACT"];
const VALID_TAX_REGIMES = ["OLD", "NEW"];

const EMPTY_SALARY: SalarySelection = { rateColumn: "", typeSource: "" };
const EMPTY_COMPONENT_MAPPING: SalaryComponentColumnMapping = {
  column: "",
  name: "",
  type: "",
};

function targetFieldLabel(value: string): string {
  if (value === "salaryRate") return "Salary Rate";
  if (value === "salaryType") return "Salary Type";
  return (
    EMPLOYEE_TARGET_FIELDS.find((field) => field.value === value)?.label ??
    value
  );
}

function value(raw: unknown) {
  return String(raw ?? "").trim();
}

function isExistingCodeConflictError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("existingcoderesolution") ||
    ((normalized.includes("employee code") ||
      normalized.includes("employee_code")) &&
      (normalized.includes("already exist") ||
        normalized.includes("duplicate") ||
        normalized.includes("conflict")))
  );
}

interface ClientValidation {
  rowNumber: number;
  data: ImportRow;
  errors: string[];
  warnings: string[];
}

function validateRow(
  row: ImportRow,
  sourceValues: ImportRow,
  rowNumber: number,
  reportingToResolved: boolean,
  unsafeIdentifiers: string[],
  componentMappings: SalaryComponentColumnMapping[]
): ClientValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const employeeCode = value(row.employeeCode);
  const name = value(row.name);
  const salaryRate = value(row.salaryRate);
  const salaryType = value(row.salaryType);
  const salaryConfigurationType = row.salaryConfigurationType;
  const salaryComponents = Array.isArray(row.salaryComponents)
    ? row.salaryComponents
    : [];
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

  if (salaryConfigurationType === "LEGACY") {
    if (!salaryRate) {
      errors.push("Salary amount is required for legacy salary");
    } else if (Number.isNaN(Number(salaryRate))) {
      errors.push("Salary Rate must be a number");
    } else if (Number(salaryRate) < 0) {
      errors.push("Salary Rate cannot be negative");
    }

    if (!salaryType) {
      errors.push("Salary Type is required for legacy salary");
    } else if (!VALID_SALARY_TYPES.includes(salaryType)) {
      errors.push("Invalid Salary Type (use HOURLY, DAILY or MONTHLY)");
    }
  }

  if (salaryConfigurationType === "COMPONENTS") {
    if (!salaryComponents.length) {
      errors.push("At least one recurring monthly salary component is required");
    }

    componentMappings.forEach((component) => {
      if (!component.column) return;
      const rawAmount = value(sourceValues[component.column]);
      if (!rawAmount) return;
      const normalizedAmount = rawAmount
        .replace(/^(rs\.?|inr|₹)\s*/i, "")
        .replace(/,/g, "")
        .replace(/\s+/g, "");
      const amount = Number(normalizedAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        errors.push(`${component.name || component.column} must be a non-negative number`);
      }
    });
  }

  unsafeIdentifiers.forEach((field) => {
    errors.push(
      `${targetFieldLabel(field)} is stored as a number with more than 15 digits, so the spreadsheet has already rounded it. Format the column as Text in the source file and re-enter it.`
    );
  });

  if (status && !VALID_STATUS.includes(status)) {
    errors.push("Invalid Status (use ACTIVE or INACTIVE)");
  }

  if (gender && !VALID_GENDERS.some((validGender) => validGender === gender)) {
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

  if (reportingTo && reportingTo.toUpperCase() === employeeCode.toUpperCase()) {
    errors.push("Reporting To cannot be the employee's own code");
  }

  if (mobile && !isValidMobileNumber(mobile)) {
    errors.push("Mobile must contain exactly 10 digits");
  }

  if (dateOfBirth && joiningDate && dateOfBirth >= joiningDate) {
    errors.push("Date of Birth must be before Joining Date");
  }

  if (reportingTo && !reportingToResolved) {
    warnings.push(
      "Reporting To could not be matched to an existing employee code — it will be sent as entered"
    );
  }

  return { rowNumber, data: row, errors, warnings };
}

async function downloadErrorRows(rows: ValidationRow[]) {
  const errorRows = rows.filter((row) => row.status === "ERROR");

  if (!errorRows.length) {
    toast.info("No error rows to download");
    return;
  }

  // Data is already masked in ValidationRow; identifiers never leave in full.
  const data = errorRows.map((row) => ({
    rowNumber: row.rowNumber,
    ...row.data,
    validationErrors: row.messages.join("; "),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

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
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [headerRowNumber, setHeaderRowNumber] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [blankRowNumbers, setBlankRowNumbers] = useState<number[]>([]);
  const [mapping, setMapping] = useState<ColumnMappingValue>({});
  const [genderMappings, setGenderMappings] = useState<
    Record<string, Gender | "">
  >({});
  const [salary, setSalary] = useState<SalarySelection>(EMPTY_SALARY);
  const [salaryMode, setSalaryMode] =
    useState<SalaryImportMode>("PRESERVE");
  const [rowSalaryModes, setRowSalaryModes] = useState<
    Record<number, SalaryImportMode>
  >({});
  const [componentMappings, setComponentMappings] = useState<
    SalaryComponentColumnMapping[]
  >([]);
  const [componentAmountsConfirmed, setComponentAmountsConfirmed] =
    useState(false);
  const [rowResolutions, setRowResolutions] = useState<
    Record<number, ExistingCodeResolution>
  >({});
  const [backendPreview, setBackendPreview] =
    useState<EmployeeImportPreviewResponse | null>(null);
  const [validationFilter, setValidationFilter] =
    useState<ValidationRowFilter>("ALL");
  const [previewEmployeeImport, previewState] =
    usePreviewEmployeeImportMutation();
  const [importEmployees, importState] = useImportEmployeesMutation();
  const { data: orgEmployeesPage } = useGetEmployeesQuery(
    { size: 1000 },
    { skip: !open }
  );

  const router = useRouter();
  const logDataJob = useLogDataJob();

  const sheetMatrix = useMemo(
    () => (workbook && sheetName ? readSheetMatrix(workbook, sheetName) : null),
    [workbook, sheetName]
  );

  const headerCandidates = useMemo(
    () => (sheetMatrix ? headerRowCandidates(sheetMatrix) : []),
    [sheetMatrix]
  );

  const managerLookup = useMemo(() => {
    const codeSet = new Set<string>();
    const nameToCode = new Map<string, string>();

    (orgEmployeesPage?.content ?? []).forEach((candidate) => {
      codeSet.add(candidate.employeeCode);
      nameToCode.set(candidate.name.trim().toLowerCase(), candidate.employeeCode);
    });

    return { codeSet, nameToCode };
  }, [orgEmployeesPage]);

  function clearPreview() {
    setBackendPreview(null);
    setRowResolutions({});
    setValidationFilter("ALL");
  }

  function applyHeaderRow(
    nextWorkbook: XLSX.WorkBook,
    nextSheet: string,
    nextHeaderRow: number | null
  ) {
    const matrix = readSheetMatrix(nextWorkbook, nextSheet);
    const header = nextHeaderRow ?? detectHeaderRowNumber(matrix);
    clearPreview();
    setSalary(EMPTY_SALARY);
    setSalaryMode("PRESERVE");
    setRowSalaryModes({});
    setComponentMappings([]);
    setComponentAmountsConfirmed(false);
    setGenderMappings({});

    if (header === null) {
      setHeaderRowNumber(null);
      setColumns([]);
      setSourceRows([]);
      setBlankRowNumbers([]);
      setMapping({});
      return;
    }

    const extracted = extractSheetRows(matrix, header);
    setHeaderRowNumber(header);
    setColumns(extracted.columns);
    setSourceRows(extracted.rows);
    setBlankRowNumbers(extracted.blankRowNumbers);
    setMapping(autoMapColumns(extracted.columns));
  }

  const genderSourceValues = useMemo(
    () => getGenderSourceValues(sourceRows, mapping),
    [sourceRows, mapping]
  );
  const unmappedGenderValues = useMemo(
    () => getUnmappedGenderSourceValues(genderSourceValues, genderMappings),
    [genderMappings, genderSourceValues]
  );

  // Classify each source row once so totals / non-employee rows are reported
  // (by row number only) and never sent to the server.
  const { employeeRows, skippedRows } = useMemo(() => {
    const employees: Array<
      SourceRow & { mapped: ImportRow; salaryMode: SalaryImportMode }
    > = [];
    const skipped: SkippedRow[] = [];

    sourceRows.forEach((row) => {
      const rowSalaryMode = rowSalaryModes[row.rowNumber] ?? salaryMode;
      const mapped = normalizeMappedGenderValues(
        {
          ...mapSourceRow(row.values, mapping, EMPTY_SALARY),
          ...mapSalaryFieldsForImport(
            row.values,
            rowSalaryMode,
            salary,
            componentMappings
          ),
        },
        genderMappings
      );
      const reason = classifyNonEmployeeRow(row.values, mapped);
      if (reason) {
        skipped.push({ rowNumber: row.rowNumber, reason });
      } else {
        employees.push({ ...row, mapped, salaryMode: rowSalaryMode });
      }
    });

    return { employeeRows: employees, skippedRows: skipped };
  }, [
    sourceRows,
    mapping,
    salary,
    salaryMode,
    rowSalaryModes,
    componentMappings,
    genderMappings,
  ]);

  // Resolve "Reporting To" manager names to employee codes where possible.
  const resolvedRows = useMemo(
    () =>
      employeeRows.map((row) => {
        const rawReportingTo = value(row.mapped.reportingTo);
        if (!rawReportingTo || managerLookup.codeSet.has(rawReportingTo)) {
          return { ...row, reportingToResolved: true };
        }
        const matchedCode = managerLookup.nameToCode.get(
          rawReportingTo.toLowerCase()
        );
        if (matchedCode) {
          return {
            ...row,
            mapped: { ...row.mapped, reportingTo: matchedCode },
            reportingToResolved: true,
          };
        }
        return { ...row, reportingToResolved: false };
      }),
    [employeeRows, managerLookup]
  );

  const missingRequiredMappings = useMemo(() => {
    const mapped = Object.values(mapping);
    return REQUIRED_TARGET_FIELDS.filter((field) => !mapped.includes(field));
  }, [mapping]);

  const usesLegacySalary = employeeRows.some(
    (row) => row.salaryMode === "LEGACY"
  );
  const usesComponentSalary = employeeRows.some(
    (row) => row.salaryMode === "COMPONENTS"
  );
  const componentMappingComplete =
    componentMappings.length > 0 &&
    componentMappings.every(
      (component) =>
        Boolean(component.column) &&
        Boolean(component.name.trim()) &&
        Boolean(component.type)
    );
  const legacySalaryMappingComplete =
    Boolean(salary.rateColumn) &&
    salary.rateColumn !== SALARY_NOT_IN_FILE &&
    Boolean(salary.typeSource) &&
    salary.typeSource !== SALARY_NOT_IN_FILE;
  const salaryChosen =
    (!usesLegacySalary || legacySalaryMappingComplete) &&
    (!usesComponentSalary ||
      (componentMappingComplete && componentAmountsConfirmed));
  const readyForPreview =
    resolvedRows.length > 0 &&
    missingRequiredMappings.length === 0 &&
    unmappedGenderValues.length === 0 &&
    salaryChosen;

  const previewInputs = useMemo(
    () =>
      readyForPreview
        ? resolvedRows.map((row) =>
            toEmployeeImportRowInput(row.mapped, row.rowNumber)
          )
        : [],
    [readyForPreview, resolvedRows]
  );

  useEffect(() => {
    if (!previewInputs.length) return;

    let active = true;
    const request = previewEmployeeImport(previewInputs);

    void request
      .unwrap()
      .then((preview) => {
        if (!active) return;
        setBackendPreview(preview);
        setRowResolutions({});
      })
      .catch((error: { name?: string }) => {
        if (!active || error?.name === "AbortError") return;
        setBackendPreview(null);
        toast.error("Server validation preview failed. Review the mapping and try again.");
      });

    return () => {
      active = false;
      request.abort();
    };
  }, [previewEmployeeImport, previewInputs]);

  const previewRowsByNumber = useMemo(
    () => new Map((backendPreview?.rows ?? []).map((row) => [row.rowNumber, row])),
    [backendPreview]
  );

  const validationRows: ValidationRow[] = useMemo(
    () =>
      resolvedRows.map((row) => {
        const client = validateRow(
          row.mapped,
          row.values,
          row.rowNumber,
          row.reportingToResolved,
          unsafeIdentifierFields(row.values, mapping),
          componentMappings
        );
        const previewRow = previewRowsByNumber.get(row.rowNumber);
        const isExisting = previewRow?.existingCodeOutcome === "CONFLICT";
        const serverErrors = previewRow?.errors ?? [];

        const blockingServerErrors = serverErrors.filter(
          (message) => !(isExisting && isExistingCodeConflictError(message))
        );
        const salaryWarnings =
          row.salaryMode === "PRESERVE"
            ? [
                "Salary not mapped: new employees remain unconfigured and existing salary stays unchanged",
              ]
            : [];
        const conflictMessage = isExisting
          ? "Employee Code already exists; choose Skip or Update before importing"
          : undefined;

        const errors = [...client.errors, ...blockingServerErrors];
        const warnings = [
          ...client.warnings,
          ...salaryWarnings,
          ...(conflictMessage ? [conflictMessage] : []),
        ];

        const status: ValidationRow["status"] =
          errors.length > 0 ? "ERROR" : warnings.length > 0 ? "WARNING" : "VALID";

        return {
          rowNumber: row.rowNumber,
          data: maskSensitiveFields(row.mapped),
          status,
          messages: Array.from(new Set([...errors, ...warnings])),
        };
      }),
    [componentMappings, mapping, previewRowsByNumber, resolvedRows]
  );

  const conflictRows = useMemo(
    () =>
      (backendPreview?.rows ?? []).filter(
        (row) => row.existingCodeOutcome === "CONFLICT"
      ),
    [backendPreview]
  );
  const unresolvedConflictCount = conflictRows.filter(
    (row) => !rowResolutions[row.rowNumber]
  ).length;

  const counts = useMemo(
    () => ({
      valid: validationRows.filter((row) => row.status === "VALID").length,
      warning: validationRows.filter((row) => row.status === "WARNING").length,
      invalid: validationRows.filter((row) => row.status === "ERROR").length,
    }),
    [validationRows]
  );

  const filteredValidationRows = useMemo(
    () => filterValidationRows(validationRows, validationFilter),
    [validationFilter, validationRows]
  );

  const importableRowNumbers = new Set(
    validationRows
      .filter((row) => row.status === "VALID" || row.status === "WARNING")
      .map((row) => row.rowNumber)
  );
  const importableRows = resolvedRows.filter((row) =>
    importableRowNumbers.has(row.rowNumber)
  );

  const ignoredColumns = columns.filter(
    (column) =>
      mapping[column] === "IGNORE" &&
      column !== salary.rateColumn &&
      salary.typeSource !== `${SALARY_TYPE_COLUMN_PREFIX}${column}` &&
      !componentMappings.some((component) => component.column === column)
  );

  async function handleStartImport() {
    if (unresolvedConflictCount > 0) {
      toast.error("Choose Skip or Update for every employee code conflict.");
      return;
    }

    try {
      const rows: EmployeeImportRowInput[] = importableRows.map((row) => {
        const input = toEmployeeImportRowInput(row.mapped, row.rowNumber);
        const resolution = rowResolutions[row.rowNumber];
        return resolution
          ? { ...input, existingCodeResolution: resolution }
          : input;
      });
      const result = await importEmployees(rows).unwrap();
      const outcomeCounts = result.rows.reduce(
        (acc, row) => {
          acc[row.existingCodeOutcome] += 1;
          return acc;
        },
        { CONFLICT: 0, SKIP: 0, UPDATE: 0, NEW: 0 }
      );
      toast.success(
        `Import complete: ${outcomeCounts.NEW} created, ${outcomeCounts.UPDATE} updated${outcomeCounts.SKIP ? `, ${outcomeCounts.SKIP} skipped` : ""}.`
      );
    } catch {
      toast.error("Employee import failed. Review the file and try again.");
      return;
    }

    void logDataJob({
      operation: "IMPORT",
      module: "EMPLOYEE",
      fileName: fileName || `employees-${new Date().toISOString().slice(0, 10)}.xlsx`,
      status: counts.invalid > 0 ? "PARTIAL_SUCCESS" : "COMPLETED",
      progress: 100,
      totalRows: validationRows.length,
      successRows: importableRows.length,
      failedRows: counts.invalid,
      parameters: toEmployeeImportHistoryParams({
        sheetName,
        headerRowNumber: headerRowNumber ?? 1,
        totalRows: validationRows.length,
        importedRows: importableRows.length,
        errorRowNumbers: validationRows
          .filter((row) => row.status === "ERROR")
          .map((row) => row.rowNumber),
        skippedRowNumbers: skippedRows.map((row) => row.rowNumber),
      }),
      notes: "Employee import completed after client and server-side preview validation.",
    });

    handleOpenChange(false);
    router.push("/import-export");
  }

  async function handleFileSelect(file: File) {
    try {
      const buffer = await file.arrayBuffer();
      const nextWorkbook = readWorkbook(buffer);
      if (!nextWorkbook.SheetNames.length) {
        toast.error("No sheets found in file");
        return;
      }
      const nextSheet = suggestSheetName(nextWorkbook);

      setFileName(file.name);
      setWorkbook(nextWorkbook);
      setSheetName(nextSheet);
      applyHeaderRow(nextWorkbook, nextSheet, null);
      toast.success("File parsed. Confirm the sheet, header row and any salary mappings.");
    } catch {
      toast.error("Failed to parse file");
      resetImport();
    }
  }

  function resetImport() {
    setFileName("");
    setWorkbook(null);
    setSheetName("");
    setHeaderRowNumber(null);
    setColumns([]);
    setSourceRows([]);
    setBlankRowNumbers([]);
    setMapping({});
    setGenderMappings({});
    setSalary(EMPTY_SALARY);
    setSalaryMode("PRESERVE");
    setRowSalaryModes({});
    setComponentMappings([]);
    setComponentAmountsConfirmed(false);
    clearPreview();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetImport();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Import Employees</DialogTitle>
        </DialogHeader>

        <div className="h-[calc(90vh-73px)] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {!workbook && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                <FileDropzone onFileSelect={handleFileSelect} />
                <p className="text-sm text-muted-foreground">
                  This imports employee records only. Historical payroll
                  earnings and deductions in the file are not imported here.
                </p>
              </div>
            )}

            {workbook && (
              <>
                <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {resolvedRows.length} employee rows
                        {skippedRows.length ? ` · ${skippedRows.length} non-employee rows skipped` : ""}
                        {blankRowNumbers.length ? ` · ${blankRowNumbers.length} blank rows ignored` : ""}
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

                <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="employee-import-sheet">
                      Sheet
                    </label>
                    <Select
                      value={sheetName}
                      onValueChange={(nextSheet) => {
                        setSheetName(nextSheet);
                        applyHeaderRow(workbook, nextSheet, null);
                      }}
                    >
                      <SelectTrigger id="employee-import-sheet" aria-label="Sheet">
                        <SelectValue placeholder="Select sheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {workbook.SheetNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="employee-import-header-row">
                      Header row
                    </label>
                    <Select
                      value={headerRowNumber ? String(headerRowNumber) : ""}
                      onValueChange={(next) =>
                        applyHeaderRow(workbook, sheetName, Number(next))
                      }
                    >
                      <SelectTrigger id="employee-import-header-row" aria-label="Header row">
                        <SelectValue placeholder="Select header row" />
                      </SelectTrigger>
                      <SelectContent>
                        {headerCandidates.map((candidate) => (
                          <SelectItem
                            key={candidate.rowNumber}
                            value={String(candidate.rowNumber)}
                          >
                            Row {candidate.rowNumber} ({candidate.filledCells} filled cells)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Rows below the header are read as employees. Row numbers
                      below match the spreadsheet.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-medium">Employee records only</p>
                  <p className="mt-1">
                    This import creates or updates employee records. Historical
                    payroll earnings and deductions are <strong>not</strong>{" "}
                    imported by this dialog, and existing employees keep any
                    fields that are blank or not mapped. Reporting To accepts a
                    manager&apos;s Employee Code or exact name in Factory1.
                  </p>
                </div>

                {columns.length > 0 && (
                  <ColumnMapping
                    sourceColumns={columns}
                    targetFields={EMPLOYEE_TARGET_FIELDS}
                    value={mapping}
                    onChange={(nextMapping) => {
                      setMapping(nextMapping);
                      clearPreview();
                    }}
                  />
                )}

                {genderSourceValues.length > 0 && (
                  <div className="space-y-3 rounded-xl border bg-card p-4">
                    <div>
                      <h3 className="text-sm font-semibold">Gender value mapping</h3>
                      <p className="text-sm text-muted-foreground">
                        Canonical values are recognized case-insensitively.
                        Confirm how each other source value maps to MALE, FEMALE
                        or OTHER. The same mapping applies to employee, family
                        and nominee gender fields.
                      </p>
                    </div>
                    <div className="divide-y rounded-md border">
                      {genderSourceValues.map((source) => (
                        <div
                          key={source.key}
                          className="grid gap-3 px-3 py-3 sm:grid-cols-[1fr_240px] sm:items-center"
                        >
                          <div>
                            <p className="text-sm font-medium">{source.label}</p>
                            <p className="text-xs text-muted-foreground">
                              Source value
                              {source.suggestion
                                ? ` · Suggested: ${source.suggestion} (confirm)`
                                : " · Choose a mapping"}
                            </p>
                          </div>
                          <Select
                            value={genderMappings[source.key] ?? ""}
                            onValueChange={(nextGender) => {
                              setGenderMappings((current) => ({
                                ...current,
                                [source.key]: nextGender as Gender,
                              }));
                              clearPreview();
                            }}
                          >
                            <SelectTrigger
                              aria-label={`Map gender value ${source.label}`}
                            >
                              <SelectValue placeholder="Choose gender meaning" />
                            </SelectTrigger>
                            <SelectContent>
                              {VALID_GENDERS.map((gender) => (
                                <SelectItem key={gender} value={gender}>
                                  {gender}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    {unmappedGenderValues.length > 0 && (
                      <p className="text-sm text-destructive">
                        Map every listed value before preview. Blank gender
                        cells are left optional.
                      </p>
                    )}
                  </div>
                )}

                {columns.length > 0 && (
                    <div className="space-y-3 rounded-xl border bg-card p-4">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Salary configuration (optional)
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Leave salary unchanged to create new employees as
                          unconfigured and preserve existing employees&apos;
                          salary. Active unconfigured employees must be configured
                          before payroll. Salary mappings are never guessed.
                        </p>
                      </div>
                      <div className="max-w-md space-y-1">
                        <label className="text-sm font-medium" htmlFor="employee-import-salary-mode">
                          Default salary choice for rows
                        </label>
                        <Select
                          value={salaryMode}
                          onValueChange={(next) => {
                            setSalaryMode(next as SalaryImportMode);
                            setComponentAmountsConfirmed(false);
                            clearPreview();
                          }}
                        >
                          <SelectTrigger
                            id="employee-import-salary-mode"
                            aria-label="Default salary choice for rows"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRESERVE">
                              No salary change / create unconfigured
                            </SelectItem>
                            <SelectItem value="LEGACY">
                              Attendance-based salary
                            </SelectItem>
                            <SelectItem value="COMPONENTS">
                              Monthly salary components
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {usesLegacySalary ? (
                        <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label
                              className="text-sm font-medium"
                              htmlFor="employee-import-salary-rate"
                            >
                              Legacy salary amount column *
                            </label>
                            <Select
                              value={salary.rateColumn}
                              onValueChange={(next) => {
                                setSalary((current) => ({
                                  ...current,
                                  rateColumn: next,
                                }));
                                clearPreview();
                              }}
                            >
                              <SelectTrigger
                                id="employee-import-salary-rate"
                                aria-label="Legacy salary amount column"
                              >
                                <SelectValue placeholder="Choose amount column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SALARY_NOT_IN_FILE}>
                                  Not in this file
                                </SelectItem>
                                {columns.map((column) => (
                                  <SelectItem key={column} value={column}>
                                    {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label
                              className="text-sm font-medium"
                              htmlFor="employee-import-salary-type"
                            >
                              Legacy salary type *
                            </label>
                            <Select
                              value={salary.typeSource}
                              onValueChange={(next) => {
                                setSalary((current) => ({
                                  ...current,
                                  typeSource: next,
                                }));
                                clearPreview();
                              }}
                            >
                              <SelectTrigger
                                id="employee-import-salary-type"
                                aria-label="Legacy salary type"
                              >
                                <SelectValue placeholder="Choose salary type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SALARY_NOT_IN_FILE}>
                                  Not in this file
                                </SelectItem>
                                {VALID_SALARY_TYPES.map((type) => (
                                  <SelectItem
                                    key={type}
                                    value={`${SALARY_TYPE_FIXED_PREFIX}${type}`}
                                  >
                                    All rows: {type}
                                  </SelectItem>
                                ))}
                                {columns.map((column) => (
                                  <SelectItem
                                    key={column}
                                    value={`${SALARY_TYPE_COLUMN_PREFIX}${column}`}
                                  >
                                    From column: {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : null}

                      {usesComponentSalary ? (
                        <div className="space-y-3 rounded-md border p-3">
                          <div>
                            <p className="text-sm font-medium">
                              Map recurring monthly components
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Choose a source column, component name and
                              classification for each amount. Blank cells are
                              omitted per employee; historical payroll rows are
                              never converted automatically.
                            </p>
                          </div>
                          {componentMappings.map((component, index) => (
                            <div
                              key={index}
                              className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                            >
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Amount column *
                                </label>
                                <Select
                                  value={component.column}
                                  onValueChange={(column) => {
                                    setComponentMappings((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, column }
                                          : item
                                      )
                                    );
                                    setComponentAmountsConfirmed(false);
                                    clearPreview();
                                  }}
                                >
                                  <SelectTrigger aria-label={`Component ${index + 1} amount column`}>
                                    <SelectValue placeholder="Choose column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {columns.map((column) => (
                                      <SelectItem key={column} value={column}>
                                        {column}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <label
                                  className="text-xs font-medium"
                                  htmlFor={`employee-import-component-name-${index}`}
                                >
                                  Component name *
                                </label>
                                <input
                                  id={`employee-import-component-name-${index}`}
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                  placeholder="Basic salary, HRA, TDS…"
                                  value={component.name}
                                  onChange={(event) => {
                                    setComponentMappings((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, name: event.target.value }
                                          : item
                                      )
                                    );
                                    setComponentAmountsConfirmed(false);
                                    clearPreview();
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Classification *
                                </label>
                                <Select
                                  value={component.type}
                                  onValueChange={(type) => {
                                    setComponentMappings((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              type: type as SalaryComponentType,
                                            }
                                          : item
                                      )
                                    );
                                    setComponentAmountsConfirmed(false);
                                    clearPreview();
                                  }}
                                >
                                  <SelectTrigger aria-label={`Component ${index + 1} classification`}>
                                    <SelectValue placeholder="Choose classification" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="EARNING">Earning</SelectItem>
                                    <SelectItem value="EMPLOYEE_DEDUCTION">
                                      Employee deduction
                                    </SelectItem>
                                    <SelectItem value="EMPLOYER_CONTRIBUTION">
                                      Employer contribution
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`Remove component mapping ${index + 1}`}
                                onClick={() => {
                                  setComponentMappings((current) =>
                                    current.filter((_, itemIndex) => itemIndex !== index)
                                  );
                                  setComponentAmountsConfirmed(false);
                                  clearPreview();
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setComponentMappings((current) => [
                                ...current,
                                { ...EMPTY_COMPONENT_MAPPING },
                              ]);
                              setComponentAmountsConfirmed(false);
                              clearPreview();
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add component mapping
                          </Button>
                          <label className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={componentAmountsConfirmed}
                              onChange={(event) => {
                                setComponentAmountsConfirmed(event.target.checked);
                                clearPreview();
                              }}
                            />
                            <span>
                              I confirm these columns contain recurring monthly
                              compensation for the selected employees, not
                              one-month &quot;Actual&quot; payments or historical
                              payroll values.
                            </span>
                          </label>
                        </div>
                      ) : null}

                      <details className="rounded-md border p-3">
                        <summary className="cursor-pointer text-sm font-medium">
                          Choose salary configuration per employee (
                          {resolvedRows.length} rows)
                        </summary>
                        <p className="my-2 text-xs text-muted-foreground">
                          Selecting monthly components confirms that employee&apos;s
                          mapped amounts are recurring monthly values.
                        </p>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                          {resolvedRows.map((row) => {
                            const code = value(row.mapped.employeeCode);
                            const name = value(row.mapped.name);
                            return (
                              <div
                                key={row.rowNumber}
                                className="grid gap-2 border-t pt-2 text-sm sm:grid-cols-[1fr_220px] sm:items-center"
                              >
                                <span>
                                  Row {row.rowNumber}: {code}
                                  {name ? ` — ${name}` : ""}
                                </span>
                                <Select
                                  value={rowSalaryModes[row.rowNumber] ?? "DEFAULT"}
                                  onValueChange={(next) => {
                                    setRowSalaryModes((current) => {
                                      if (next === "DEFAULT") {
                                        const nextModes = { ...current };
                                        delete nextModes[row.rowNumber];
                                        return nextModes;
                                      }
                                      return {
                                        ...current,
                                        [row.rowNumber]: next as SalaryImportMode,
                                      };
                                    });
                                    setComponentAmountsConfirmed(false);
                                    clearPreview();
                                  }}
                                >
                                  <SelectTrigger
                                    className="h-8"
                                    aria-label={`Salary configuration for row ${row.rowNumber}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="DEFAULT">
                                      Use default (
                                      {salaryMode === "PRESERVE"
                                        ? "no salary change"
                                        : salaryMode === "LEGACY"
                                          ? "legacy"
                                          : "components"}
                                      )
                                    </SelectItem>
                                    <SelectItem value="PRESERVE">
                                      No salary change / unconfigured
                                    </SelectItem>
                                    <SelectItem value="LEGACY">
                                      Attendance-based salary
                                    </SelectItem>
                                    <SelectItem value="COMPONENTS">
                                      Monthly components
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                )}

                {ignoredColumns.length > 0 && (
                  <div className="rounded-xl border p-4 text-sm">
                    <p className="font-medium">
                      {ignoredColumns.length} column{ignoredColumns.length === 1 ? "" : "s"} will not be imported
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {ignoredColumns.join(", ")}. Payroll figures (earnings,
                      deductions, attendance) in these columns are not saved by
                      this import.
                    </p>
                  </div>
                )}

                {skippedRows.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <p className="font-medium">
                      {skippedRows.length} row{skippedRows.length === 1 ? "" : "s"} skipped
                    </p>
                    <ul className="mt-1 max-h-28 overflow-y-auto">
                      {skippedRows.slice(0, 50).map((row) => (
                        <li key={row.rowNumber}>
                          Row {row.rowNumber}: {row.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(missingRequiredMappings.length > 0 || !salaryChosen) && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-medium text-destructive">
                      Complete the mapping to validate
                    </p>
                    {missingRequiredMappings.length > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Please map:{" "}
                        <span className="font-medium">
                          {missingRequiredMappings.map(targetFieldLabel).join(", ")}
                        </span>
                      </p>
                    )}
                    {!salaryChosen && (
                      <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                        {usesLegacySalary && !legacySalaryMappingComplete ? (
                          <p>
                            Choose a salary amount column and salary type for
                            each row using legacy salary.
                          </p>
                        ) : null}
                        {usesComponentSalary && !componentMappingComplete ? (
                          <p>
                            Complete every component&apos;s amount column, name
                            and classification.
                          </p>
                        ) : null}
                        {usesComponentSalary &&
                        componentMappingComplete &&
                        !componentAmountsConfirmed ? (
                          <p>
                            Confirm that component columns are recurring monthly
                            amounts, not historical Actual payments.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {readyForPreview && (
                  <FileValidationSummary
                    valid={counts.valid}
                    warning={counts.warning}
                    invalid={counts.invalid}
                  />
                )}

                {conflictRows.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <div>
                      <p className="font-medium">
                        {conflictRows.length} existing employee
                        {conflictRows.length === 1 ? "" : "s"} found
                      </p>
                      <p className="mt-1 text-sm">
                        Choose update or skip for every row. Updates only change
                        fields that have a value in this file. Import remains
                        disabled until all conflicts have an explicit decision.
                      </p>
                    </div>
                    <Select
                      value=""
                      onValueChange={(nextValue) =>
                        setRowResolutions(
                          Object.fromEntries(
                            conflictRows.map((row) => [
                              row.rowNumber,
                              nextValue as ExistingCodeResolution,
                            ])
                          )
                        )
                      }
                    >
                      <SelectTrigger className="w-full bg-background sm:max-w-sm">
                        <SelectValue placeholder="Apply a choice to all conflicts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SKIP">Skip existing employees</SelectItem>
                        <SelectItem value="UPDATE">
                          Update existing employees from this file
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="max-h-36 overflow-y-auto rounded-md border border-amber-200 bg-background">
                      {conflictRows.slice(0, 50).map((row) => {
                        const clientRow = resolvedRows.find(
                          (candidate) => candidate.rowNumber === row.rowNumber
                        );
                        const employeeCode =
                          row.resolvedEmployeeCode ||
                          row.employeeCode ||
                          value(clientRow?.mapped.employeeCode);
                        const employeeName =
                          row.employee?.name || value(clientRow?.mapped.name);

                        return (
                          <div
                            key={row.rowNumber}
                            className="grid gap-2 border-b px-3 py-2 text-sm last:border-b-0 sm:grid-cols-[1fr_220px] sm:items-center"
                          >
                            <span>
                              Row {row.rowNumber}: <strong>{employeeCode}</strong>
                              {employeeName ? ` — ${employeeName}` : ""}
                            </span>
                            <Select
                              value={rowResolutions[row.rowNumber] ?? ""}
                              onValueChange={(nextValue) =>
                                setRowResolutions((current) => ({
                                  ...current,
                                  [row.rowNumber]: nextValue as ExistingCodeResolution,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 bg-background">
                                <SelectValue placeholder="Decision required" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SKIP">Skip this employee</SelectItem>
                                <SelectItem value="UPDATE">Update this employee</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {readyForPreview && (
                  <div className="space-y-3">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                      <div>
                        <h3 className="text-sm font-semibold">Validation Preview</h3>
                        <p className="text-sm text-muted-foreground">
                          Showing {filteredValidationRows.length}{" "}
                          {validationFilter === "ALL"
                            ? `of ${validationRows.length} rows`
                            : `${validationFilter === "ERROR" ? "error" : validationFilter === "WARNING" ? "warning" : "valid"} rows`}
                          . Identity and bank numbers are masked.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={validationFilter}
                          onValueChange={(nextValue) =>
                            setValidationFilter(nextValue as ValidationRowFilter)
                          }
                        >
                          <SelectTrigger
                            className="sm:w-48"
                            aria-label="Filter preview rows by status"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">
                              All ({validationRows.length})
                            </SelectItem>
                            <SelectItem value="ERROR">
                              Errors ({counts.invalid})
                            </SelectItem>
                            <SelectItem value="WARNING">
                              Warnings ({counts.warning})
                            </SelectItem>
                            <SelectItem value="VALID">
                              Valid ({counts.valid})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          disabled={counts.invalid === 0}
                          onClick={() => downloadErrorRows(validationRows)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Error Rows
                        </Button>
                      </div>
                    </div>
                    {filteredValidationRows.length > 0 ? (
                      <FileValidationTable rows={filteredValidationRows} />
                    ) : (
                      <div
                        className="rounded-xl border p-6 text-center text-sm text-muted-foreground"
                        role="status"
                      >
                        {validationFilter === "ALL"
                          ? "No rows to preview."
                          : `No ${validationFilter.toLowerCase()} rows to show.`}
                      </div>
                    )}
                  </div>
                )}

                <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background pt-5">
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !readyForPreview ||
                      importableRows.length === 0 ||
                      previewState.isLoading ||
                      importState.isLoading ||
                      !backendPreview ||
                      unresolvedConflictCount > 0
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
