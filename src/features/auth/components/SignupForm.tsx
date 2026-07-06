"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory, MailCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  AppForm,
  FormActions,
  NumberField,
  PasswordField,
  SelectField,
  TextField,
} from "@/components/forms";
import { Button } from "@/components/ui/button";
import { setCredentials } from "../authSlice";
import {
  useSendSignupOtpMutation,
  useSignupOrganizationMutation,
} from "../authApi";
import { signupSchema, type SignupFormValues } from "../schemas/signup.schema";
import { useAppDispatch } from "@/lib/hook";

export function SignupForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [sendSignupOtp, { isLoading: isSendingOtp }] =
    useSendSignupOtpMutation();
  const [signupOrganization, { isLoading, error }] =
    useSignupOrganizationMutation();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organizationName: "",
      ownerName: "",
      email: "",
      password: "",
      otp: "",
      location: "",
      industryType: "",
      employeeCountEstimate: 1,
      gstNumber: "",
      businessType: "MANUFACTURING",
      state: "",
    },
  });

  const email = useWatch({
    control: form.control,
    name: "email",
  }) ?? "";
  const otpRequested = otpSentTo === email.trim().toLowerCase();

  async function handleSendOtp() {
    const validEmail = await form.trigger("email");

    if (!validEmail) return;

    const normalizedEmail = email.trim().toLowerCase();

    try {
      await sendSignupOtp({ email: normalizedEmail }).unwrap();

      setOtpSentTo(normalizedEmail);
      toast.success("OTP sent to your email");
    } catch {
      toast.error("Could not send OTP. Please check the email and try again.");
    }
  }

  async function onSubmit(values: SignupFormValues) {
    if (!otpRequested) {
      await handleSendOtp();
      return;
    }

    if (!values.otp || !/^\d{6}$/.test(values.otp)) {
      form.setError("otp", {
        type: "manual",
        message: "Enter the 6 digit OTP",
      });
      return;
    }

    const response = await signupOrganization({
      ...values,
      gstNumber: values.gstNumber?.trim().toUpperCase(),
      otp: values.otp,
    }).unwrap();

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
      <div className="w-full max-w-2xl rounded-2xl border bg-white p-8 shadow-sm">
        <Link href="/" className="mb-8 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Factory size={22} />
          </div>

          <div>
            <h1 className="text-lg font-semibold">Factory1</h1>
            <p className="text-sm text-slate-500">Create your workspace</p>
          </div>
        </Link>

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

            <div className="rounded-xl border bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">
                Initial factory setup
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                This helps Factory1 prepare a useful dashboard from day one.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextField<SignupFormValues>
                  name="location"
                  label="Factory location"
                  placeholder="Peenya, Bengaluru"
                  required
                />

                <TextField<SignupFormValues>
                  name="industryType"
                  label="Industry type"
                  placeholder="Textile, fabrication, food processing"
                  required
                />

                <NumberField<SignupFormValues>
                  name="employeeCountEstimate"
                  label="Number of employees"
                  min={1}
                  required
                />

                <TextField<SignupFormValues>
                  name="gstNumber"
                  label="GST number"
                  placeholder="Optional"
                />

                <SelectField<SignupFormValues>
                  name="businessType"
                  label="Business type"
                  options={[
                    { label: "Manufacturing", value: "MANUFACTURING" },
                    { label: "Trading", value: "TRADING" },
                    { label: "Job work", value: "JOB_WORK" },
                    { label: "Services", value: "SERVICES" },
                  ]}
                />

                <TextField<SignupFormValues>
                  name="state"
                  label="State"
                  placeholder="Karnataka"
                />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <TextField<SignupFormValues>
                  name="otp"
                  label="Email OTP"
                  placeholder="6 digit code"
                  disabled={!otpRequested}
                  required
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="mb-[1px]"
              >
                <MailCheck />
                {otpRequested ? "Resend" : "Send OTP"}
              </Button>
            </div>

            {otpRequested && (
              <p className="text-xs text-slate-500">
                We sent a verification code to {otpSentTo}. It expires in 10
                minutes.
              </p>
            )}

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
              submitLabel={otpRequested ? "Create organization" : "Send OTP"}
              loading={isLoading || isSendingOtp}
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
