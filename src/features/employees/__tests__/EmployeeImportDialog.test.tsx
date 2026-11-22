import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as XLSX from "xlsx";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmployeeImportDialog } from "../components/EmployeeImportDialog";

// jsdom's Blob has no arrayBuffer(); read through FileReader instead.
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

const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  importEmployees: vi.fn(),
  logDataJob: vi.fn(),
  push: vi.fn(),
  employeesQuery: { data: { content: [] } },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

vi.mock("@/features/import-export/hooks/useLogDataJob", () => ({
  useLogDataJob: () => mocks.logDataJob,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

// Native <select> stand-in for Radix Select so options are easy to drive.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
  }) => (
    <select value={value ?? ""} onChange={(event) => onValueChange?.(event.target.value)}>
      <option value="">—</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("../api/employeeApi", () => ({
  useGetEmployeesQuery: () => mocks.employeesQuery,
  usePreviewEmployeeImportMutation: () => [mocks.preview, { isLoading: false }],
  useImportEmployeesMutation: () => [mocks.importEmployees, { isLoading: false }],
}));

// Synthetic workbook: title rows, header on row 4, blank and total rows.
function syntheticFile() {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["Test Factory"],
      ["Wages 01/2099"],
      [],
      ["Sr No", "Emp Code", "Name of Employee", "UAN No", "Basic", "Net Pay"],
      [1, "T001", "Alpha Tester", 100000000001, 12000, 11000],
      [2, "T002", "Beta Tester", "", 9000, 8500],
      [],
      ["", "Total", "", "", 21000, 19500],
    ]),
    "Wages"
  );
  const data = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([data], "synthetic.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function selectWithOption(text: string) {
  const option = screen
    .getAllByRole("option")
    .find((candidate) => candidate.textContent === text);
  if (!option) throw new Error(`No option ${text}`);
  return option.closest("select") as HTMLSelectElement;
}

describe("EmployeeImportDialog", () => {
  beforeEach(() => {
    mocks.preview.mockReset();
    mocks.importEmployees.mockReset();
    mocks.logDataJob.mockReset();
    mocks.preview.mockImplementation(() => {
      const promise = Promise.resolve({
        totalRows: 2,
        validRows: 1,
        invalidRows: 1,
        rows: [
          { rowNumber: 5, existingCodeOutcome: "NEW", errors: ["Salary type is required"] },
          {
            rowNumber: 6,
            employeeCode: "T002",
            existingCodeOutcome: "CONFLICT",
            errors: ["Employee code already exists; existingCodeResolution required"],
          },
        ],
      });
      return { unwrap: () => promise, abort: vi.fn() };
    });
    mocks.importEmployees.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          createdRows: 0,
          updatedRows: 1,
          skippedRows: 0,
          rows: [{ rowNumber: 6, existingCodeOutcome: "UPDATE", errors: [] }],
          errors: [],
        }),
    });
  });

  it("requires explicit salary choices, preserves row numbers and logs metadata only", async () => {
    const user = userEvent.setup();
    const { container } = render(<EmployeeImportDialog open onOpenChange={vi.fn()} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, syntheticFile());

    await screen.findByText(/Complete the mapping to validate/);
    expect(screen.getByText(/Row 8: Total \/ summary row/)).toBeInTheDocument();
    expect(screen.getByText(/Historical\s+payroll earnings and deductions are/)).toBeInTheDocument();
    expect(mocks.preview).not.toHaveBeenCalled();

    await user.selectOptions(selectWithOption("Not in this file"), SALARY_NOT_IN_FILE_VALUE);
    const typeSelect = selectWithOption("All rows: MONTHLY");
    await user.selectOptions(typeSelect, SALARY_NOT_IN_FILE_VALUE);

    await waitFor(() => expect(mocks.preview).toHaveBeenCalled());
    const sent = mocks.preview.mock.calls.at(-1)?.[0];
    expect(sent).toEqual([
      { rowNumber: 5, employeeCode: "T001", name: "Alpha Tester", uan: "100000000001" },
      { rowNumber: 6, employeeCode: "T002", name: "Beta Tester" },
    ]);

    await screen.findByText(/required to create a new employee/);
    expect(screen.getByText(/existing employee's salary is kept/)).toBeInTheDocument();
    expect(screen.queryByText("100000000001")).not.toBeInTheDocument();
    expect(screen.getByText("••••••••0001")).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: /Confirm Import/ });
    expect(confirm).toBeDisabled();

    const conflictRow = screen.getByText(/Row 6:/).parentElement as HTMLElement;
    await user.selectOptions(within(conflictRow).getByRole("combobox"), "UPDATE");

    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);

    await waitFor(() => expect(mocks.importEmployees).toHaveBeenCalled());
    expect(mocks.importEmployees.mock.calls[0][0]).toEqual([
      {
        rowNumber: 6,
        employeeCode: "T002",
        name: "Beta Tester",
        existingCodeResolution: "UPDATE",
      },
    ]);

    await waitFor(() => expect(mocks.logDataJob).toHaveBeenCalled());
    const logged = JSON.stringify(mocks.logDataJob.mock.calls[0][0]);
    expect(logged).not.toMatch(/Tester|T00|100000000001/);
    expect(mocks.logDataJob.mock.calls[0][0].parameters).toMatchObject({
      sheetName: "Wages",
      headerRowNumber: 4,
      errorRowNumbers: [5],
      skippedRowNumbers: [8],
    });
  });
});

const SALARY_NOT_IN_FILE_VALUE = "__NOT_IN_FILE__";
