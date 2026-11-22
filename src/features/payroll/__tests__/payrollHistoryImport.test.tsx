import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as XLSX from "xlsx";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractSheetRows,
  readSheetMatrix,
} from "@/features/employees/utils/employeeImportWorkbook";
import { PayrollHistoryImportDialog } from "../components/PayrollHistoryImportDialog";
import {
  buildHistoryColumns,
  buildHistoryPreview,
  parseHistoryNumber,
  suggestEmployeeCodeColumn,
  toPayrollHistoryRequest,
} from "../utils/payrollHistoryWorkbook";

if (!Blob.prototype.arrayBuffer) {
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    value(this: Blob) {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    },
  });
}

const mocks = vi.hoisted(() => ({ importHistory: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("../api/payrollHistoryApi", () => ({
  useImportPayrollHistoryMutation: () => [mocks.importHistory, { isLoading: false }],
}));

// Synthetic wage sheet: title rows, header on row 3, duplicate "Basic" label,
// a blank row and a total row. No real employee data.
const AOA = [
  ["Synthetic Works"],
  ["Wages for 01/2099"],
  ["Sr No", "Emp Code", "Name", "Bank A/C No", "Days", "Basic", "PF", "Basic"],
  [1, "S001", "Test One", "000111222333", 26, "12,000", 1440, 500],
  [2, "S002", "Test Two", "", 24.5, 9000, "", 0],
  [],
  ["", "Total", "", "", "", 21000, 1440, 500],
];

function sheet() {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(AOA), "Wages");
  return book;
}

function extract() {
  const matrix = readSheetMatrix(sheet(), "Wages");
  const extracted = extractSheetRows(matrix, 3);
  const columns = buildHistoryColumns(extracted, matrix.rows[2]);
  return { extracted, columns };
}

async function uploadSynthetic(container: HTMLElement) {
  const user = userEvent.setup();
  const data = XLSX.write(sheet(), { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  await user.upload(
    container.querySelector('input[type="file"]') as HTMLInputElement,
    new File([data], "synthetic.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
  return user;
}

describe("payroll history workbook utils", () => {
  it("keys values by column number + label and excludes identity columns", () => {
    const { columns } = extract();
    expect(columns.map((column) => column.key)).toEqual([
      "1: Sr No",
      "2: Emp Code",
      "3: Name",
      "4: Bank A/C No",
      "5: Days",
      "6: Basic",
      "7: PF",
      "8: Basic",
    ]);
    const excluded = columns.filter((column) => column.identityReason).map((c) => c.key);
    expect(excluded).toEqual(["3: Name", "4: Bank A/C No"]);
    expect(suggestEmployeeCodeColumn(columns)).toBe("Emp Code");
  });

  it("preserves numbers, omits blanks, skips totals and flags text", () => {
    expect(parseHistoryNumber("12,000")).toBe(12000);
    expect(parseHistoryNumber("₹ 1,234.50")).toBe(1234.5);
    expect(parseHistoryNumber("")).toBeNull();
    expect(parseHistoryNumber(0)).toBe(0);
    expect(Number.isNaN(parseHistoryNumber("absent") as number)).toBe(true);

    const { extracted, columns } = extract();
    const valueNames = columns
      .filter((column) => ["5: Days", "6: Basic", "7: PF", "8: Basic"].includes(column.key))
      .map((column) => column.sourceName);
    const preview = buildHistoryPreview(extracted, columns, "Emp Code", valueNames);

    expect(preview.errors).toEqual([]);
    expect(preview.skipped).toEqual([
      { rowNumber: 7, message: expect.stringMatching(/total/i) },
    ]);
    expect(toPayrollHistoryRequest(2099, 1, preview)).toEqual({
      year: 2099,
      month: 1,
      rows: [
        {
          rowNumber: 4,
          employeeCode: "S001",
          values: { "5: Days": 26, "6: Basic": 12000, "7: PF": 1440, "8: Basic": 500 },
        },
        {
          rowNumber: 5,
          employeeCode: "S002",
          values: { "5: Days": 24.5, "6: Basic": 9000, "8: Basic": 0 },
        },
      ],
    });
  });

  it("reports duplicates, non-numeric values and figures without a code", () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ["Emp Code", "Name", "Basic"],
        ["S001", "A", 100],
        ["S001", "B", "n/a"],
        ["", "", 50],
      ]),
      "S"
    );
    const matrix = readSheetMatrix(book, "S");
    const extracted = extractSheetRows(matrix, 1);
    const columns = buildHistoryColumns(extracted, matrix.rows[0]);
    const preview = buildHistoryPreview(extracted, columns, "Emp Code", ["Basic"]);
    expect(preview.rows).toHaveLength(1);
    expect(preview.errors.map((issue) => issue.rowNumber)).toEqual([3, 3, 4]);
    expect(preview.errors[0].message).toMatch(/Duplicate Employee Code/);
    expect(preview.errors[1].message).toMatch(/not a number/);
    expect(preview.errors[2].message).toMatch(/no Employee Code/);
  });
});

describe("PayrollHistoryImportDialog", () => {
  beforeEach(() => {
    mocks.importHistory.mockReset();
    mocks.importHistory.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({ id: "h1", year: 2099, month: 1, employeeCount: 2, importedAt: "" }),
    }));
  });

  it("requires explicit columns, period and confirmation before archiving", async () => {
    const onImported = vi.fn();
    const { container } = render(
      <PayrollHistoryImportDialog open onOpenChange={vi.fn()} onImported={onImported} />
    );
    const user = await uploadSynthetic(container);

    await screen.findByText(/Payroll value columns to archive/);
    expect((screen.getByLabelText("Header row") as HTMLSelectElement).value).toBe("3");
    expect((screen.getByLabelText("Employee Code column") as HTMLSelectElement).value).toBe(
      "Emp Code"
    );
    const archive = screen.getByRole("button", { name: /Archive payroll history/ });
    expect(archive).toBeDisabled();
    expect(screen.queryByRole("checkbox", { name: "3: Name" })).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: "6: Basic" }));
    expect(screen.getByTestId("unselected-columns").textContent).toContain("7: PF");
    await user.click(screen.getByRole("checkbox", { name: "7: PF" }));

    expect(archive).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Payroll month"), "1");
    await user.type(screen.getByLabelText("Payroll year"), "2099");
    expect(archive).toBeDisabled();
    await user.click(screen.getByLabelText("Confirm period"));
    expect(archive).toBeEnabled();

    await user.click(archive);
    await waitFor(() => expect(onImported).toHaveBeenCalledWith("h1"));
    expect(mocks.importHistory).toHaveBeenCalledWith({
      year: 2099,
      month: 1,
      rows: [
        { rowNumber: 4, employeeCode: "S001", values: { "6: Basic": 12000, "7: PF": 1440 } },
        { rowNumber: 5, employeeCode: "S002", values: { "6: Basic": 9000 } },
      ],
    });
  });

  it("shows the atomic rejection message from the server", async () => {
    mocks.importHistory.mockImplementation(() => ({
      unwrap: () =>
        Promise.reject({ data: { message: "Payroll history already exists for 1/2099" } }),
    }));
    const { container } = render(<PayrollHistoryImportDialog open onOpenChange={vi.fn()} />);
    const user = await uploadSynthetic(container);
    await user.click(await screen.findByRole("checkbox", { name: "6: Basic" }));
    await user.selectOptions(screen.getByLabelText("Payroll month"), "1");
    await user.type(screen.getByLabelText("Payroll year"), "2099");
    await user.click(screen.getByLabelText("Confirm period"));
    await user.click(screen.getByRole("button", { name: /Archive payroll history/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("already exists");
  });
});
