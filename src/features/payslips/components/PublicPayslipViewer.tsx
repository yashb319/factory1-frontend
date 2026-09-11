"use client";

import { useEffect, useRef, useState } from "react";
import { Factory, Lock, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAccessPublicPayslipMutation } from "../api/publicPayslipApi";
import { PublicPayslipResponse } from "../types/payslip.types";
import { EMPLOYEE_INFO_FIELD_OPTIONS } from "../../payslip-templates/types/payslipTemplate.types";
import { resolveField, formatFieldValue } from "../utils/payslipData.utils";
import { amountToIndianWords } from "../utils/numberToWords";

interface Props {
  token: string;
}

export function PublicPayslipViewer({ token }: Props) {
  const [access, { isLoading }] = useAccessPublicPayslipMutation();
  const [payslip, setPayslip] = useState<PublicPayslipResponse | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;
    attemptAccess().finally(() => setHasAttempted(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function attemptAccess(withPassword?: string) {
    setError(null);
    try {
      const response = await access({
        token,
        body: { password: withPassword || undefined },
      }).unwrap();
      setPayslip(response.data);
      setNeedsPassword(false);
    } catch {
      setPayslip(null);
      setNeedsPassword(true);
      setError(
        "This link is invalid or has expired, or it may require a password. Enter a password below if you have one and try again."
      );
    }
  }

  if (payslip) {
    return <PayslipDocument payslip={payslip} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Factory size={22} />
          </div>
          <div>
            <h1 className="font-semibold">Factory1</h1>
            <p className="text-xs text-slate-500">Secure payslip</p>
          </div>
        </div>

        {isLoading && !hasAttempted ? (
          <p className="mt-8 text-sm text-slate-500">Loading payslip...</p>
        ) : (
          <div className="mt-8 space-y-4">
            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}
            {needsPassword && (
              <>
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    Password
                  </span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <Button
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => attemptAccess(password)}
                >
                  {isLoading ? "Checking..." : "View payslip"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function PayslipDocument({ payslip }: { payslip: PublicPayslipResponse }) {
  const { templateData, payslipData } = payslip;
  const data = payslipData as Record<string, unknown>;

  const netSalary = Number(resolveField(data, templateData.netPay.field) ?? 0);

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex justify-end print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

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
