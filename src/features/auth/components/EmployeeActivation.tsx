"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Factory, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActivateEmployeeMutation } from "../authApi";
import { setCredentials } from "../authSlice";
import { useAppDispatch } from "@/lib/hook";

export function EmployeeActivation() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activate, { isLoading, isSuccess }] = useActivateEmployeeMutation();
  const token = params.get("token") ?? "";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    try {
      const response = await activate({ token, password }).unwrap();
      dispatch(setCredentials({ token: response.token, user: response.user }));
      toast.success("Your employee account is active.");
      router.replace("/leave");
    } catch {
      toast.error("This activation link is invalid or has expired.");
    }
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
            <p className="text-xs text-slate-500">Employee account activation</p>
          </div>
        </div>
        {isSuccess ? (
          <div className="mt-8 space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="text-xl font-semibold">Account activated</h2>
            <p className="text-sm text-slate-500">Taking you to your employee workspace…</p>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div>
              <h2 className="text-xl font-semibold">Set your password</h2>
              <p className="mt-1 text-sm text-slate-500">Use at least 8 characters to activate your account.</p>
            </div>
            {!token && <p className="text-sm font-medium text-red-600">Activation token is missing.</p>}
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Password
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Confirm password
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
            <Button className="w-full" type="submit" disabled={!token || isLoading}>
              {isLoading ? "Activating…" : "Activate account"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
