"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory, MailCheck, UserCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { AppForm, FormActions, TextField, PasswordField } from "@/components/forms";
import {
  AUTH_LAST_LOGIN_EMAIL_STORAGE_KEY,
  AUTH_LAST_LOGIN_NAME_STORAGE_KEY,
  setCredentials,
} from "../authSlice";
import { useLoginMutation, useSendLoginOtpMutation } from "../authApi";
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import { useAppDispatch } from "@/lib/hook";
import { getFactoryUiMode } from "@/lib/uiModePreference";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();
  const [sendLoginOtp, { isLoading: isSendingOtp }] = useSendLoginOtpMutation();
  const [otpRequired, setOtpRequired] = useState(false);
  const [savedEmail, setSavedEmail] = useState(() => getStoredLastEmail());
  const [savedName, setSavedName] = useState(() => getStoredLastName());

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: getStoredLastEmail(),
      password: "",
      otp: "",
    },
  });

  const email = useWatch({
    control: form.control,
    name: "email",
  }) ?? "";

  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await login({
        ...values,
        email: values.email.trim().toLowerCase(),
        otp: values.otp || undefined,
      }).unwrap();

      dispatch(
        setCredentials({
          token: response.token,
          user: response.user ?? null,
        })
      );

      const landingRoute = response.user?.platformAdmin
        ? "/saas-admin"
        : getFactoryUiMode(response.user ?? null) === "tally"
          ? "/gateway"
          : "/dashboard";
      router.push(landingRoute);
    } catch (caughtError) {
      if (isLoginOtpRequired(caughtError)) {
        setOtpRequired(true);
        await handleSendOtp(values.email);
        return;
      }

      throw caughtError;
    }
  }

  async function handleSendOtp(emailOverride = email) {
    const normalizedEmail = emailOverride.trim().toLowerCase();

    if (!normalizedEmail) {
      form.setError("email", {
        type: "manual",
        message: "Enter your email first",
      });
      return;
    }

    try {
      await sendLoginOtp({ email: normalizedEmail }).unwrap();
      toast.success("Login OTP sent to your email");
    } catch {
      toast.error("Could not send login OTP");
    }
  }

  function switchAccount() {
    setOtpRequired(false);
    setSavedEmail("");
    setSavedName("");
    localStorage.removeItem(AUTH_LAST_LOGIN_EMAIL_STORAGE_KEY);
    localStorage.removeItem(AUTH_LAST_LOGIN_NAME_STORAGE_KEY);
    form.reset({
      email: "",
      password: "",
      otp: "",
    });
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <section className="hidden flex-1 bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-white/70">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Factory size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Factory1</h1>
            <p className="text-sm text-slate-400">Run your factory smarter.</p>
          </div>
        </Link>

        <div>
          <h2 className="max-w-lg text-4xl font-semibold tracking-tight">
            Your factory operations, payroll, attendance and AI insights in one
            place.
          </h2>
          <p className="mt-4 max-w-md text-sm text-slate-400">
            Built for small and mid-sized factories that want clarity without ERP
            complexity.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Login to your Factory1 workspace.
          </p>

          {savedEmail && (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                  <UserCircle size={22} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    Continue as {savedName || savedEmail}
                  </p>
                  <p className="truncate text-xs text-slate-500">{savedEmail}</p>
                </div>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={switchAccount}>
                Switch
              </Button>
            </div>
          )}

          <div className="mt-8">
            <AppForm form={form} onSubmit={onSubmit}>
              <TextField<LoginFormValues>
                name="email"
                label="Email"
                placeholder="owner@example.com"
                required
              />

              <PasswordField<LoginFormValues>
                name="password"
                label="Password"
                placeholder="Enter password"
                required
              />

              {otpRequired && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-950">
                    Extra verification required
                  </p>
                  <p className="text-xs leading-5 text-amber-800">
                    This account has not logged in recently. Enter the OTP sent to your email.
                  </p>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <TextField<LoginFormValues>
                        name="otp"
                        label="Email OTP"
                        placeholder="6 digit code"
                        required
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSendOtp()}
                      disabled={isSendingOtp}
                      className="mb-[1px]"
                    >
                      <MailCheck />
                      Resend
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm font-medium text-red-600">
                  Login failed. Please check your credentials.
                </p>
              )}

              <FormActions
                submitLabel={otpRequired ? "Verify and login" : "Login"}
                loading={isLoading || isSendingOtp}
              />
            </AppForm>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/forgot-password" className="font-medium text-blue-600">
              Forgot password?
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-slate-500">
            New to Factory1?{" "}
            <Link href="/signup" className="font-medium text-blue-600">
              Create organization
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function isLoginOtpRequired(error: unknown) {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return false;
  }

  const data = (error as { data?: { message?: string } }).data;

  return data?.message === "LOGIN_OTP_REQUIRED";
}

function getStoredLastEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(AUTH_LAST_LOGIN_EMAIL_STORAGE_KEY) ?? "";
}

function getStoredLastName() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(AUTH_LAST_LOGIN_NAME_STORAGE_KEY) ?? "";
}
