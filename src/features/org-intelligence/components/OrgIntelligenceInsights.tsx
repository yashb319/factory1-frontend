"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { DepartmentRollup, LayerRollup } from "../utils/orgIntelligence.utils";
import { formatOrgCurrency } from "../utils/orgIntelligence.utils";

interface Props {
  departmentRollups: DepartmentRollup[];
  layerRollups: LayerRollup[];
  currency: string;
}

export function OrgIntelligenceInsights({ departmentRollups, layerRollups, currency }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={() => setOpen((current) => !current)}
      >
        <h3 className="text-sm font-semibold">Team &amp; layer cost rollups</h3>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="grid gap-6 border-t p-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Known monthly payroll cost by department
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentRollups} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="department"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatOrgCurrency(Number(value), currency)}
                    labelFormatter={(label) => `Department: ${label}`}
                  />
                  <Bar dataKey="knownMonthlyCost" fill="#9333EA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Known monthly payroll cost by reporting layer
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={layerRollups} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatOrgCurrency(Number(value), currency)}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="knownMonthlyCost" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
