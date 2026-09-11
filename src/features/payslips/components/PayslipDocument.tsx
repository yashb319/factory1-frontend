"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EMPLOYEE_INFO_FIELD_OPTIONS } from "../../payslip-templates/types/payslipTemplate.types";
import type { PayslipTemplateData } from "../../payslip-templates/types/payslipTemplate.types";
import { resolveField, formatFieldValue } from "../utils/payslipData.utils";
import { amountToIndianWords } from "../utils/numberToWords";

export interface PayslipDocumentModel {
  templateData: PayslipTemplateData;
  payslipData: unknown;
  payPeriodMonth: number;
  payPeriodYear: number;
}

interface Props {
  payslip: PayslipDocumentModel;
  /**
   * "page" renders the full-screen standalone document used by the public
   * share-link viewer; "embedded" renders only the document card so it can be
   * placed inside another surface such as the admin payslip dialog.
   */
  variant?: "page" | "embedded";
}

export function PayslipDocument({ payslip, variant = "page" }: Props) {
  const { templateData, payslipData } = payslip;
  const data = (payslipData ?? {}) as Record<string, unknown>;

  const netSalary = Number(resolveField(data, templateData.netPay.field) ?? 0);

  const document = (
    <div className="rounded-xl border bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-lg font-semibold">
            {String(resolveField(data, "organization.name") ?? "Organization")}
          </h1>
          <p className="text-sm text-slate-500">
            {String(resolveField(data, "organization.address") ?? "")}
          </p>
        </div>
        <p className="text-sm text-slate-500">
          Pay period: {payslip.payPeriodMonth}/{payslip.payPeriodYear}
        </p>
      </header>

      <section className="mt-4 grid gap-2 border-b pb-4 text-sm sm:grid-cols-2">
        {templateData.employeeInfo.fields.map((field) => (
          <div key={field} className="flex justify-between gap-4">
            <span className="text-slate-500">{fieldLabel(field)}</span>
            <span className="font-medium">
              {String(resolveField(data, field) ?? "-")}
            </span>
          </div>
        ))}
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <RowsTable title="Earnings" rows={templateData.earnings.rows} data={data} />
        <RowsTable title="Deductions" rows={templateData.deductions.rows} data={data} />
      </div>

      {templateData.employerContributions.rows.length > 0 && (
        <div className="mt-4">
          <RowsTable
            title="Employer contributions (informational, not deducted)"
            rows={templateData.employerContributions.rows}
            data={data}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-4">
        <span className="text-sm font-semibold">Net Pay</span>
        <span className="text-lg font-bold">{formatFieldValue(netSalary)}</span>
      </div>

      {templateData.netPay.amountInWords && (
        <p className="mt-2 text-xs text-slate-500">
          Amount in words: {amountToIndianWords(netSalary)}
        </p>
      )}

      {templateData.signatureBlock.showSignature && (
        <footer className="mt-8 border-t pt-4 text-xs text-slate-500">
          {templateData.signatureBlock.text}
        </footer>
      )}
    </div>
  );

  if (variant === "embedded") {
    return <div className="w-full max-w-2xl">{document}</div>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex justify-end print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        {document}
      </div>
    </main>
  );
}

function RowsTable({
  title,
  rows,
  data,
}: {
  title: string;
  rows: { label: string; field: string }[];
  data: Record<string, unknown>;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.field} className="flex justify-between gap-4">
            <span className="text-slate-500">{row.label}</span>
            <span>{formatFieldValue(resolveField(data, row.field))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fieldLabel(field: string): string {
  return (
    EMPLOYEE_INFO_FIELD_OPTIONS.find((option) => option.value === field)?.label ?? field
  );
}
