import { render, screen, waitFor } from "@testing-library/react";
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

function syntheticComponentFile() {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["Emp Code", "Name", "Basic", "HRA", "Employer PF"],
      ["T101", "Gamma Tester", 12000, 3000, 500],
      ["T102", "Delta Tester", 9000, "", ""],
    ]),
    "Employees"
  );
  const data = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([data], "salary-components.xlsx", {
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

function selectsWithOptionValue(value: string) {
  return screen.getAllByRole("combobox").filter((select) =>
    Array.from((select as HTMLSelectElement).options).some(
      (option) => option.value === value
    )
  ) as HTMLSelectElement[];
}

describe("EmployeeImportDialog", () => {
  beforeEach(() => {
    mocks.preview.mockReset();
    mocks.importEmployees.mockReset();
    mocks.logDataJob.mockReset();
    mocks.preview.mockImplementation(() => {
      const promise = Promise.resolve({
        totalRows: 2,
        validRows: 2,
        invalidRows: 0,
        rows: [
          { rowNumber: 5, existingCodeOutcome: "NEW", errors: [] },
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

  it("allows salary omission, preserves row numbers and logs metadata only", async () => {
    const user = userEvent.setup();
    const { container } = render(<EmployeeImportDialog open onOpenChange={vi.fn()} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, syntheticFile());

    expect(screen.getByText(/Row 8: Total \/ summary row/)).toBeInTheDocument();
    expect(screen.getByText(/Historical\s+payroll earnings and deductions are/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.preview).toHaveBeenCalled());
    const sent = mocks.preview.mock.calls.at(-1)?.[0];
    expect(sent).toEqual([
      { rowNumber: 5, employeeCode: "T001", name: "Alpha Tester", uan: "100000000001" },
      { rowNumber: 6, employeeCode: "T002", name: "Beta Tester" },
    ]);

    expect(
      await screen.findAllByText(
        /new employees remain unconfigured and existing salary stays unchanged/
      )
    ).toHaveLength(2);
    expect(screen.queryByText("100000000001")).not.toBeInTheDocument();
    expect(screen.getByText("••••••••0001")).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: /Confirm Import/ });
    expect(confirm).toBeDisabled();

    const updateOption = screen.getByRole("option", {
      name: "Update this employee",
    });
    await user.selectOptions(
      updateOption.closest("select") as HTMLSelectElement,
      "UPDATE"
    );

    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);

    await waitFor(() => expect(mocks.importEmployees).toHaveBeenCalled());
    expect(mocks.importEmployees.mock.calls[0][0]).toEqual([
      {
        rowNumber: 5,
        employeeCode: "T001",
        name: "Alpha Tester",
        uan: "100000000001",
      },
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
      errorRowNumbers: [],
      skippedRowNumbers: [8],
    });
  });

  it("maps recurring components with explicit classifications and per-row amounts", async () => {
    const user = userEvent.setup();
    const { container } = render(<EmployeeImportDialog open onOpenChange={vi.fn()} />);
    mocks.preview.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          totalRows: 2,
          validRows: 2,
          invalidRows: 0,
          rows: [
            { rowNumber: 2, existingCodeOutcome: "NEW", errors: [] },
            { rowNumber: 3, existingCodeOutcome: "NEW", errors: [] },
          ],
        }),
      abort: vi.fn(),
    }));

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, syntheticComponentFile());
    await screen.findByText("2 employee rows");
    await user.selectOptions(
      selectWithOption("Monthly salary components"),
      "COMPONENTS"
    );
    await user.click(screen.getByRole("button", { name: "Add component mapping" }));
    await user.click(screen.getByRole("button", { name: "Add component mapping" }));
    await user.click(screen.getByRole("button", { name: "Add component mapping" }));

    const componentColumnSelects = selectsWithOptionValue("Employer PF");
    await user.selectOptions(componentColumnSelects[0], "Basic");
    await user.selectOptions(componentColumnSelects[1], "HRA");
    await user.selectOptions(componentColumnSelects[2], "Employer PF");
    await user.type(
      container.querySelector<HTMLInputElement>(
        "#employee-import-component-name-0"
      )!,
      "Basic Salary"
    );
    await user.type(
      container.querySelector<HTMLInputElement>(
        "#employee-import-component-name-1"
      )!,
      "HRA"
    );
    await user.type(
      container.querySelector<HTMLInputElement>(
        "#employee-import-component-name-2"
      )!,
      "Employer PF"
    );
    const componentTypeSelects = selectsWithOptionValue(
      "EMPLOYER_CONTRIBUTION"
    );
    await user.selectOptions(componentTypeSelects[0], "EARNING");
    await user.selectOptions(componentTypeSelects[1], "EARNING");
    await user.selectOptions(
      componentTypeSelects[2],
      "EMPLOYER_CONTRIBUTION"
    );
    await user.click(
      screen.getByText("Choose salary configuration per employee (2 rows)")
    );
    const rowSalaryChoices = selectsWithOptionValue("DEFAULT");
    await user.selectOptions(rowSalaryChoices[1], "LEGACY");
    const legacySalaryChoices = selectsWithOptionValue("__NOT_IN_FILE__");
    await user.selectOptions(legacySalaryChoices[0], "Basic");
    await user.selectOptions(legacySalaryChoices[1], "FIXED:MONTHLY");

    await user.click(
      screen.getByLabelText(
        /I confirm these columns contain recurring monthly compensation/
      )
    );

    expect(selectWithOption("Monthly salary components").value).toBe("COMPONENTS");
    expect(
      screen.queryByText("Complete the mapping to validate")
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.preview.mock.calls.at(-1)?.[0]?.[0]).toMatchObject({
        salaryConfigurationType: "COMPONENTS",
      });
    });
    const sent = mocks.preview.mock.calls.at(-1)?.[0];
    expect(sent).toEqual([
      {
        rowNumber: 2,
        employeeCode: "T101",
        name: "Gamma Tester",
        salaryConfigurationType: "COMPONENTS",
        salaryComponents: [
          { name: "Basic Salary", type: "EARNING", amount: 12000 },
          { name: "HRA", type: "EARNING", amount: 3000 },
          {
            name: "Employer PF",
            type: "EMPLOYER_CONTRIBUTION",
            amount: 500,
          },
        ],
      },
      {
        rowNumber: 3,
        employeeCode: "T102",
        name: "Delta Tester",
        salaryConfigurationType: "LEGACY",
        salaryRate: "9000",
        salaryType: "MONTHLY",
      },
    ]);
  });
});
