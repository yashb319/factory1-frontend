"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AppForm, FormActions, TextField, PasswordField } from "@/components/forms";
import { setCredentials } from "../authSlice";
import { useSignupOrganizationMutation } from "../authApi";
import { signupSchema, type SignupFormValues } from "../schemas/signup.schema";
import { useAppDispatch } from "@/lib/hook";

export function SignupForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [signupOrganization, { isLoading, error }] =
    useSignupOrganizationMutation();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organizationName: "",
      ownerName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    const response = await signupOrganization(values).unwrap();

    dispatch(
      setCredentials({
        token: response.token,
        user: response.user ?? null,
      })
    );

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Factory size={22} />
          </div>

          <div>
            <h1 className="text-lg font-semibold">Factory1</h1>
            <p className="text-sm text-slate-500">Create your workspace</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-slate-950">
          Signup your organization
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Create your factory account and owner login.
        </p>

        <div className="mt-8">
          <AppForm form={form} onSubmit={onSubmit}>
            <TextField<SignupFormValues>
              name="organizationName"
              label="Organization name"
              placeholder="ABC Manufacturing"
              required
            />

            <TextField<SignupFormValues>
              name="ownerName"
              label="Owner name"
              placeholder="Yash Bansal"
              required
            />

            <TextField<SignupFormValues>
              name="email"
              label="Email"
              placeholder="owner@example.com"
              required
            />

            <PasswordField<SignupFormValues>
              name="password"
              label="Password"
              placeholder="Create password"
              required
            />

            {error && (
              <p className="text-sm font-medium text-red-600">
                Signup failed. Please try again.
              </p>
            )}

            <FormActions
              submitLabel="Create organization"
              loading={isLoading}
            />
          </AppForm>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}