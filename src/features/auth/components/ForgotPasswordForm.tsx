"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useResetPasswordMutation,
  useSendForgotPasswordOtpMutation,
} from "../authApi";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [sendOtp, sendState] = useSendForgotPasswordOtpMutation();
  const [resetPassword, resetState] = useResetPasswordMutation();

  async function handleSendOtp() {
    if (!email.trim()) {
      toast.error("Enter your email");
      return;
    }

    try {
      await sendOtp({ email: email.trim().toLowerCase() }).unwrap();
      setOtpSent(true);
      toast.success("Password reset OTP sent");
    } catch {
      toast.error("Could not send reset OTP");
    }
  }

  async function handleReset() {
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6 digit OTP");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        password,
      }).unwrap();

      toast.success("Password reset successfully");
      router.push("/login");
    } catch {
      toast.error("Could not reset password");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Factory size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Factory1</h1>
            <p className="text-sm text-slate-500">Reset account password</p>
          </div>
        </div>

        <div className="space-y-5">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              disabled={otpSent}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@example.com"
            />
          </Field>

          {!otpSent ? (
            <Button
              type="button"
              onClick={handleSendOtp}
              disabled={sendState.isLoading}
              className="w-full"
            >
              <MailCheck className="mr-2 h-4 w-4" />
              {sendState.isLoading ? "Sending..." : "Send Reset OTP"}
            </Button>
          ) : (
            <>
              <Field label="OTP">
                <Input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6 digit code"
                />
              </Field>

              <Field label="New Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </Field>

              <Field label="Confirm Password">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendOtp}
                  disabled={sendState.isLoading}
                >
                  Resend
                </Button>
                <Button
                  type="button"
                  onClick={handleReset}
                  disabled={resetState.isLoading}
                  className="flex-1"
                >
                  {resetState.isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Remember password?{" "}
          <Link href="/login" className="font-medium text-blue-600">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
