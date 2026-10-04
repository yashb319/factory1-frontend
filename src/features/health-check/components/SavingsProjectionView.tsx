import { BarChart3, CircleGauge, Clock3, IndianRupee, Info, Scale } from "lucide-react";
import { areaLabels } from "../config";
import { formatHoursRange, formatInr, formatInrRange, formatPercentRange } from "../savings";
import type { HealthCheckSavingsProjection } from "../types";

const factorySizeLabels = {
  MICRO: "Micro (1–20 people)",
  SMALL: "Small (21–50 people)",
  MEDIUM: "Medium (51–200 people)",
  LARGE: "Large (more than 200 people)",
} as const;

export function SavingsProjectionView({
  projection,
  compact = false,
}: {
  projection: HealthCheckSavingsProjection | null;
  compact?: boolean;
}) {
  if (!projection) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="savings-unavailable-title">
        <h2 id="savings-unavailable-title" className="text-lg font-semibold">Projected savings snapshot unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This earlier health check does not include a planning estimate. Its practical recommendations remain available above.
        </p>
      </section>
    );
  }

  const { overall } = projection;
  const chartModules = projection.modules.filter((module) => module.estimatedHoursSavedPerMonth.max > 0);
  const maxModuleHours = Math.max(0, ...chartModules.map((module) => module.estimatedHoursSavedPerMonth.max));

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <section className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-950 via-slate-950 to-cyan-950 p-5 text-white shadow-xl print:bg-white print:text-slate-950 print:shadow-none sm:p-8" aria-labelledby="overall-impact-title">
        <div className="flex items-center gap-2 text-cyan-300">
          <Scale size={19} aria-hidden="true" />
          <p className="text-sm font-semibold uppercase tracking-widest">Rough planning range</p>
        </div>
        <h2 id="overall-impact-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Time that may be available for other work
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 print:text-slate-700 sm:text-base">
          This estimate applies cautious realization factors to your self-reported answers. It is a starting point for checking one workflow with your team, not a forecast or guarantee.
        </p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <ImpactMetric icon={<Clock3 aria-hidden="true" />} label="Possible time released / month" value={formatHoursRange(overall.estimatedHoursSavedMonthly)} />
          <ImpactMetric icon={<IndianRupee aria-hidden="true" />} label="Time-cost equivalent / month" value={formatInrRange(overall.estimatedCostSavedMonthlyInr)} />
        </dl>
      </section>

      {chartModules.length > 0 ? (
        <>
          <section className="rounded-2xl border bg-white p-5 sm:p-6" aria-labelledby="module-savings-chart-title">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 shrink-0 text-blue-600" size={21} aria-hidden="true" />
              <div>
                <h2 id="module-savings-chart-title" className="text-lg font-semibold">Possible monthly time released by module</h2>
                <p className="mt-1 text-sm text-slate-600">Use these ranges to choose what to measure first. They are not guaranteed outcomes.</p>
              </div>
            </div>
            <div className="mt-6 space-y-5" role="list" aria-label="Projected monthly hours saved by module">
              {chartModules.map((module) => {
                const minimumWidth = maxModuleHours ? (module.estimatedHoursSavedPerMonth.min / maxModuleHours) * 100 : 0;
                const rangeWidth = maxModuleHours
                  ? ((module.estimatedHoursSavedPerMonth.max - module.estimatedHoursSavedPerMonth.min) / maxModuleHours) * 100
                  : 0;
                return (
                  <div key={`${module.area}-${module.moduleName}`} role="listitem" aria-label={`${module.moduleName}: ${formatHoursRange(module.estimatedHoursSavedPerMonth)} projected per month`}>
                    <div className="mb-2 flex items-end justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">{module.moduleName}</span>
                      <span className="shrink-0 font-semibold text-blue-800">{formatHoursRange(module.estimatedHoursSavedPerMonth)}</span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                      <span className="bg-blue-300" style={{ width: `${minimumWidth}%` }} />
                      <span className="min-w-1 rounded-r-full bg-blue-700" style={{ width: `${rangeWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="module-opportunities-title">
            <div className="flex items-center gap-2">
              <CircleGauge className="text-blue-600" size={21} aria-hidden="true" />
              <h2 id="module-opportunities-title" className="text-lg font-semibold">Module-wise opportunity</h2>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {projection.modules.map((module) => (
                <article key={`${module.area}-${module.moduleName}`} className="rounded-2xl border bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{areaLabels[module.area]}</p>
                      <h3 className="mt-1 text-lg font-semibold">{module.moduleName}</h3>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                      {module.confidence === "MEDIUM" ? "Medium confidence" : "Low confidence"} · Directional, self-reported
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div><dt className="text-xs text-slate-500">Possible time released / month</dt><dd className="mt-1 font-semibold">{formatHoursRange(module.estimatedHoursSavedPerMonth)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Time-cost equivalent / month</dt><dd className="mt-1 font-semibold">{formatInrRange(module.estimatedMonthlyCostSavedInr)}</dd></div>
                  </dl>
                  <p className="mt-4 text-sm leading-6 text-slate-700">{module.reason}</p>
                  {module.evidence.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                      {module.evidence.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-labelledby="low-opportunity-title">
          <h2 id="low-opportunity-title" className="text-lg font-semibold text-emerald-950">Your answers show less obvious manual effort</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            We have not shown speculative estimate bars. Review one real workflow with your team before putting a number on any possible benefit.
          </p>
        </section>
      )}

      <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6" aria-labelledby="projection-assumptions-title">
        <div className="flex items-center gap-2">
          <Info className="text-blue-600" size={20} aria-hidden="true" />
          <h2 id="projection-assumptions-title" className="text-lg font-semibold">Projection assumptions</h2>
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <Assumption label="Factory size band" value={factorySizeLabels[projection.factorySizeBand]} />
          <Assumption label="Loaded hourly labour cost" value={formatInr(projection.assumptions.loadedHourlyLabourCostInr)} />
          <Assumption label="Working days / month" value={String(projection.assumptions.workingDaysPerMonth)} />
          <Assumption label="Realization factor" value={formatPercentRange(projection.assumptions.realizationFactor)} />
          <Assumption label="Projection model" value={projection.modelVersion} />
        </dl>
        <p className="mt-5 border-t pt-4 text-sm leading-6 text-slate-600">
          <strong className="text-slate-800">Important:</strong> {projection.disclaimer}
        </p>
      </section>
    </div>
  );
}

function ImpactMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
      <dt className="flex items-center gap-2 text-xs leading-5 text-slate-300 print:text-slate-600">{icon}{label}</dt>
      <dd className="mt-2 text-lg font-semibold leading-6 text-white print:text-slate-950">{value}</dd>
    </div>
  );
}

function Assumption({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>;
}
