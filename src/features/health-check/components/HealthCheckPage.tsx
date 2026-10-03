"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Factory, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { getErrorMessage } from "@/lib/apiError";
import { HEALTH_CHECK_STEPS } from "../config";
import {
  clearHealthCheckDraft,
  completeWelcome,
  createHealthCheckDraft,
  loadHealthCheckDraft,
  saveHealthCheckDraft,
} from "../storage";
import type { HealthCheckAnswerValue, HealthCheckDraft } from "../types";
import { validateContactStep, validateQuestionStep } from "../validation";
import { useSubmitHealthCheckMutation } from "../api/healthCheckApi";
import { buildHealthCheckSubmission } from "../submission";
import { QuestionField } from "./QuestionField";

const totalSteps = HEALTH_CHECK_STEPS.length + 1;

export function HealthCheckPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<HealthCheckDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitHealthCheck, submitState] = useSubmitHealthCheckMutation();
  const topRef = useRef<HTMLHeadingElement>(null);
  const submitInFlight = useRef(false);

  useEffect(() => {
    // Draft storage is browser-only and must be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadHealthCheckDraft() ?? createHealthCheckDraft());
  }, []);

  useEffect(() => {
    if (draft) saveHealthCheckDraft(draft);
  }, [draft]);

  const questionLabels = useMemo(
    () => new Map(HEALTH_CHECK_STEPS.flatMap((step) => step.questions.map((question) => [question.id, question.label]))),
    []
  );

  if (!draft) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><LoaderCircle className="animate-spin text-blue-600" aria-label="Loading health check" /></div>;
  }

  const activeDraft: HealthCheckDraft = draft;
  const stepConfig = HEALTH_CHECK_STEPS[activeDraft.step];
  const isReview = activeDraft.step === HEALTH_CHECK_STEPS.length;
  const progress = Math.round(((activeDraft.step + 1) / totalSteps) * 100);

  function updateAnswer(questionId: string, value: HealthCheckAnswerValue) {
    setDraft((current) => current && ({ ...current, answers: { ...current.answers, [questionId]: value } }));
    setErrors((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  function goToStep(nextStep: number) {
    setDraft((current) => current && ({ ...current, step: nextStep }));
    setErrors({});
    setSubmitError("");
    requestAnimationFrame(() => topRef.current?.focus());
  }

  function continueStep() {
    const nextErrors = validateQuestionStep(activeDraft.step, activeDraft.answers);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      requestAnimationFrame(() => document.getElementById(Object.keys(nextErrors)[0])?.focus());
      return;
    }
    goToStep(activeDraft.step + 1);
  }

  async function submit() {
    if (submitState.isLoading || submitInFlight.current) return;
    for (let step = 0; step < HEALTH_CHECK_STEPS.length; step += 1) {
      const questionErrors = validateQuestionStep(step, activeDraft.answers);
      if (Object.keys(questionErrors).length > 0) {
        setDraft({ ...activeDraft, step });
        setErrors(questionErrors);
        requestAnimationFrame(() => topRef.current?.focus());
        return;
      }
    }
    const nextErrors = validateContactStep(
      activeDraft.contact,
      activeDraft.projectionInputs
    );
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitError("");
    submitInFlight.current = true;
    try {
      const response = await submitHealthCheck(buildHealthCheckSubmission(activeDraft)).unwrap();
      clearHealthCheckDraft();
      completeWelcome();
      router.push(`/health-check/results/${encodeURIComponent(response.data.resultToken)}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "We could not submit your health check. Your answers are saved; please try again."));
    } finally {
      submitInFlight.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Factory size={19} aria-hidden="true" /></span>
            Factory1
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} aria-hidden="true" /> Private until submitted</div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Step {activeDraft.step + 1} of {totalSteps}</span>
            <span className="text-slate-500">{progress}% complete</span>
          </div>
          <Progress value={progress} aria-label={`Health check ${progress}% complete`} />
        </div>

        <section aria-labelledby="health-check-step-title">
          <h1 id="health-check-step-title" ref={topRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-950 outline-none sm:text-3xl">
            {isReview ? "Contact and review" : stepConfig.title}
          </h1>
          <p className="mt-2 text-slate-600">
            {isReview ? "Review your details before sending your health check." : stepConfig.description}
          </p>

          {!isReview ? (
            <div className="mt-6 space-y-4">
              {stepConfig.questions.map((question) => (
                <div id={question.id} key={question.id}>
                  <QuestionField question={question} value={activeDraft.answers[question.id]} error={errors[question.id]} onChange={(value) => updateAnswer(question.id, value)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
                {([
                  ["name", "Your name", "text"],
                  ["email", "Work email", "email"],
                  ["phone", "Phone number", "tel"],
                  ["companyName", "Factory or company", "text"],
                  ["location", "City or location", "text"],
                ] as const).map(([key, label, type]) => (
                  <div key={key} className={key === "location" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type={type}
                      autoComplete={key === "companyName" ? "organization" : key === "location" ? "address-level2" : key}
                      className="mt-1.5 min-h-11"
                      value={activeDraft.contact[key]}
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={errors[key] ? `${key}-error` : undefined}
                      onChange={(event) => setDraft({ ...activeDraft, contact: { ...activeDraft.contact, [key]: event.target.value } })}
                    />
                    {errors[key] && <p id={`${key}-error`} role="alert" className="mt-1 text-sm text-red-600">{errors[key]}</p>}
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h2 className="font-semibold">Projection assumptions</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  These optional inputs make the estimate more relevant. Clear both fields to use Factory1 defaults.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="workingDaysPerMonth">Working days per month</Label>
                    <Input
                      id="workingDaysPerMonth"
                      type="number"
                      inputMode="numeric"
                      min={20}
                      max={31}
                      step={1}
                      className="mt-1.5 min-h-11"
                      value={activeDraft.projectionInputs.workingDaysPerMonth}
                      aria-invalid={Boolean(errors.workingDaysPerMonth)}
                      aria-describedby={errors.workingDaysPerMonth ? "workingDaysPerMonth-error" : "workingDaysPerMonth-help"}
                      onChange={(event) => setDraft({ ...activeDraft, projectionInputs: { ...activeDraft.projectionInputs, workingDaysPerMonth: event.target.value } })}
                    />
                    <p id="workingDaysPerMonth-help" className="mt-1 text-xs text-slate-500">Usually 20–31 days. Default: 26.</p>
                    {errors.workingDaysPerMonth && <p id="workingDaysPerMonth-error" role="alert" className="mt-1 text-sm text-red-600">{errors.workingDaysPerMonth}</p>}
                  </div>
                  <div>
                    <Label htmlFor="loadedHourlyLabourCostInr">Loaded hourly labour cost (₹)</Label>
                    <Input
                      id="loadedHourlyLabourCostInr"
                      type="number"
                      inputMode="decimal"
                      min={100}
                      max={10000}
                      step="0.01"
                      className="mt-1.5 min-h-11"
                      value={activeDraft.projectionInputs.loadedHourlyLabourCostInr}
                      aria-invalid={Boolean(errors.loadedHourlyLabourCostInr)}
                      aria-describedby={errors.loadedHourlyLabourCostInr ? "loadedHourlyLabourCostInr-error" : "loadedHourlyLabourCostInr-help"}
                      onChange={(event) => setDraft({ ...activeDraft, projectionInputs: { ...activeDraft.projectionInputs, loadedHourlyLabourCostInr: event.target.value } })}
                    />
                    <p id="loadedHourlyLabourCostInr-help" className="mt-1 text-xs text-slate-500">Wages plus employment overhead. Default: ₹250.</p>
                    {errors.loadedHourlyLabourCostInr && <p id="loadedHourlyLabourCostInr-error" role="alert" className="mt-1 text-sm text-red-600">{errors.loadedHourlyLabourCostInr}</p>}
                  </div>
                </div>
              </div>

              <details className="rounded-2xl border bg-white p-5">
                <summary className="cursor-pointer font-semibold">Review all answers</summary>
                <dl className="mt-4 space-y-3">
                  {Object.entries(activeDraft.answers).map(([questionId, value]) => (
                    <div key={questionId} className="border-t pt-3 text-sm first:border-0 first:pt-0">
                      <dt className="font-medium text-slate-800">{questionLabels.get(questionId)}</dt>
                      <dd className="mt-1 text-slate-600">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          )}

          {submitError && (
            <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
            {activeDraft.step > 0 ? (
              <Button type="button" variant="outline" onClick={() => goToStep(activeDraft.step - 1)} disabled={submitState.isLoading}>
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
            ) : <Button variant="ghost" asChild><Link href="/">Exit</Link></Button>}

            {isReview ? (
              <div className="flex max-w-xl flex-col items-stretch gap-3 sm:items-end">
                <p className="text-xs leading-5 text-slate-600 sm:text-right">
                  By submitting, you request your health-check report at the email above. Factory1 will process your details and answers under the{" "}
                  <Link href="/privacy-policy" className="font-medium text-blue-700 underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  . Factory1 may contact you to provide the requested report; this is not consent for marketing or sales follow-up.
                </p>
                <Button type="button" onClick={submit} disabled={submitState.isLoading}>
                  {submitState.isLoading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                  {submitState.isLoading ? "Submitting…" : "Submit health check"}
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={continueStep}>
                Continue <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
