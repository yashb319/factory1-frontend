"use client";

import { useEffect, useRef, useState } from "react";
import { Factory, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAccessPublicPayslipMutation } from "../api/publicPayslipApi";
import { PublicPayslipResponse } from "../types/payslip.types";
import { PayslipDocument } from "./PayslipDocument";

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
