"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bot,
  Camera,
  ClipboardList,
  Factory,
  FileText,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { logout } from "@/features/auth/authSlice";
import { useSubmitEarlyRegistrationQuestionnaireMutation } from "@/features/auth/authApi";

const FEATURE_HIGHLIGHTS = [
  {
    title: "AI purchase bill import",
    detail: "Camera and photo upload for supplier bills, items, GST and totals.",
    icon: Camera,
  },
  {
    title: "Tally-style and modern UI",
    detail: "Operators can work in a familiar voucher flow or a newer dashboard.",
    icon: FileText,
  },
  {
    title: "Factory operations connected",
    detail: "Inventory, billing, attendance, payroll and customers stay in one flow.",
    icon: Factory,
  },
  {
    title: "SaaS admin control",
    detail: "Tenant approvals, plans, usage limits and Factory1 platform oversight.",
    icon: ShieldCheck,
  },
] as const;

const MODULES = [
  "Purchase bill OCR",
  "Inventory",
  "Billing",
  "Attendance",
  "Payroll",
  "Accounting",
  "Production",
  "AI assistant",
] as const;

export default function RegistrationPendingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const [submitQuestionnaire, submitState] =
    useSubmitEarlyRegistrationQuestionnaireMutation();
  const [biggestProblem, setBiggestProblem] = useState("");
  const [currentProcess, setCurrentProcess] = useState("");
  const [urgency, setUrgency] = useState("THIS_MONTH");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [modulesNeeded, setModulesNeeded] = useState<string[]>([
    "Purchase bill OCR",
    "Inventory",
    "Billing",
  ]);

  const firstName = useMemo(() => {
    const name = user?.name?.trim();
    return name ? name.split(/\s+/)[0] : "there";
  }, [user?.name]);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    if (user?.platformAdmin) {
      router.replace("/saas-admin");
      return;
    }

    if (user?.organizationStatus && user.organizationStatus !== "PENDING_APPROVAL") {
      router.replace("/dashboard");
    }
  }, [router, token, user?.organizationStatus, user?.platformAdmin]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!biggestProblem.trim()) {
      toast.error("Tell us the biggest factory problem first");
      return;
    }

    try {
      await submitQuestionnaire({
        organizationId: user?.organizationId,
        ownerName: user?.name,
        email: user?.email,
        biggestProblem: biggestProblem.trim(),
        currentProcess: currentProcess.trim() || undefined,
        modulesNeeded,
        urgency,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      }).unwrap();

      toast.success("Thanks, your answers were saved");
    } catch {
      toast.error("Could not save answers right now");
    }
  }

  function toggleModule(moduleName: string, checked: boolean) {
    setModulesNeeded((current) =>
      checked
        ? Array.from(new Set([...current, moduleName]))
        : current.filter((item) => item !== moduleName)
    );
  }

  function logoutUser() {
    dispatch(logout());
    router.replace("/login");
  }

  if (!token) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Factory size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Factory1</p>
              <p className="text-xs text-slate-500">Early registration</p>
            </div>
          </Link>

          <Button type="button" variant="outline" onClick={logoutUser}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <BadgeCheck size={14} />
                  Signup successful
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  Hi {firstName}, your Factory1 registration is in review.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Your account has been created successfully. Access to the
                  dashboard will be enabled after approval from the Factory1 SaaS
                  admin portal. You will be notified by email once access is
                  granted.
                </p>
              </div>

              <div className="flex min-w-44 items-center gap-3 rounded-lg border bg-slate-50 p-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <Bot size={19} />
                  <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-blue-500" />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Review queued
                  </p>
                  <p className="text-xs text-slate-500">Usually within 24 hours</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURE_HIGHLIGHTS.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="rounded-lg border bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-950">
                        {feature.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {feature.detail}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Help us understand your factory
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                These answers help us approve and onboard the right workflow for
                you.
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                What is the biggest problem right now?
              </span>
              <Textarea
                value={biggestProblem}
                onChange={(event) => setBiggestProblem(event.target.value)}
                placeholder="Example: purchase bills take too much time, stock is not accurate, payroll is manual..."
                className="min-h-24"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                How are you managing it today?
              </span>
              <Textarea
                value={currentProcess}
                onChange={(event) => setCurrentProcess(event.target.value)}
                placeholder="Excel, Tally, paper registers, WhatsApp, existing software..."
                className="min-h-20"
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Which modules matter most?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map((moduleName) => {
                  const checked = modulesNeeded.includes(moduleName);

                  return (
                    <Label
                      key={moduleName}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleModule(moduleName, value === true)
                        }
                      />
                      {moduleName}
                    </Label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Urgency
                </span>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THIS_WEEK">This week</SelectItem>
                    <SelectItem value="THIS_MONTH">This month</SelectItem>
                    <SelectItem value="NEXT_QUARTER">Next quarter</SelectItem>
                    <SelectItem value="EXPLORING">Just exploring</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Phone
                </span>
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91..."
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Anything else we should know?
              </span>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Factory size, industry, billing volume, team pain points..."
                className="min-h-20"
              />
            </label>

            <Button
              type="submit"
              className="w-full"
              disabled={submitState.isLoading}
            >
              <Sparkles size={16} />
              {submitState.isLoading ? "Saving..." : "Save answers"}
            </Button>
          </form>
        </aside>
      </div>
    </main>
  );
}
