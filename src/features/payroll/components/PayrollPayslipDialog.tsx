"use client";

import { Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";

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
import { buildPayslipHtml } from "../utils/payrollPayslipHtml.utils";
import {
  downloadPayslipJpg,
  printPayslip,
} from "../utils/payrollPayslipDownload.utils";

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
  const [loading, setLoading] = useState(false);

  const payslipHtml = useMemo(() => {
    if (!payroll || !item) return "";
    return buildPayslipHtml(payroll, item);
  }, [payroll, item]);

  if (!payroll || !item) return null;

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadPayslipJpg(payroll!, item!);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    setLoading(true);
    try {
      await printPayslip(payroll!, item!);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle>Employee Payslip</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-2 border-b pb-3">
          <Button variant="outline" disabled={loading} onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>

          <Button disabled={loading} onClick={handleDownload}>
            <Download className="mr-2 size-4" />
            Download JPG
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex justify-center">
            <iframe
              title="Payslip Preview"
              srcDoc={payslipHtml}
              className="h-[760px] w-[820px] rounded-xl border bg-white"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}