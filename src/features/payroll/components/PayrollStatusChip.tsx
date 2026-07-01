"use client";

import { Badge } from "@/components/ui/badge";
import { PayrollStatus } from "../types/payroll.types";
import { getPayrollStatusLabel } from "../utils/payroll.utils";

interface Props {
  status: PayrollStatus;
}

export function PayrollStatusChip({ status }: Props) {
  const variant =
    status === "PAID"
      ? "default"
      : status === "APPROVED"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{getPayrollStatusLabel(status)}</Badge>;
}