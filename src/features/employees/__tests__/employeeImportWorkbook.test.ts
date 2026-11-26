import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { toEmployeeImportHistoryParams } from "@/features/import-export/utils/importReportParams";
import {
  autoMapColumns,
  classifyNonEmployeeRow,
  detectHeaderRowNumber,
  extractSheetRows,
  getGenderSourceValues,
  getUnmappedGenderSourceValues,
  mapSalaryFieldsForImport,
  mapSourceRow,
  maskSensitiveFields,
  normalizeMappedGenderValues,
  normalizeGenderSourceLabel,
  readSheetMatrix,
  readWorkbook,
  SALARY_NOT_IN_FILE,
  SALARY_TYPE_COLUMN_PREFIX,
  SALARY_TYPE_FIXED_PREFIX,
  SalarySelection,
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

  it("collects distinct noncanonical gender labels and suggests without choosing", () => {
    const genderValues = getGenderSourceValues(
      [
        {
          rowNumber: 2,
          values: { Gender: "M", "Father Gender": "Oth" },
        },
        {
          rowNumber: 3,
          values: { Gender: " m ", "Father Gender": "Custom identity" },
        },
        {
          rowNumber: 4,
          values: { Gender: "  f  ", "Father Gender": "OTHER" },
        },
      ],
      { Gender: "gender", "Father Gender": "fatherGender" }
    );

    expect(genderValues).toEqual([
      { key: "M", label: "M", suggestion: "MALE" },
      { key: "OTH", label: "Oth", suggestion: "OTHER" },
      {
        key: "CUSTOM IDENTITY",
        label: "Custom identity",
        suggestion: null,
      },
      { key: "F", label: "f", suggestion: "FEMALE" },
    ]);
    expect(normalizeGenderSourceLabel("  Male   ")).toBe("MALE");
  });

  it("requires explicit mappings, then normalizes every gender field for import", () => {
    const sourceValues = getGenderSourceValues(
      [
        {
          rowNumber: 2,
          values: {
            Gender: "M",
            "Father Gender": "Oth",
            "Nominee Gender": "Custom identity",
          },
        },
      ],
      {
        Gender: "gender",
        "Father Gender": "fatherGender",
        "Nominee Gender": "nomineeGender",
      }
    );
    const mappings = {
      M: "MALE" as const,
      OTH: "OTHER" as const,
      "CUSTOM IDENTITY": "FEMALE" as const,
    };

    expect(getUnmappedGenderSourceValues(sourceValues, {})).toHaveLength(3);
    expect(getUnmappedGenderSourceValues(sourceValues, mappings)).toEqual([]);
    const normalized = normalizeMappedGenderValues(
      {
        gender: "M",
        fatherGender: "Oth",
        nomineeGender: "Custom identity",
        motherGender: "  female ",
      },
      mappings
    );
    expect(normalized).toEqual({
      gender: "MALE",
      fatherGender: "OTHER",
      nomineeGender: "FEMALE",
      motherGender: "FEMALE",
    });
    expect(toEmployeeImportRowInput(normalized, 2)).toMatchObject({
      gender: "MALE",
      fatherGender: "OTHER",
      nomineeGender: "FEMALE",
      motherGender: "FEMALE",
    });
  });

  it("leaves blank gender optional and omits it from the import payload", () => {
    const normalized = normalizeMappedGenderValues(
      { employeeCode: "T001", name: "Alpha Tester", gender: "  " },
      {}
    );
    expect(
      toEmployeeImportRowInput(normalized, 2)
    ).not.toHaveProperty("gender");
    expect(
      getGenderSourceValues(
        [{ rowNumber: 2, values: { Gender: "" } }],
        { Gender: "gender" }
      )
    ).toEqual([]);
  });
});

describe("employee import payload and history", () => {
  it("omits salary fields when no salary is mapped", () => {
    const salaryFields = mapSalaryFieldsForImport(
      { Basic: 12000 },
      "PRESERVE",
      { rateColumn: "", typeSource: "" },
      []
    );
    const input = toEmployeeImportRowInput(
      {
        employeeCode: "T001",
        name: "Alpha Tester",
        ...salaryFields,
      },
      5
    );

    expect(input).toEqual({
      rowNumber: 5,
      employeeCode: "T001",
      name: "Alpha Tester",
    });
    expect(input).not.toHaveProperty("salaryConfigurationType");
    expect(input).not.toHaveProperty("salaryComponents");
  });

  it("maps a separate monthly component setup for each employee row", () => {
    const mappings = [
      { column: "Basic", name: "Basic Salary", type: "EARNING" as const },
      { column: "HRA", name: "HRA", type: "EARNING" as const },
      {
        column: "Employee PF",
        name: "PF",
        type: "EMPLOYEE_DEDUCTION" as const,
      },
      {
        column: "Employer PF",
        name: "Employer PF",
        type: "EMPLOYER_CONTRIBUTION" as const,
      },
    ];
    const noLegacySalary: SalarySelection = {
      rateColumn: "",
      typeSource: "",
    };
    const first = toEmployeeImportRowInput(
      {
        employeeCode: "T001",
        name: "Alpha Tester",
        ...mapSalaryFieldsForImport(
          {
            Basic: 12000,
            HRA: 3000,
            "Employee PF": 500,
            "Employer PF": 500,
          },
          "COMPONENTS",
          noLegacySalary,
          mappings
        ),
      },
      5
    );
    const second = toEmployeeImportRowInput(
      {
        employeeCode: "T002",
        name: "Beta Tester",
        ...mapSalaryFieldsForImport(
          { Basic: 9000, HRA: "", "Employee PF": 300, "Employer PF": "" },
          "COMPONENTS",
          noLegacySalary,
          mappings
        ),
      },
      6
    );

    expect(first.salaryComponents).toEqual([
      { name: "Basic Salary", type: "EARNING", amount: 12000 },
      { name: "HRA", type: "EARNING", amount: 3000 },
      { name: "PF", type: "EMPLOYEE_DEDUCTION", amount: 500 },
      {
        name: "Employer PF",
        type: "EMPLOYER_CONTRIBUTION",
        amount: 500,
      },
    ]);
    expect(second.salaryComponents).toEqual([
      { name: "Basic Salary", type: "EARNING", amount: 9000 },
      { name: "PF", type: "EMPLOYEE_DEDUCTION", amount: 300 },
    ]);
    expect(first.salaryConfigurationType).toBe("COMPONENTS");
    expect(second.salaryConfigurationType).toBe("COMPONENTS");
  });

  it("maps legacy salary type explicitly without confusing it with components", () => {
    const mapped = mapSalaryFieldsForImport(
      { Rate: "700" },
      "LEGACY",
      {
        rateColumn: "Rate",
        typeSource: `${SALARY_TYPE_FIXED_PREFIX}DAILY`,
      },
      []
    );

    expect(mapped).toEqual({
      salaryConfigurationType: "LEGACY",
      salaryRate: "700",
      salaryType: "DAILY",
    });
  });

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
