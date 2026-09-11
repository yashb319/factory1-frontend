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
import { formatCurrency } from "../utils/payroll.utils";

import {
  PayrollItemResponse,
  PayrollRunDetailsResponse,
} from "../types/payroll.types";
import { buildPayslipHtml } from "../utils/payrollPayslipHtml.utils";
import {
  downloadPayslipJpgFromHtml,
  getPayslipFileName,
  printPayslipFromHtml,
} from "../utils/payrollPayslipDownload.utils";
import { useGetOrganizationSettingsQuery } from "@/features/organization-settings/api/organizationSettingsApi";
import { useGetPayslipsForEmployeeQuery } from "@/features/payslips/api/payslipApi";
import { ShareLinkPanel } from "@/features/payslips/components/ShareLinkPanel";
import { PayslipDocument } from "@/features/payslips/components/PayslipDocument";
import { buildTemplatePayslipHtml } from "@/features/payslips/utils/payslipTemplateHtml.utils";
import { useGetPayslipTemplateQuery } from "@/features/payslip-templates/api/payslipTemplateApi";

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

  const { data: orgSettings } = useGetOrganizationSettingsQuery();
  const { data: payslips } = useGetPayslipsForEmployeeQuery(
    item?.employeeId ?? "",
    { skip: !item?.employeeId }
  );

  const matchingPayslip = payslips?.data?.find(
    (payslip) => payslip.payrollItemId === item?.id
  );

  const { data: template } = useGetPayslipTemplateQuery(
    matchingPayslip?.templateId ?? "",
    { skip: !matchingPayslip?.templateId }
  );

  const templatePayslip = useMemo(() => {
    if (!matchingPayslip || !template?.data?.templateData) return null;
    return {
      templateData: template.data.templateData,
      payslipData: matchingPayslip.payslipData,
      payPeriodMonth: matchingPayslip.payPeriodMonth,
      payPeriodYear: matchingPayslip.payPeriodYear,
    };
  }, [matchingPayslip, template]);

  const payslipHtml = useMemo(() => {
    if (templatePayslip) return buildTemplatePayslipHtml(templatePayslip);
    if (!payroll || !item) return "";
    return buildPayslipHtml(payroll, item);
  }, [templatePayslip, payroll, item]);

  if (!payroll || !item) return null;

  const shareLinkEnabled = Boolean(orgSettings?.data.payslipShareLinkEnabled);

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadPayslipJpgFromHtml(
        payslipHtml,
        getPayslipFileName(payroll!, item!)
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    setLoading(true);
    try {
      await printPayslipFromHtml(payslipHtml);
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
          <StatutoryBreakdown item={item} />
          {shareLinkEnabled && matchingPayslip && (
            <div className="mb-4">
              <ShareLinkPanel
                payslipId={matchingPayslip.id}
                defaultExpiryDays={orgSettings?.data.payslipLinkExpiryDays ?? 30}
                defaultMaxViews={orgSettings?.data.payslipMaxViews}
                defaultPasswordRequired={Boolean(
                  orgSettings?.data.payslipPasswordRequired
                )}
              />
            </div>
          )}
          <div className="flex justify-center">
            {templatePayslip ? (
              <PayslipDocument payslip={templatePayslip} variant="embedded" />
            ) : (
              <iframe
                title="Payslip Preview"
                srcDoc={payslipHtml}
                className="h-[760px] w-full rounded-xl border bg-white"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatutoryBreakdown({ item }: { item: PayrollItemResponse }) {
  const calculation = item.statutoryCalculation;
  const hasStatutoryData =
    Boolean(calculation) ||
    [item.employeePf, item.voluntaryPf, item.tds].some(
      (value) => value !== null && value !== undefined && value !== 0
    );

  if (!hasStatutoryData) return null;

  return (
    <section className="mb-4 rounded-xl border bg-slate-50 p-4">
      <h3 className="text-sm font-semibold">Statutory deductions</h3>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <Amount label="Employee PF" value={item.employeePf} />
        <Amount label="Voluntary PF" value={item.voluntaryPf} />
        <Amount label="TDS" value={item.tds} />
      </div>

      {calculation && (
        <details className="mt-4 rounded-lg border bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium">
            View calculation
          </summary>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <BreakdownGroup
              title="PF calculation"
              rows={[
                ["PF wages", calculation.pfWages],
                ["Employee PF", calculation.employeePf],
                ["Voluntary PF", calculation.voluntaryPf],
              ]}
            />
            <BreakdownGroup
              title="Employer cost (does not affect net pay)"
              rows={[
                ["Employer PF", calculation.employerPf],
                ["Employer EPF", calculation.employerEpf],
                ["EPS", calculation.eps],
                ["EDLI", calculation.edli],
                ["Admin charge", calculation.adminCharge],
              ]}
            />
            <BreakdownGroup
              title="TDS calculation"
              rows={[
                ["Projected annual income", calculation.projectedAnnualIncome],
                ["Taxable income", calculation.taxableIncome],
                ["Base tax", calculation.baseTax],
                ["Annual tax", calculation.annualTax],
                ["Tax already deducted", calculation.taxAlreadyDeducted],
                ["Current month TDS", calculation.currentMonthTds],
              ]}
            />
          </div>
        </details>
      )}
    </section>
  );
}

function Amount({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex justify-between rounded-md border bg-white px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatCurrency(value ?? 0)}</span>
    </div>
  );
}

function BreakdownGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, number]>;
}) {
  return (
    <div>
      <h4 className="mb-2 font-medium">{title}</h4>
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div className="flex justify-between gap-4" key={label}>
            <span className="text-muted-foreground">{label}</span>
            <span>{formatCurrency(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}