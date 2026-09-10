"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppForm, FormActions, TextField } from "@/components/forms";
import { useAppDispatch } from "@/lib/hook";
import { setCredentials } from "../authSlice";
import { useSandboxSignupMutation } from "../authApi";
import {
  sandboxTrialSchema,
  type SandboxTrialFormValues,
} from "../schemas/sandboxTrial.schema";

type SandboxTrialDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SandboxTrialDialog({
  open,
  onOpenChange,
}: SandboxTrialDialogProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [sandboxSignup, { isLoading }] = useSandboxSignupMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<SandboxTrialFormValues>({
    resolver: zodResolver(sandboxTrialSchema),
    defaultValues: {
      name: "",
      organizationName: "",
      email: "",
    },
  });

  async function onSubmit(values: SandboxTrialFormValues) {
    setErrorMessage(null);

    try {
      const response = await sandboxSignup({
        name: values.name.trim(),
        organizationName: values.organizationName.trim(),
        email: values.email.trim().toLowerCase(),
      }).unwrap();

      dispatch(setCredentials({ token: response.token, user: response.user }));
      onOpenChange(false);
      router.push("/dashboard");
    } catch (error) {
      const message = getApiErrorMessage(error);

      if (message.toLowerCase().includes("email")) {
        form.setError("email", {
          type: "server",
          message,
        });
      } else {
        setErrorMessage(message);
      }

      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Try Factory1 free</DialogTitle>
          <DialogDescription>
            Start an instant sandbox workspace with sample data. No password,
            OTP, or approval wait.
          </DialogDescription>
        </DialogHeader>

        <AppForm form={form} onSubmit={onSubmit}>
          <TextField<SandboxTrialFormValues>
            name="name"
            label="Your name"
            placeholder="Yash Bansal"
            required
          />
          <TextField<SandboxTrialFormValues>
            name="organizationName"
            label="Organization name"
            placeholder="ABC Manufacturing"
            required
          />
          <TextField<SandboxTrialFormValues>
            name="email"
            label="Email"
            type="email"
            placeholder="owner@example.com"
            required
          />

          {errorMessage ? (
            <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          ) : null}

          <FormActions submitLabel="Enter sandbox" loading={isLoading} />
        </AppForm>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;

    if (typeof data === "object" && data !== null && "message" in data) {
      const message = data.message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
  }

  return "Could not start the sandbox. Please try again.";
}
