"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useGetPayrollRunByIdQuery } from "../api/payrollApi";
import { PayrollItemResponse } from "../types/payroll.types";

import { formatCurrency, getMonthName } from "../utils/payroll.utils";
import { exportPayrollCsv } from "../utils/payrollExport.utils";
import { downloadAllPayslipsZip } from "../utils/payrollPayslipDownload.utils";

import { PayrollStatusChip } from "./PayrollStatusChip";
import { PayrollPayslipDialog } from "./PayrollPayslipDialog";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";

interface Props {
  payrollId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollDetailsDialog({
  payrollId,
  open,
  onOpenChange,
}: Props) {
  const [selectedPayslip, setSelectedPayslip] =
    useState<PayrollItemResponse | null>(null);

  const [downloadingAll, setDownloadingAll] = useState(false);
  const logDataJob = useLogDataJob();

  const { data, isLoading } = useGetPayrollRunByIdQuery(payrollId!, {
    skip: !payrollId || !open,
  });

  async function handleDownloadAllPayslips() {
    if (!data) return;

    setDownloadingAll(true);

    try {
      await downloadAllPayslipsZip(data);
    } finally {
      setDownloadingAll(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Payroll Details</DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="mt-4 text-sm text-slate-500">
              Loading payroll details...
            </div>
          )}

          {!isLoading && data && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const exported = exportPayrollCsv(data);
                    void logDataJob({
                      operation: "EXPORT",
                      module: "PAYROLL",
                      fileName: exported.fileName,
                      status: "COMPLETED",
                      progress: 100,
                      totalRows: data.items?.length ?? 0,
                      successRows: data.items?.length ?? 0,
                      failedRows: 0,
                      outputFileUrl: exported.outputFileUrl,
                    });
                  }}
                >
                  <Download className="mr-2 size-4" />
                  Export CSV
                </Button>

                <Button
                  onClick={handleDownloadAllPayslips}
                  disabled={downloadingAll || !data.items?.length}
                >
                  <Download className="mr-2 size-4" />
                  {downloadingAll ? "Preparing..." : "Download All Payslips"}
                </Button>
              </div>

              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card label="Payroll Month">
                  {getMonthName(data.payrollMonth)} {data.payrollYear}
                </Card>

                <Card label="Status">
                  <PayrollStatusChip status={data.status} />
                </Card>

                <Card label="Employees">{data.totalEmployees}</Card>

                <Card label="Net Amount">
                  {formatCurrency(data.netAmount)}
                </Card>
              </div>

              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card label="Gross Amount">
                  {formatCurrency(data.grossAmount)}
                </Card>

                <Card label="Overtime Amount">
                  {formatCurrency(data.overtimeAmount)}
                </Card>

                <Card label="Deduction Amount">
                  {formatCurrency(data.deductionAmount)}
                </Card>

                <Card label="Generated At">
                  {data.generatedAt
                    ? new Date(data.generatedAt).toLocaleString("en-IN")
                    : "-"}
                </Card>
              </div>

              <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
                <Table className="responsive-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Salary Type</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Working Days</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>OT Hours</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>OT Amount</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead className="w-[120px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium" data-label="Employee">
                          {item.employeeName}
                        </TableCell>

                        <TableCell data-label="Code">{item.employeeCode}</TableCell>

                        <TableCell data-label="Salary Type">{item.salaryType}</TableCell>

                        <TableCell data-label="Base">{formatCurrency(item.baseSalary)}</TableCell>

                        <TableCell data-label="Working Days">{item.totalWorkingDays}</TableCell>

                        <TableCell data-label="Present">{item.presentDays}</TableCell>

                        <TableCell data-label="Hours">{item.totalHours}</TableCell>

                        <TableCell data-label="OT Hours">{item.overtimeHours}</TableCell>

                        <TableCell data-label="Gross">
                          {formatCurrency(item.grossSalary)}
                        </TableCell>

                        <TableCell data-label="OT Amount">
                          {formatCurrency(item.overtimeAmount)}
                        </TableCell>

                        <TableCell data-label="Deductions">
                          {formatCurrency(item.deductions)}
                        </TableCell>

                        <TableCell className="font-semibold" data-label="Net">
                          {formatCurrency(item.netSalary)}
                        </TableCell>

                        <TableCell data-label="Action">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPayslip(item)}
                          >
                            <FileText className="mr-2 size-4" />
                            Payslip
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {(!data.items || data.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center">
                          No payroll items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PayrollPayslipDialog
        open={!!selectedPayslip}
        payroll={data}
        item={selectedPayslip}
        onOpenChange={(value) => {
          if (!value) {
            setSelectedPayslip(null);
          }
        }}
      />
    </>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-3 sm:p-4">
      <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
      <div className="mt-1 text-xl font-semibold sm:text-2xl">{children}</div>
    </div>
  );
}
