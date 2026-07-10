"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, FileText, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportRow = Record<string, unknown>;

const EMPLOYEE_TARGET_FIELDS: TargetField[] = [
  { label: "Employee Code", value: "employeeCode", required: true },
  { label: "Name", value: "name", required: true },
  { label: "Phone", value: "phone" },
  { label: "Email", value: "email" },
  { label: "Employee Type", value: "employeeType" },
  { label: "Designation", value: "designation" },
  { label: "Department", value: "department" },
  { label: "Salary Rate", value: "salaryRate", required: true },
  { label: "Salary Type", value: "salaryType", required: true },
  { label: "Joining Date", value: "joiningDate" },
  { label: "Status", value: "status" },
];

const REQUIRED_TARGET_FIELDS = EMPLOYEE_TARGET_FIELDS.filter(
  (field) => field.required
).map((field) => field.value);

const VALID_EMPLOYEE_TYPES = ["BLUE_COLLAR", "WHITE_COLLAR", "CONTRACTOR"];
const VALID_SALARY_TYPES = ["HOURLY", "DAILY", "MONTHLY"];
const VALID_STATUS = ["ACTIVE", "INACTIVE"];

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
  name: ["name", "employee name", "full name", "worker name", "staff name"],
  phone: ["phone", "mobile", "mobile number", "contact", "contact number"],
  email: ["email", "email id", "email address"],
  employeeType: ["employee type", "type", "worker type", "staff type"],
  designation: ["designation", "role", "job title", "position"],
  department: ["department", "dept", "team"],
  salaryRate: ["salary", "salary rate", "wage", "rate", "amount", "pay"],
  salaryType: ["salary type", "pay type", "wage type"],
  joiningDate: ["joining date", "join date", "date of joining", "doj"],
  status: ["status", "employee status"],
};

function normalizeColumnName(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, " ");
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
      mappedRow[targetField] = row[sourceColumn];
    });

    return mappedRow;
  });
}

function value(value: unknown) {
  return String(value ?? "").trim();
}

function validateRows(mappedRows: ImportRow[]): ValidationRow[] {
  const employeeCodeCount = new Map<string, number>();

  mappedRows.forEach((row) => {
    const code = value(row.employeeCode);
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
    const employeeType = value(row.employeeType);
    const status = value(row.status);

    if (!employeeCode) errors.push("Employee Code is required");
    if (!name) errors.push("Name is required");
    if (!salaryRate) errors.push("Salary Rate is required");
    if (!salaryType) errors.push("Salary Type is required");

    if (employeeCode && employeeCodeCount.get(employeeCode)! > 1) {
      errors.push("Duplicate Employee Code in uploaded file");
    }

    if (salaryRate && Number.isNaN(Number(salaryRate))) {
      errors.push("Salary Rate must be a number");
    }

    if (salaryType && !VALID_SALARY_TYPES.includes(salaryType)) {
      errors.push("Invalid Salary Type");
    }

    if (employeeType && !VALID_EMPLOYEE_TYPES.includes(employeeType)) {
      errors.push("Invalid Employee Type");
    }

    if (status && !VALID_STATUS.includes(status)) {
      errors.push("Invalid Status");
    }

    if (!row.phone) warnings.push("Phone missing");
    if (!row.email) warnings.push("Email missing");
    if (!row.department) warnings.push("Department missing");
    if (!row.designation) warnings.push("Designation missing");

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

function downloadErrorRows(rows: ValidationRow[]) {
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

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "employee-import-errors.csv";
  link.click();

  URL.revokeObjectURL(url);
}


export function EmployeeImportDialog({ open, onOpenChange }: Props) {
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<ImportRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMappingValue>({});

  const router = useRouter();
  const logDataJob = useLogDataJob();

  const sourceColumns = useMemo(() => {
    if (!rawRows.length) return [];
    return Object.keys(rawRows[0]);
  }, [rawRows]);

  const mappedRows = useMemo(() => {
    return mapRowsToEmployeeFields(rawRows, mapping);
  }, [rawRows, mapping]);

  const validationRows = useMemo(() => {
    return validateRows(mappedRows);
  }, [mappedRows]);

  const validation = useMemo(() => {
    const mappedTargetFields = Object.values(mapping).filter(
      (field) => field !== "IGNORE"
    );

    const missingRequiredMappings = REQUIRED_TARGET_FIELDS.filter(
      (field) => !mappedTargetFields.includes(field)
    );

    return {
      valid: validationRows.filter((row) => row.status === "VALID").length,
      warning: validationRows.filter((row) => row.status === "WARNING").length,
      invalid: validationRows.filter((row) => row.status === "ERROR").length,
      missingRequiredMappings,
    };
  }, [validationRows, mapping]);

  function handleStartImport() {
    void logDataJob({
      operation: "IMPORT",
      module: "EMPLOYEE",
      fileName: fileName || `employees-${new Date().toISOString().slice(0, 10)}.csv`,
      status: validation.invalid > 0 ? "PARTIAL_SUCCESS" : "COMPLETED",
      progress: 100,
      totalRows: validationRows.length,
      successRows: importableRows.length,
      failedRows: validation.invalid,
      notes: "Client-side import validation completed. Backend bulk import integration pending.",
    });
    toast.success("Import job started. Track progress in Import / Export History.");

    handleOpenChange(false);

    router.push("/import-export");
  }

  async function handleFileSelect(file: File) {
    try {
      setFileName(file.name);

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

      setRawRows(parsedRows);
      setMapping(autoMapColumns(columns));

      toast.success("File parsed successfully");
    } catch {
      toast.error("Failed to parse file");
      setRawRows([]);
      setFileName("");
      setMapping({});
    }
  }

  function resetImport() {
    setRawRows([]);
    setFileName("");
    setMapping({});
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetImport();
    onOpenChange(nextOpen);
  }

  const importableRows = validationRows.filter(
    (row) => row.status === "VALID" || row.status === "WARNING"
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Import Employees</DialogTitle>
        </DialogHeader>

        <div className="h-[calc(90vh-73px)] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {!rawRows.length && <FileDropzone onFileSelect={handleFileSelect} />}

            {rawRows.length > 0 && (
              <>
                <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {rawRows.length} rows detected
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
                  onChange={setMapping}
                />

                <FileValidationSummary
                  valid={validation.valid}
                  warning={validation.warning}
                  invalid={validation.invalid}
                />

                {validation.missingRequiredMappings.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-medium text-destructive">
                      Missing required mappings
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Please map these fields:{" "}
                      <span className="font-medium">
                        {validation.missingRequiredMappings.join(", ")}
                      </span>
                    </p>
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
                      validation.missingRequiredMappings.length > 0
                    }
                    onClick={handleStartImport}
                  >
                    Start Import {importableRows.length > 0 ? `(${importableRows.length})` : ""}
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
