"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Factory, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { getErrorMessage } from "@/lib/apiError";
import {
  useCreateHealthCheckDraftMutation,
  useFinalizeHealthCheckDraftMutation,
  useUpdateHealthCheckDraftMutation,
} from "../api/healthCheckApi";
import { HEALTH_CHECK_STEPS } from "../config";
import {
  clearHealthCheckDraft,
  completeWelcome,
  createHealthCheckDraft,
  loadHealthCheckDraft,
  saveHealthCheckDraft,
} from "../storage";
import { buildHealthCheckDraftCreate, buildHealthCheckDraftUpdate } from "../submission";
import type { HealthCheckAnswerValue, HealthCheckContact, HealthCheckDraft } from "../types";
import { validateContactStep, validateProjectionInputs, validateQuestionStep } from "../validation";
import { QuestionField } from "./QuestionField";

const totalSteps = HEALTH_CHECK_STEPS.length + 2;
const reviewStep = totalSteps - 1;
const contactFields = [
  ["name", "Your name", "text"],
  ["email", "Work email", "email"],
  ["phone", "Phone number", "tel"],
  ["companyName", "Factory or company", "text"],
  ["location", "City or location", "text"],
] as const satisfies ReadonlyArray<readonly [keyof HealthCheckContact, string, string]>;

