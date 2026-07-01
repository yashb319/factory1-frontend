"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  valid: number;
  warning: number;
  invalid: number;
}

export function FileValidationSummary({
  valid,
  warning,
  invalid,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-green-600" />
          <div>
            <p className="text-2xl font-bold">{valid}</p>
            <p className="text-sm text-muted-foreground">
              Valid Rows
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-yellow-600" />
          <div>
            <p className="text-2xl font-bold">{warning}</p>
            <p className="text-sm text-muted-foreground">
              Warnings
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <XCircle className="text-red-600" />
          <div>
            <p className="text-2xl font-bold">{invalid}</p>
            <p className="text-sm text-muted-foreground">
              Invalid
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}