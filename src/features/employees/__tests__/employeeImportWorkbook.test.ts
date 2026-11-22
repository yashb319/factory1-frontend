import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { toEmployeeImportHistoryParams } from "@/features/import-export/utils/importReportParams";
import {
  autoMapColumns,
  classifyNonEmployeeRow,
  detectHeaderRowNumber,
  extractSheetRows,
  mapSourceRow,
  maskSensitiveFields,
  readSheetMatrix,
  readWorkbook,
  SALARY_NOT_IN_FILE,
  SALARY_TYPE_COLUMN_PREFIX,
  SALARY_TYPE_FIXED_PREFIX,
  suggestSheetName,
  toEmployeeImportRowInput,
  unsafeIdentifierFields,
} from "../utils/employeeImportWorkbook";

// All data below is synthetic.
function workbookBuffer(
  sheets: Record<string, unknown[][]>,
  bookType: XLSX.BookType
): ArrayBuffer {
  const book = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows]) => {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
  });
  const out = XLSX.write(book, { type: "array", bookType }) as ArrayBuffer;
  return out;
}

const titledXlsx = () =>
  readWorkbook(
    workbookBuffer(
      {
        Notes: [["Readme only"]],
        Payroll: [
          ["Test Factory Pvt Ltd"],
          ["Salary sheet for 01/2099"],
          [],
          ["Sr No", "Emp Code", "Name of Employee", "PF No", "UAN No", "Basic", "Gross", "Net Pay", "Days"],
          [1, "T001", "Alpha Tester", "PF/TEST/0001", 100000000001, "12,000", 15000, 14000, 26],
          [2, "T002", "Beta Tester", "", "", 9000, 11000, 10500, 24],
          [],
          ["", "Total", "", "", "", 21000, 26000, 24500, ""],
        ],
      },
      "xlsx"
    )
  );

