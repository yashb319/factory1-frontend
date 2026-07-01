"use client";

import { useRef } from "react";
import { Download, Printer } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  PayrollItemResponse,
  PayrollRunDetailsResponse,
} from "../types/payroll.types";
import { formatCurrency, getMonthName } from "../utils/payroll.utils";

interface Props {
  open: boolean;
  payroll?: PayrollRunDetailsResponse;
  item?: PayrollItemResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function PayrollPayslipDialog({
  open,
  payroll,
  item,
  onOpenChange,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!payroll || !item) return null;

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const content = printRef.current?.innerText ?? "";
    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `payslip-${item?.employeeCode}-${payroll?.payrollMonth}-${payroll?.payrollYear}.txt`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Employee Payslip</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>

          <Button onClick={handleDownload}>
            <Download className="mr-2 size-4" />
            Download
          </Button>
        </div>

        <div
          ref={printRef}
          className="rounded-xl border bg-white p-6 text-sm print:border-none"
        >
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold">Factory1 Payslip</h2>
            <p className="text-slate-500">
              {getMonthName(payroll.payrollMonth)} {payroll.payrollYear}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Info label="Employee Name" value={item.employeeName} />
            <Info label="Employee Code" value={item.employeeCode} />
            <Info label="Salary Type" value={item.salaryType} />
            <Info label="Base Salary" value={formatCurrency(item.baseSalary)} />
            <Info label="Working Days" value={item.totalWorkingDays} />
            <Info label="Present Days" value={item.presentDays} />
            <Info label="Total Hours" value={item.totalHours} />
            <Info label="Overtime Hours" value={item.overtimeHours} />
          </div>

          <div className="mt-6 rounded-xl border">
            <div className="grid grid-cols-2 border-b p-3">
              <span>Gross Salary</span>
              <span className="text-right font-medium">
                {formatCurrency(item.grossSalary)}
              </span>
            </div>

            <div className="grid grid-cols-2 border-b p-3">
              <span>Overtime Amount</span>
              <span className="text-right font-medium">
                {formatCurrency(item.overtimeAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 border-b p-3">
              <span>Deductions</span>
              <span className="text-right font-medium">
                {formatCurrency(item.deductions)}
              </span>
            </div>

            <div className="grid grid-cols-2 bg-slate-50 p-3 text-base font-semibold">
              <span>Net Salary</span>
              <span className="text-right">
                {formatCurrency(item.netSalary)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value ?? "-"}</p>
    </div>
  );
}