export function HealthCheckPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<HealthCheckDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [createRemoteDraft, createState] = useCreateHealthCheckDraftMutation();
  const [updateRemoteDraft, updateState] = useUpdateHealthCheckDraftMutation();
  const [finalizeRemoteDraft, finalizeState] = useFinalizeHealthCheckDraftMutation();
  const topRef = useRef<HTMLHeadingElement>(null);
  const submitInFlight = useRef(false);
  const draftWriteInFlight = useRef(false);

  useEffect(() => {
    // Draft storage is browser-only and must be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadHealthCheckDraft() ?? createHealthCheckDraft());
  }, []);

  const questionDetails = useMemo(
    () => new Map(
      HEALTH_CHECK_STEPS.flatMap((step) =>
        step.questions.map((question) => [
          question.id,
          {
            label: question.label,
            options: new Map(question.options.map((option) => [option.value, option.label])),
          },
        ])
      )
    ),
    []
  );

  if (!draft) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><LoaderCircle className="animate-spin text-blue-600" aria-label="Loading health check" /></div>;
  }

  const activeDraft: HealthCheckDraft = draft;
  const isContact = activeDraft.step === 0;
  const isReview = activeDraft.step === reviewStep;
  const questionStepIndex = activeDraft.step - 1;
  const stepConfig = HEALTH_CHECK_STEPS[questionStepIndex];
  const progress = Math.round(((activeDraft.step + 1) / totalSteps) * 100);
  const remoteMutationIsLoading = createState.isLoading || updateState.isLoading || finalizeState.isLoading;
  const title = isContact ? "First, who should this report be for?" : isReview ? "Review and get your report" : stepConfig.title;
  const description = isContact
    ? activeDraft.remoteDraft
      ? "These details are already saved with this draft."
      : "We save these details with your draft when you continue, so you can come back without starting again."
    : isReview
      ? "Check your answers below. The report focuses on practical operating improvements and cautious monthly-hour ranges."
      : stepConfig.description;

  function persistDraft(nextDraft: HealthCheckDraft) {
    try {
      saveHealthCheckDraft(nextDraft);
      setHasSaved(true);
      setSaveError("");
      return true;
    } catch {
      setHasSaved(false);
      setSaveError("We could not save on this device. Keep this page open and try Continue again.");
      return false;
    }
  }

  function focusStepHeading() {
    requestAnimationFrame(() => topRef.current?.focus());
  }

  function clearFieldError(field: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateAnswer(questionId: string, value: HealthCheckAnswerValue) {
    const nextDraft = { ...activeDraft, answers: { ...activeDraft.answers, [questionId]: value } };
    persistDraft(nextDraft);
    setDraft(nextDraft);
    clearFieldError(questionId);
  }

  function updateContact(field: keyof HealthCheckContact, value: string) {
    const nextDraft = { ...activeDraft, contact: { ...activeDraft.contact, [field]: value } };
    persistDraft(nextDraft);
    setDraft(nextDraft);
    clearFieldError(field);
  }

  function updateProjectionInput(field: keyof HealthCheckDraft["projectionInputs"], value: string) {
    const nextDraft = {
      ...activeDraft,
      projectionInputs: { ...activeDraft.projectionInputs, [field]: value },
    };
    persistDraft(nextDraft);
    setDraft(nextDraft);
    clearFieldError(field);
  }

  function goToStep(nextStep: number) {
    const nextDraft = { ...activeDraft, step: nextStep };
    persistDraft(nextDraft);
    setDraft(nextDraft);
    setErrors({});
    setSubmitError("");
    focusStepHeading();
  }

  async function ensureRemoteDraft(currentDraft: HealthCheckDraft) {
    if (currentDraft.remoteDraft) return currentDraft;

    const response = await createRemoteDraft(buildHealthCheckDraftCreate(currentDraft)).unwrap();
    const draftWithRemote = { ...currentDraft, remoteDraft: response.data };
    setDraft(draftWithRemote);
    return persistDraft(draftWithRemote) ? draftWithRemote : null;
  }

  async function saveCompleteAnswerSnapshot(currentDraft: HealthCheckDraft) {
    const draftWithRemote = await ensureRemoteDraft(currentDraft);
    if (!draftWithRemote?.remoteDraft) return null;

    const response = await updateRemoteDraft({
      draftToken: draftWithRemote.remoteDraft.draftToken,
      body: buildHealthCheckDraftUpdate(draftWithRemote, draftWithRemote.remoteDraft.revision),
    }).unwrap();
    const updatedDraft = { ...draftWithRemote, remoteDraft: response.data };
    setDraft(updatedDraft);
    return persistDraft(updatedDraft) ? updatedDraft : null;
  }

  async function continueStep() {
    if (remoteMutationIsLoading || draftWriteInFlight.current) return;
    const nextErrors = isContact
      ? validateContactStep(activeDraft.contact)
      : validateQuestionStep(questionStepIndex, activeDraft.answers);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      requestAnimationFrame(() => document.getElementById(Object.keys(nextErrors)[0])?.focus());
      return;
    }

    if (!persistDraft(activeDraft)) return;
    draftWriteInFlight.current = true;
    setSubmitError("");
    try {
      const savedDraft = isContact
        ? await ensureRemoteDraft(activeDraft)
        : questionStepIndex === HEALTH_CHECK_STEPS.length - 1
          ? await saveCompleteAnswerSnapshot(activeDraft)
          : activeDraft;
      if (!savedDraft) return;

      const nextDraft = { ...savedDraft, step: activeDraft.step + 1 };
      if (!persistDraft(nextDraft)) return;
      setDraft(nextDraft);
      setErrors({});
      focusStepHeading();
    } catch (error) {
      setSubmitError(getErrorMessage(error, "We could not save your draft. Your details remain on this device; please try again."));
    } finally {
      draftWriteInFlight.current = false;
    }
  }

  async function submit() {
    if (remoteMutationIsLoading || submitInFlight.current) return;

    const contactErrors = validateContactStep(activeDraft.contact);
    if (Object.keys(contactErrors).length > 0) {
      setDraft({ ...activeDraft, step: 0 });
      setErrors(contactErrors);
      focusStepHeading();
      return;
    }
    for (let step = 0; step < HEALTH_CHECK_STEPS.length; step += 1) {
      const questionErrors = validateQuestionStep(step, activeDraft.answers);
      if (Object.keys(questionErrors).length > 0) {
        setDraft({ ...activeDraft, step: step + 1 });
        setErrors(questionErrors);
        focusStepHeading();
        return;
      }
    }
    const projectionErrors = validateProjectionInputs(activeDraft.projectionInputs);
    if (Object.keys(projectionErrors).length > 0) {
      setErrors(projectionErrors);
      requestAnimationFrame(() => document.getElementById(Object.keys(projectionErrors)[0])?.focus());
      return;
    }

    setSubmitError("");
    submitInFlight.current = true;
    try {
      const updatedDraft = await saveCompleteAnswerSnapshot(activeDraft);
      if (!updatedDraft?.remoteDraft) return;
      const response = await finalizeRemoteDraft(updatedDraft.remoteDraft.draftToken).unwrap();
      clearHealthCheckDraft();
      completeWelcome();
      router.push(`/health-check/results/${encodeURIComponent(response.data.result.resultToken)}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "We could not submit your health check. Your answers are saved; please try again."));
    } finally {
      submitInFlight.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Factory size={19} aria-hidden="true" /></span>
            Factory1
          </Link>
          <div className="flex flex-col items-end gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} aria-hidden="true" /> Private draft</span>
            <span className="flex items-center gap-1.5" aria-live="polite">
              {hasSaved && <><Save size={14} aria-hidden="true" /> Saved on this device</>}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Step {activeDraft.step + 1} of {totalSteps}</span>
            <span className="text-slate-500">{isReview ? "Almost done" : "About 3 minutes total"}</span>
          </div>
          <Progress value={progress} aria-label={`Health check ${progress}% complete`} />
        </div>

        <section aria-labelledby="health-check-step-title">
          <h1 id="health-check-step-title" ref={topRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-950 outline-none sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-slate-600">{description}</p>

          {isContact ? (
            <div className="mt-6 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              {contactFields.map(([key, label, type]) => (
                <div key={key} className={key === "location" ? "sm:col-span-2" : ""}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type={type}
                    required={key !== "location"}
                    autoComplete={key === "companyName" ? "organization" : key === "location" ? "address-level2" : key}
                    className="mt-1.5 min-h-11"
                    disabled={Boolean(activeDraft.remoteDraft)}
                    value={activeDraft.contact[key]}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? `${key}-error` : undefined}
                    onChange={(event) => updateContact(key, event.target.value)}
                  />
                  {errors[key] && <p id={`${key}-error`} role="alert" className="mt-1 text-sm text-red-600">{errors[key]}</p>}
                </div>
              ))}
              {activeDraft.remoteDraft && (
                <p className="text-sm text-slate-600 sm:col-span-2">
                  Contact details are locked after the secure draft is created. Your questionnaire answers can still be changed before you finish.
                </p>
              )}
              {!activeDraft.remoteDraft && (
                <p className="text-xs leading-5 text-slate-600 sm:col-span-2">
                  By continuing, you ask Factory1 to save a private draft with these details under the{" "}
                  <Link href="/privacy-policy" className="font-medium text-blue-700 underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  . This is not consent for marketing or sales follow-up.
                </p>
              )}
            </div>
          ) : !isReview ? (
            <div className="mt-6 space-y-4">
              {stepConfig.questions.map((question) => (
                <div key={question.id}>
                  <QuestionField
                    question={question}
                    value={activeDraft.answers[question.id]}
                    error={errors[question.id]}
                    disabled={remoteMutationIsLoading}
                    onChange={(value) => updateAnswer(question.id, value)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <section className="rounded-2xl border bg-white p-5" aria-labelledby="report-for-title">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="report-for-title" className="font-semibold">Report for {activeDraft.contact.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{activeDraft.contact.companyName} · {activeDraft.contact.email}</p>
                  </div>
                </div>
              </section>

              <details className="rounded-2xl border bg-white p-5">
                <summary className="cursor-pointer font-semibold">Review your {questionDetails.size} answers</summary>
                <dl className="mt-4 space-y-3">
                  {HEALTH_CHECK_STEPS.flatMap((step) => step.questions).map((question) => (
                    <div key={question.id} className="border-t pt-3 text-sm first:border-0 first:pt-0">
                      <dt className="font-medium text-slate-800">{question.label}</dt>
                      <dd className="mt-1 text-slate-600">{questionDetails.get(question.id)?.options.get(activeDraft.answers[question.id])}</dd>
                    </div>
                  ))}
                </dl>
              </details>

              <details className="rounded-2xl border bg-white p-5">
                <summary className="cursor-pointer font-semibold">Adjust the monthly planning range (optional)</summary>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Working days help keep the cautious hours-per-month range relevant to your factory.
                </p>
                <div className="mt-4 max-w-sm">
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
                      disabled={remoteMutationIsLoading}
                      value={activeDraft.projectionInputs.workingDaysPerMonth}
                      aria-invalid={Boolean(errors.workingDaysPerMonth)}
                      aria-describedby={errors.workingDaysPerMonth ? "workingDaysPerMonth-error" : "workingDaysPerMonth-help"}
                      onChange={(event) => updateProjectionInput("workingDaysPerMonth", event.target.value)}
                    />
                    <p id="workingDaysPerMonth-help" className="mt-1 text-xs text-slate-500">Default: 26</p>
                    {errors.workingDaysPerMonth && <p id="workingDaysPerMonth-error" role="alert" className="mt-1 text-sm text-red-600">{errors.workingDaysPerMonth}</p>}
                  </div>
                </div>
              </details>
            </div>
          )}

          {saveError && (
            <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {saveError}
            </div>
          )}
          {submitError && (
            <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
            {activeDraft.step > 0 ? (
              <Button type="button" variant="outline" onClick={() => goToStep(activeDraft.step - 1)} disabled={remoteMutationIsLoading}>
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
            ) : (
              <div>
                <Button variant="ghost" asChild><Link href="/">Exit</Link></Button>
                <p className="mt-1 text-xs text-slate-500">Your saved draft stays on this device.</p>
              </div>
            )}

            {isReview ? (
              <div className="flex max-w-xl flex-col items-stretch gap-3 sm:items-end">
                <p className="text-xs leading-5 text-slate-600 sm:text-right">
                  By submitting, you request this report at the email above. Factory1 processes your details under the{" "}
                  <Link href="/privacy-policy" className="font-medium text-blue-700 underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  . This is not consent for marketing or sales follow-up.
                </p>
                <Button type="button" onClick={submit} disabled={remoteMutationIsLoading}>
                  {remoteMutationIsLoading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                  {remoteMutationIsLoading ? "Creating report…" : "Get my health-check report"}
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={continueStep} disabled={remoteMutationIsLoading}>
                {remoteMutationIsLoading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {remoteMutationIsLoading ? "Saving draft…" : "Save and continue"} {!remoteMutationIsLoading && <ArrowRight aria-hidden="true" />}
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
