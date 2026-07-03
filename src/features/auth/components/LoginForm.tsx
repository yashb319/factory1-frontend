"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AppForm, FormActions, TextField, PasswordField } from "@/components/forms";
import { setCredentials } from "../authSlice";
import { useLoginMutation } from "../authApi";
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import { useAppDispatch } from "@/lib/hook";

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    const response = await login(values).unwrap();

    dispatch(
      setCredentials({
        token: response.token,
        user: response.user ?? null,
      })
    );

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <section className="hidden flex-1 bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Factory size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Factory1</h1>
            <p className="text-sm text-slate-400">Run your factory smarter.</p>
          </div>
        </div>

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

              {error && (
                <p className="text-sm font-medium text-red-600">
                  Login failed. Please check your credentials.
                </p>
              )}

              <FormActions submitLabel="Login" loading={isLoading} />
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