describe("employee import workbook parsing", () => {
  it("detects a header on row 4 and preserves spreadsheet row numbers", () => {
    const workbook = titledXlsx();
    expect(suggestSheetName(workbook)).toBe("Payroll");

    const matrix = readSheetMatrix(workbook, "Payroll");
    expect(detectHeaderRowNumber(matrix)).toBe(4);

    const sheet = extractSheetRows(matrix, 4);
    expect(sheet.columns).toContain("Emp Code");
    expect(sheet.rows.map((row) => row.rowNumber)).toEqual([5, 6, 8]);
    expect(sheet.blankRowNumbers).toEqual([7]);
  });

  it("auto-maps synonyms but never salary columns", () => {
    const mapping = autoMapColumns([
      "Sr No",
      "Emp Code",
      "Name of Employee",
      "PF No",
      "UAN No",
      "Basic",
      "Gross",
      "Salary",
      "Rate",
      "Salary Type",
    ]);
    expect(mapping["Emp Code"]).toBe("employeeCode");
    expect(mapping["Name of Employee"]).toBe("name");
    expect(mapping["PF No"]).toBe("pfAccountNumber");
    expect(mapping["UAN No"]).toBe("uan");
    ["Sr No", "Basic", "Gross", "Salary", "Rate", "Salary Type"].forEach((column) =>
      expect(mapping[column]).toBe("IGNORE")
    );
  });

  it("uses only the explicitly chosen salary column and type", () => {
    const workbook = titledXlsx();
    const sheet = extractSheetRows(readSheetMatrix(workbook, "Payroll"), 4);
    const mapping = autoMapColumns(sheet.columns);

    const unselected = mapSourceRow(sheet.rows[0].values, mapping, {
      rateColumn: "",
      typeSource: "",
    });
    expect(unselected.salaryRate).toBeUndefined();
    expect(unselected.salaryType).toBeUndefined();

    const chosen = mapSourceRow(sheet.rows[0].values, mapping, {
      rateColumn: "Basic",
      typeSource: `${SALARY_TYPE_FIXED_PREFIX}MONTHLY`,
    });
    expect(chosen.salaryRate).toBe("12000");
    expect(chosen.salaryType).toBe("MONTHLY");

    const notInFile = mapSourceRow(sheet.rows[0].values, mapping, {
      rateColumn: SALARY_NOT_IN_FILE,
      typeSource: SALARY_NOT_IN_FILE,
    });
    expect(notInFile.salaryRate).toBeUndefined();
    expect(notInFile.salaryType).toBeUndefined();
  });

  it("reads salary type from a chosen column", () => {
    const mapped = mapSourceRow(
      { Code: "T9", "Pay Basis": " daily " },
      { Code: "employeeCode", "Pay Basis": "IGNORE" },
      { rateColumn: SALARY_NOT_IN_FILE, typeSource: `${SALARY_TYPE_COLUMN_PREFIX}Pay Basis` }
    );
    expect(mapped.salaryType).toBe("DAILY");
  });

  it("classifies total and non-employee rows", () => {
    const workbook = titledXlsx();
    const sheet = extractSheetRows(readSheetMatrix(workbook, "Payroll"), 4);
    const mapping = autoMapColumns(sheet.columns);
    const salary = { rateColumn: SALARY_NOT_IN_FILE, typeSource: SALARY_NOT_IN_FILE };

    const reasons = sheet.rows.map((row) =>
      classifyNonEmployeeRow(row.values, mapSourceRow(row.values, mapping, salary))
    );
    expect(reasons[0]).toBeNull();
    expect(reasons[1]).toBeNull();
    expect(reasons[2]).toMatch(/Total/);

    expect(
      classifyNonEmployeeRow({ Note: "Prepared by HR" }, { employeeCode: "", name: "" })
    ).toMatch(/non-employee/);
  });

  it("keeps identifiers exact, masks them, and flags rounded numbers", () => {
    const workbook = titledXlsx();
    const sheet = extractSheetRows(readSheetMatrix(workbook, "Payroll"), 4);
    const mapping = autoMapColumns(sheet.columns);
    const mapped = mapSourceRow(sheet.rows[0].values, mapping, {
      rateColumn: SALARY_NOT_IN_FILE,
      typeSource: SALARY_NOT_IN_FILE,
    });
    expect(mapped.uan).toBe("100000000001");
    expect(mapped.pfAccountNumber).toBe("PF/TEST/0001");

    const masked = maskSensitiveFields(mapped);
    expect(masked.uan).toBe("••••••••0001");
    expect(masked.pfAccountNumber).not.toContain("TEST");
    expect(masked.employeeCode).toBe("T001");

    expect(
      unsafeIdentifierFields({ Aadhaar: 1234567890123456789 }, { Aadhaar: "aadhaarNumber" })
    ).toEqual(["aadhaarNumber"]);
  });

  it("reads an XLS workbook with an Employee sheet and header row 1", () => {
    const workbook = readWorkbook(
      workbookBuffer(
        {
          Summary: [["Generated report"]],
          Employee: [
            ["Employee Code", "Employee Name", "Date of Joining", "Department", "Aadhar No", "Bank A/C No", "IFSC"],
            ["T101", "Gamma Tester", "05/04/2098", "Assembly", "999900001111", "000123456789", "TEST0000001"],
          ],
        },
        "biff8"
      )
    );
    expect(suggestSheetName(workbook)).toBe("Employee");
    const matrix = readSheetMatrix(workbook, "Employee");
    expect(detectHeaderRowNumber(matrix)).toBe(1);
    const sheet = extractSheetRows(matrix, 1);
    const mapping = autoMapColumns(sheet.columns);
    expect(mapping).toMatchObject({
      "Employee Code": "employeeCode",
      "Employee Name": "name",
      "Date of Joining": "joiningDate",
      "Aadhar No": "aadhaarNumber",
      "Bank A/C No": "bankAccountNumber",
      IFSC: "bankIfscCode",
    });
    const mapped = mapSourceRow(sheet.rows[0].values, mapping, {
      rateColumn: SALARY_NOT_IN_FILE,
      typeSource: SALARY_NOT_IN_FILE,
    });
    expect(sheet.rows[0].rowNumber).toBe(2);
    expect(mapped.joiningDate).toBe("2098-04-05");
    expect(mapped.bankAccountNumber).toBe("000123456789");
  });
});

describe("employee import payload and history", () => {
  it("omits blank fields so updates do not clear existing values", () => {
    const input = toEmployeeImportRowInput(
      { employeeCode: "T001", name: "Alpha Tester", phone: "", pfAccountNumber: "PF/TEST/0001", location: "Unit 1" },
      5
    );
    expect(input).toEqual({
      rowNumber: 5,
      employeeCode: "T001",
      name: "Alpha Tester",
      pfAccountNumber: "PF/TEST/0001",
      locationRaw: "Unit 1",
    });
  });

  it("stores metadata only in import history", () => {
    const params = toEmployeeImportHistoryParams({
      sheetName: "Payroll",
      headerRowNumber: 4,
      totalRows: 2,
      importedRows: 1,
      errorRowNumbers: [6],
      skippedRowNumbers: [8],
    });
    expect(params).not.toHaveProperty("validRows");
    expect(params).not.toHaveProperty("errorRows");
    expect(params).not.toHaveProperty("headers");
    expect(JSON.stringify(params)).not.toMatch(/Tester|T00/);
  });
});
