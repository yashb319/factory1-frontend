"use client";

import { useState } from "react";
import { Copy, Link2, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { useCreatePayslipShareLinkMutation } from "../api/payslipApi";
import { PayslipShareLinkResponse } from "../types/payslip.types";

interface Props {
  payslipId: string;
  defaultExpiryDays: number;
  defaultMaxViews?: number | null;
  defaultPasswordRequired: boolean;
}

export function ShareLinkPanel({
  payslipId,
  defaultExpiryDays,
  defaultMaxViews,
  defaultPasswordRequired,
}: Props) {
  const [createShareLink, { isLoading }] = useCreatePayslipShareLinkMutation();

  const [expanded, setExpanded] = useState(false);
  const [expiryDays, setExpiryDays] = useState(String(defaultExpiryDays));
  const [maxViews, setMaxViews] = useState(
    defaultMaxViews != null ? String(defaultMaxViews) : ""
  );
  const [passwordRequired, setPasswordRequired] = useState(defaultPasswordRequired);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<PayslipShareLinkResponse | null>(null);

  async function handleCreate() {
    if (passwordRequired && !password.trim()) {
      toast.error("Enter a password, or turn off password protection");
      return;
    }

    try {
      const response = await createShareLink({
        id: payslipId,
        body: {
          expiryDays: expiryDays ? Number(expiryDays) : undefined,
          maxViews: maxViews ? Number(maxViews) : undefined,
          passwordRequired,
          password: passwordRequired ? password : undefined,
        },
      }).unwrap();

      setResult(response.data);
      setPassword("");
      toast.success("Secure share link created");
    } catch {
      toast.error("Could not create share link");
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    toast.success("Link copied to clipboard");
  }

  if (result) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            This link is shown only once and cannot be retrieved again — copy and share it now.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Input readOnly value={result.url} className="bg-white font-mono text-xs" />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-amber-800">
          <div>
            <dt className="font-medium">Expires</dt>
            <dd>{new Date(result.expiresAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="font-medium">Max views</dt>
            <dd>{result.maxViews ?? "Unlimited"}</dd>
          </div>
          <div>
            <dt className="font-medium">Password</dt>
            <dd>{result.passwordRequired ? "Required" : "Not required"}</dd>
          </div>
        </dl>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => {
            setResult(null);
            setExpanded(false);
          }}
        >
          Create another link
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold">Share securely</h3>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide options" : "Customize"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Generates a tokenized, password-optional link an employee can use to view this payslip without
        signing in.
      </p>

      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-700">
              Expiry (days)
              <Input
                type="number"
                min={1}
                value={expiryDays}
                onChange={(event) => setExpiryDays(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              Max views (blank = unlimited)
              <Input
                type="number"
                min={1}
                value={maxViews}
                onChange={(event) => setMaxViews(event.target.value)}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <Checkbox
              checked={passwordRequired}
              onCheckedChange={(checked) => setPasswordRequired(Boolean(checked))}
            />
            Require a password to view
          </label>

          {passwordRequired && (
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Password
              </span>
              <Input
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Shared with the employee separately"
              />
            </label>
          )}
        </div>
      )}

      <Button type="button" className="mt-3" disabled={isLoading} onClick={handleCreate}>
        {isLoading ? "Creating link..." : "Create secure link"}
      </Button>
    </section>
  );
}
