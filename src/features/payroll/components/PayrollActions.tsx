"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PayrollRunSummaryResponse } from "../types/payroll.types";
import { useRuntimePermissions } from "@/features/partner-saas/runtime/permissions";

interface Props {
  payroll: PayrollRunSummaryResponse;
  onView: () => void;
  onApprove: () => void;
  onPay: () => void;
  onDelete: () => void;
}

export function PayrollActions({
  payroll,
  onView,
  onApprove,
  onPay,
  onDelete,
}: Props) {
  const { can } = useRuntimePermissions();
  const canApprove = payroll.status === "GENERATED" && can("PUT", `/api/payroll/${payroll.id}/approve`);
  const canPay = payroll.status === "APPROVED" && can("PUT", `/api/payroll/${payroll.id}/pay`);
  const canDelete = payroll.status === "GENERATED" && can("DELETE", `/api/payroll/${payroll.id}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          View details
        </DropdownMenuItem>

        {canApprove && (
          <DropdownMenuItem onClick={onApprove}>
            Approve payroll
          </DropdownMenuItem>
        )}

        {canPay && (
          <DropdownMenuItem onClick={onPay}>
            Mark as paid
          </DropdownMenuItem>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={onDelete}
            >
              Delete payroll
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}