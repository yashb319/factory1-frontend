"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  ApiResponse,
  OrganizationPlan,
  PublicOffer,
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
    displayNote: "For a small factory trial",
    serviceOfferings: "All Factory1 modules, Email OTP signup, Standard reports",
  },
  {
    plan: "STARTER",
    label: "Starter",
    employeeLimit: 50,
    aiPromptLimit: 20,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 999,
    displayNote: "For growing daily operations",
    serviceOfferings: "All Factory1 modules, Import and export history, Role-based access",
  },
  {
    plan: "GROWTH",
    label: "Growth",
    employeeLimit: 100,
    aiPromptLimit: 50,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 2499,
    displayNote: "For multi-team factories",
    serviceOfferings: "All Factory1 modules, Advanced dashboard, AI across modules, Priority onboarding help",
  },
  {
    plan: "BUSINESS",
    label: "Business",
    employeeLimit: 250,
    aiPromptLimit: 100,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 4999,
    displayNote: "For larger operating teams",
    serviceOfferings: "All Factory1 modules, Higher employee limits, Higher AI quota, Priority onboarding help",
  },
  {
    plan: "ENTERPRISE",
    label: "Enterprise",
    employeeLimit: null,
    aiPromptLimit: null,
    aiPromptWindowMinutes: 5,
    aiUnlimited: true,
    defaultMonthlyPrice: 0,
    displayNote: "Unlimited + dedicated support",
    serviceOfferings: "All Factory1 modules, Unlimited employees, Unlimited hosted AI prompts, Dedicated setup support, Plan-level controls",
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
    features: ["All Factory1 modules", "AI across modules", "Priority onboarding help"],
  },
  BUSINESS: {
    note: "For larger operating teams",
    features: ["All Factory1 modules", "Higher employee limits", "Higher AI quota"],
  },
  ENTERPRISE: {
    note: "Unlimited + dedicated support",
    features: ["All Factory1 modules", "Dedicated setup support", "Plan-level controls"],
  },
};

const planOrder: OrganizationPlan[] = ["FREE", "STARTER", "GROWTH", "BUSINESS", "ENTERPRISE"];

export function PublicPricingCards() {
  const [remotePlans, setRemotePlans] = useState<PublicPlanOption[] | undefined>();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
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
        const offersResponse = await fetch(`${apiBaseUrl()}/api/public/offers`, {
          cache: "no-store",
        });
        const offersBody = offersResponse.ok
          ? ((await offersResponse.json()) as ApiResponse<PublicOffer[]>)
          : undefined;

        if (active) {
          setRemotePlans(body.data);
          setOffers(offersBody?.data ?? []);
        }
      } catch {
        if (active) {
          setRemotePlans(undefined);
          setOffers([]);
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
    <div className="mt-10 space-y-5">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {plans.map((plan) => {
          const content = planContent[plan.plan];
          const offer = bestDiscountOffer(offers);

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
                  <PlanPrice plan={plan} offer={offer} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {plan.displayNote || content.note}
                </p>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <PlanLine text={formatEmployeeLimit(plan.employeeLimit)} />
                <PlanLine text={formatAiLimit(plan)} />
                {serviceOfferings(plan, content.features).map((feature) => (
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

function PlanPrice({
  plan,
  offer,
}: {
  plan: PublicPlanOption;
  offer?: PublicOffer;
}) {
  const price = Number(plan.defaultMonthlyPrice ?? 0);
  const discount = Number(offer?.discountPercent ?? 0);

  if (plan.plan === "ENTERPRISE" && price <= 0) {
    return <span>Custom</span>;
  }

  if (price <= 0 || discount <= 0) {
    return <span>{formatPrice(plan)}</span>;
  }

  const discountedPrice = Math.max(0, Math.round(price * (1 - discount / 100)));
  const code = offer?.code?.trim();
  const validUntil = offer?.validUntil?.trim();
  const tooltip = [
    offer?.title?.trim(),
    code ? `Code: ${code}` : undefined,
    validUntil ? `Valid till: ${validUntil}` : undefined,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <span className="inline-flex flex-wrap items-baseline gap-2" title={tooltip}>
      <span className="text-lg text-slate-400 line-through">
        {formatCurrency(price)}
      </span>
      <span>{formatCurrency(discountedPrice)}/mo</span>
    </span>
  );
}

function bestDiscountOffer(offers: PublicOffer[]) {
  return offers
    .filter((offer) => Number(offer.discountPercent ?? 0) > 0)
    .sort(
      (first, second) =>
        Number(second.discountPercent ?? 0) - Number(first.discountPercent ?? 0)
    )[0];
}

function formatCurrency(price: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(price)}`;
}

function serviceOfferings(plan: PublicPlanOption, fallback: string[]) {
  const offerings = plan.serviceOfferings
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return offerings?.length ? offerings : fallback;
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
