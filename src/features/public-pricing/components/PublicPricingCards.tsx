"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  ApiResponse,
  OrganizationPlan,
  PublicPlanOption,
} from "../types/publicPricing.types";

const contactEmail = "official.factory.one@gmail.com";
const defaultApiBaseUrl = "https://factory1-backend-oo25.onrender.com";

const fallbackPlans: PublicPlanOption[] = [
  {
    plan: "FREE",
    label: "Free",
    employeeLimit: 20,
    aiPromptLimit: 10,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 0,
  },
  {
    plan: "STARTER",
    label: "Starter",
    employeeLimit: 50,
    aiPromptLimit: 20,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 0,
  },
  {
    plan: "GROWTH",
    label: "Growth",
    employeeLimit: 100,
    aiPromptLimit: 50,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 0,
  },
  {
    plan: "ENTERPRISE",
    label: "Enterprise",
    employeeLimit: null,
    aiPromptLimit: null,
    aiPromptWindowMinutes: 5,
    aiUnlimited: true,
    defaultMonthlyPrice: 0,
  },
];

const planContent: Record<
  OrganizationPlan,
  {
    note: string;
    features: string[];
  }
> = {
  FREE: {
    note: "For a small factory trial",
    features: ["Core factory modules", "Email OTP signup", "Starter reports"],
  },
  STARTER: {
    note: "For growing daily operations",
    features: ["All core modules", "Import and export history", "Role-based access"],
  },
  GROWTH: {
    note: "For multi-team factories",
    features: ["Advanced dashboard", "AI across modules", "Priority onboarding help"],
  },
  ENTERPRISE: {
    note: "For larger factory groups",
    features: ["Custom quotas", "Dedicated setup support", "Plan-level controls"],
  },
};

const planOrder: OrganizationPlan[] = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"];

export function PublicPricingCards() {
  const [remotePlans, setRemotePlans] = useState<PublicPlanOption[] | undefined>();
  const [isFetching, setIsFetching] = useState(true);
  const plans = mergePlans(remotePlans);

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      setIsFetching(true);

      try {
        const response = await fetch(`${apiBaseUrl()}/api/public/plans`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not fetch public pricing");
        }

        const body = (await response.json()) as ApiResponse<PublicPlanOption[]>;

        if (active) {
          setRemotePlans(body.data);
        }
      } catch {
        if (active) {
          setRemotePlans(undefined);
        }
      } finally {
        if (active) {
          setIsFetching(false);
        }
      }
    }

    void loadPlans();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-4">
      {plans.map((plan) => {
        const content = planContent[plan.plan];

        return (
          <div
            key={plan.plan}
            className="flex min-h-[360px] flex-col rounded-2xl border bg-white p-6 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-blue-700">{plan.label}</p>
                {isFetching ? (
                  <span className="text-xs text-slate-400">Updating</span>
                ) : null}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {formatPrice(plan)}
              </div>
              <p className="mt-2 text-sm text-slate-500">{content.note}</p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <PlanLine text={formatEmployeeLimit(plan.employeeLimit)} />
              <PlanLine text={formatAiLimit(plan)} />
              {content.features.map((feature) => (
                <PlanLine key={feature} text={feature} />
              ))}
            </div>

            <Button className="mt-auto" variant="outline" asChild>
              <Link href={plan.plan === "FREE" ? "/signup" : `mailto:${contactEmail}`}>
                {plan.plan === "FREE" ? "Create account" : "Contact sales"}
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function mergePlans(plans?: PublicPlanOption[]) {
  const planMap = new Map<OrganizationPlan, PublicPlanOption>();

  fallbackPlans.forEach((plan) => planMap.set(plan.plan, plan));
  plans?.forEach((plan) => planMap.set(plan.plan, plan));

  return planOrder.map((plan) => planMap.get(plan)).filter(Boolean) as PublicPlanOption[];
}

function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8080";
  }

  return defaultApiBaseUrl;
}

function formatPrice(plan: PublicPlanOption) {
  if (plan.plan === "ENTERPRISE" && Number(plan.defaultMonthlyPrice) <= 0) {
    return "Custom";
  }

  const price = Number(plan.defaultMonthlyPrice ?? 0);

  if (price <= 0) {
    return "₹0";
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(price)}/mo`;
}

function formatEmployeeLimit(employeeLimit: number | null) {
  return employeeLimit ? `Up to ${employeeLimit} employees` : "Unlimited employees";
}

function formatAiLimit(plan: PublicPlanOption) {
  if (plan.aiUnlimited) {
    return "Unlimited hosted AI prompts";
  }

  return `${plan.aiPromptLimit ?? 0} hosted AI prompts every ${
    plan.aiPromptWindowMinutes
  } minutes`;
}

function PlanLine({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
      <span>{text}</span>
    </div>
  );
}
