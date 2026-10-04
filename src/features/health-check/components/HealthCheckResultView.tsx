import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { areaLabels, priorityLabels } from "../config";
import type { HealthCheckResult } from "../types";
import { SavingsProjectionView } from "./SavingsProjectionView";

export function HealthCheckResultView({ result }: { result: HealthCheckResult }) {
  const findings = result.keyFindings.slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
            {priorityLabels[result.priority]}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A practical place to start: {areaLabels[result.primaryArea]}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            {result.explanation}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="rounded-2xl border bg-white p-5 lg:col-span-3 sm:p-6">
            <div className="flex items-center gap-2">
              <Target className="text-blue-600" size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold">What your answers show</h2>
            </div>
            {findings.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {findings.map((finding) => (
                  <li key={finding} className="flex gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} aria-hidden="true" />
                    {finding}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Your result highlights where a connected workflow can create the clearest next step.
              </p>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-5 lg:col-span-2 sm:p-6">
            <div className="flex items-center gap-2">
              <Layers3 className="text-blue-600" size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold">Recommended modules</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.recommendedModules.map((module) => (
                <span key={module} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">
                  {module}
                </span>
              ))}
            </div>
            {result.secondaryAreas.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-slate-950">Also worth reviewing</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {result.secondaryAreas.map((area) => areaLabels[area]).join(" · ")}
                </p>
              </>
            )}
          </section>
        </div>

        <SavingsProjectionView projection={result.savingsProjection} />

        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-white p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">Turn the findings into a practical rollout</h2>
            <p className="mt-1 text-sm text-slate-600">
              Validate one workflow with your team before planning a wider change.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" asChild><Link href="/">Back to Factory1</Link></Button>
            <Button asChild>
              <Link href="/signup">Explore Factory1 <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
