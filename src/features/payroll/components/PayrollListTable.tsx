"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  PageResponse,
  PayrollRunSummaryResponse,
} from "../types/payroll.types";

import {
  formatCurrency,
  getMonthName,
} from "../utils/payroll.utils";

import { PayrollActions } from "./PayrollActions";
import { PayrollStatusChip } from "./PayrollStatusChip";

interface Props {
  data?: PageResponse<PayrollRunSummaryResponse>;
  isLoading?: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onApprove: (id: string) => void;
  onPay: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PayrollListTable({
  data,
  isLoading,
  page,
  onPageChange,
  onView,
  onApprove,
  onPay,
  onDelete,
}: Props) {
  const rows = data?.content ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payroll Month</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Gross Amount</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Deductions</TableHead>
            <TableHead>Net Amount</TableHead>
            <TableHead>Generated At</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                Loading payroll runs...
              </TableCell>
            </TableRow>
          )}

          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No payroll runs found.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {getMonthName(row.payrollMonth)} {row.payrollYear}
                </TableCell>

                <TableCell>
                  <PayrollStatusChip status={row.status} />
                </TableCell>

                <TableCell>{row.totalEmployees}</TableCell>

                <TableCell>{formatCurrency(row.grossAmount)}</TableCell>

                <TableCell>{formatCurrency(row.overtimeAmount)}</TableCell>

                <TableCell>{formatCurrency(row.deductionAmount)}</TableCell>

                <TableCell className="font-semibold">
                  {formatCurrency(row.netAmount)}
                </TableCell>

                <TableCell>
                  {row.generatedAt
                    ? new Date(row.generatedAt).toLocaleString("en-IN")
                    : "-"}
                </TableCell>

                <TableCell>
                  <PayrollActions
                    payroll={row}
                    onView={() => onView(row.id)}
                    onApprove={() => onApprove(row.id)}
                    onPay={() => onPay(row.id)}
                    onDelete={() => onDelete(row.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <p className="text-sm text-slate-500">
          Page {data ? data.page + 1 : page + 1} of {data?.totalPages ?? 1}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!data || page + 1 >= data.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}