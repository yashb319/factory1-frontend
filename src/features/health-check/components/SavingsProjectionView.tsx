import { BarChart3, Clock3, Info } from "lucide-react";
import { formatHoursRange } from "../savings";
import type { HealthCheckSavingsProjection } from "../types";

export function SavingsProjectionView({
  projection,
  compact = false,
}: {
  projection: HealthCheckSavingsProjection | null;
  compact?: boolean;
}) {
  if (!projection) return null;

  const chartModules = projection.modules.filter(
    (module) => module.estimatedHoursSavedPerMonth.max > 0
  );
  const maxModuleHours = Math.max(
    0,
    ...chartModules.map((module) => module.estimatedHoursSavedPerMonth.max)
  );

  if (chartModules.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-labelledby="low-opportunity-title">
        <h2 id="low-opportunity-title" className="text-lg font-semibold text-emerald-950">
          Start with the operating improvements above
        </h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          Your answers do not support a useful monthly-hours range. Check one real workflow with your team before estimating the time involved.
        </p>
      </section>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <section className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-950 via-slate-950 to-cyan-950 p-5 text-white shadow-xl print:bg-white print:text-slate-950 print:shadow-none sm:p-8" aria-labelledby="overall-impact-title">
        <div className="flex items-center gap-2 text-cyan-300">
          <Clock3 size={19} aria-hidden="true" />
          <p className="text-sm font-semibold uppercase tracking-widest">Cautious planning range</p>
        </div>
        <h2 id="overall-impact-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Time that may become available each month
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 print:text-slate-700 sm:text-base">
          Based on your answers, this is a rough range to check against one real workflow. It is not a promised result.
        </p>
        <dl className="mt-6 max-w-sm">
          <ImpactMetric
            label="Possible time available per month"
            value={formatHoursRange(projection.overall.estimatedHoursSavedMonthly)}
          />
        </dl>
      </section>

      <section className="rounded-2xl border bg-white p-5 sm:p-6" aria-labelledby="module-hours-chart-title">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 shrink-0 text-blue-600" size={21} aria-hidden="true" />
          <div>
            <h2 id="module-hours-chart-title" className="text-lg font-semibold">
              Where that time may come from
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Use these monthly ranges to choose a workflow to observe first.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-5" role="list" aria-label="Possible monthly hours available by module">
          {chartModules.map((module) => {
            const minimumWidth = maxModuleHours
              ? (module.estimatedHoursSavedPerMonth.min / maxModuleHours) * 100
              : 0;
            const rangeWidth = maxModuleHours
              ? ((module.estimatedHoursSavedPerMonth.max - module.estimatedHoursSavedPerMonth.min) / maxModuleHours) * 100
              : 0;
            return (
              <div
                key={`${module.area}-${module.moduleName}`}
                role="listitem"
                aria-label={`${module.moduleName}: ${formatHoursRange(module.estimatedHoursSavedPerMonth)} possible per month`}
              >
                <div className="mb-2 flex items-end justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-800">{module.moduleName}</span>
                  <span className="shrink-0 font-semibold text-blue-800">
                    {formatHoursRange(module.estimatedHoursSavedPerMonth)}
                  </span>
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

      <section className="rounded-2xl border bg-slate-50 p-5 sm:p-6" aria-labelledby="hours-guidance-title">
        <div className="flex items-center gap-2">
          <Info className="text-blue-600" size={20} aria-hidden="true" />
          <h2 id="hours-guidance-title" className="text-lg font-semibold">How to use these ranges</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The ranges are directional and based on self-reported answers. Observe the current work, test one change, and compare the result before planning a wider rollout.
        </p>
      </section>
    </div>
  );
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
      <dt className="text-xs leading-5 text-slate-300 print:text-slate-600">{label}</dt>
      <dd className="mt-2 text-lg font-semibold leading-6 text-white print:text-slate-950">{value}</dd>
    </div>
  );
}
