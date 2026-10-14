"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AuthUser } from "@/features/auth/types";
import { getErrorMessage } from "@/lib/apiError";
import { useContactEmployeeSupportMutation } from "../api/contactSupportApi";
import {
  contactSupportSchema,
  SUPPORT_ISSUE_TYPES,
  type ContactSupportRequest,
} from "../contactSupport";

export function EmployeeContactSupportForm({ user }: { user: AuthUser }) {
  const [contactSupport, { isLoading, reset }] = useContactEmployeeSupportMutation();
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const form = useForm<ContactSupportRequest>({
    resolver: zodResolver(contactSupportSchema),
    defaultValues: {
      name: user.name,
      companyEmail: user.email,
      description: "",
    },
  });
  const { errors } = form.formState;
  const isSubmitting = form.formState.isSubmitting || isLoading;

  async function submit(values: ContactSupportRequest) {
    if (submittingRef.current || success) return;
    submittingRef.current = true;
    setError("");
    try {
      const response = await contactSupport(values).unwrap();
      setSuccess(response.message);
      form.reset({ name: values.name, companyEmail: values.companyEmail, description: "" });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "We could not send your message. Please try again later."));
    } finally {
      submittingRef.current = false;
      reset();
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Help Center</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Need help with your employee portal? Send a message to Factory1 support.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Contact support</CardTitle></CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p role="status" className="text-sm">{success}</p>
              <Button type="button" variant="outline" onClick={() => setSuccess("")}>
                Send another message
              </Button>
            </div>
          ) : (
            <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="space-y-5" aria-busy={isSubmitting}>
              <p id="support-privacy" className="text-sm text-muted-foreground">
                All fields are required. Include only information about your own issue.
                Do not include passwords, OTPs, or sensitive personal data.
                You can send up to 3 requests in 15 minutes; failed attempts also count.
              </p>
              <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
                <legend className="sr-only">Support request details</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="support-name">Name</Label>
                    <Input id="support-name" autoComplete="name" required maxLength={120}
                      aria-invalid={!!errors.name} aria-describedby={errors.name ? "support-name-error" : undefined}
                      {...form.register("name")} />
                    {errors.name && <p id="support-name-error" role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Company email</Label>
                    <Input id="support-email" type="email" autoComplete="email" required maxLength={254}
                      aria-invalid={!!errors.companyEmail} aria-describedby={errors.companyEmail ? "support-email-error" : undefined}
                      {...form.register("companyEmail")} />
                    {errors.companyEmail && <p id="support-email-error" role="alert" className="text-sm text-destructive">{errors.companyEmail.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-issue">Issue type</Label>
                  <select id="support-issue" required defaultValue=""
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    aria-invalid={!!errors.issueType} aria-describedby={errors.issueType ? "support-issue-error" : undefined}
                    {...form.register("issueType")}>
                    <option value="" disabled>Choose an issue type</option>
                    {SUPPORT_ISSUE_TYPES.map((issue) => <option key={issue.value} value={issue.value}>{issue.label}</option>)}
                  </select>
                  {errors.issueType && <p id="support-issue-error" role="alert" className="text-sm text-destructive">{errors.issueType.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-description">Description</Label>
                  <Textarea id="support-description" required maxLength={5000} rows={7}
                    className="resize-y" aria-invalid={!!errors.description}
                    aria-describedby={`support-description-hint${errors.description ? " support-description-error" : ""}`}
                    {...form.register("description")} />
                  <p id="support-description-hint" className="text-xs text-muted-foreground">
                    Describe what happened and what you expected. Maximum 5,000 characters.
                  </p>
                  {errors.description && <p id="support-description-error" role="alert" className="text-sm text-destructive">{errors.description.message}</p>}
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto" aria-describedby="support-privacy">
                  {isSubmitting ? "Sending message..." : "Send message"}
                </Button>
              </fieldset>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {isSubmitting && <p role="status" className="text-sm text-muted-foreground">Sending your message. Please wait.</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
