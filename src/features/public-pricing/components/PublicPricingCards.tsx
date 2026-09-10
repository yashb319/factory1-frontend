"use client";

import Link from "next/link";
import { CheckCircle2, Puzzle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ApiResponse,
  PublicModuleAddon,
  PublicOffer,
  PublicPricingPlan,
} from "../types/publicPricing.types";

const contactEmail = "official.factory.one@gmail.com";
const defaultApiBaseUrl = "https://factory1-backend-oo25.onrender.com";

const fallbackPlans: PublicPricingPlan[] = [
  {
    id: "fallback-contact",
    code: "CONTACT",
    plan: "CONTACT",
    name: "Factory1",
    label: "Factory1",
    monthlyPrice: 0,
    defaultMonthlyPrice: 0,
    annualPrice: 0,
    monthlyPriceFrom: true,
    annualPriceFrom: true,
    currency: "INR",
    gstExtra: true,
    employeeLimit: 1,
    userLimit: 1,
    aiPromptLimit: null,
    aiPromptWindowMinutes: null,
    aiUnlimited: false,
    includedModules: "Factory operations modules",
    serviceOfferings: "Factory operations modules",
    idealFor: "Tell us about your team and the modules you need.",
    displayNote: "Contact us for current plans and allowances.",
    badge: null,
    tag: null,
    higherScaleCopy: "Pricing is temporarily unavailable online.",
    active: true,
    displayOrder: 10,
  },
];

export function PublicPricingCards() {
  const [plans, setPlans] = useState<PublicPricingPlan[]>([]);
  const [addons, setAddons] = useState<PublicModuleAddon[]>([]);
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPricing() {
      setIsFetching(true);

      const [plansResult, addonsResult, offersResult] = await Promise.allSettled([
        fetchApi<PublicPricingPlan[]>("/api/public/plans"),
        fetchApi<PublicModuleAddon[]>("/api/public/add-ons"),
        fetchApi<PublicOffer[]>("/api/public/offers"),
      ]);

      if (!active) return;

      if (plansResult.status === "fulfilled") {
        setPlans(sortVisible(plansResult.value));
      } else {
        setPlans(fallbackPlans);
      }

      setAddons(
        addonsResult.status === "fulfilled" ? sortVisible(addonsResult.value) : []
      );
      setOffers(offersResult.status === "fulfilled" ? offersResult.value : []);
      setIsFetching(false);
    }

    void loadPricing();

    return () => {
      active = false;
    };
  }, []);

  const offer = bestDiscountOffer(offers);

  return (
    <div className="mt-10 space-y-10">
      {plans.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="relative flex min-h-[430px] flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-sm"
            >
              {plan.badge || plan.tag ? (
                <Badge className="absolute right-4 top-4 bg-blue-700 text-white">
                  {plan.badge || plan.tag}
                </Badge>
              ) : null}

              <div className={plan.badge || plan.tag ? "pr-28" : undefined}>
                <p className="text-sm font-semibold text-blue-700">
                  {plan.name || plan.label}
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  {plan.idealFor || plan.displayNote || "Flexible factory management"}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                <PlanPrice
                  label="Monthly"
                  price={plan.monthlyPrice ?? plan.defaultMonthlyPrice}
                  currency={plan.currency}
                  from={plan.monthlyPriceFrom}
                  offer={offer}
                />
                <PlanPrice
                  label="Annual"
                  price={plan.annualPrice}
                  currency={plan.currency}
                  from={plan.annualPriceFrom}
                />
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
                {plan.id !== "fallback-contact" ? (
                  <>
                    <PlanLine text={`Up to ${plan.employeeLimit} employees`} />
                    <PlanLine text={`Up to ${plan.userLimit} users`} />
                  </>
                ) : null}
                {plan.aiPromptLimit != null && plan.aiPromptWindowMinutes != null ? (
                  <PlanLine
                    text={`${plan.aiPromptLimit} hosted AI prompts every ${plan.aiPromptWindowMinutes} minutes`}
                  />
                ) : null}
                {splitCopy(plan.includedModules || plan.serviceOfferings).map((feature) => (
                  <PlanLine key={feature} text={feature} />
                ))}
              </div>

              <div className="mt-5 space-y-1 text-xs text-slate-500">
                {plan.gstExtra ? <p>GST extra as applicable.</p> : <p>GST included.</p>}
                {plan.higherScaleCopy ? <p>{plan.higherScaleCopy}</p> : null}
              </div>

              <Button className="mt-auto pt-3" variant="outline" asChild>
                <Link href={`mailto:${contactEmail}`}>Contact sales</Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-950">
            {isFetching ? "Loading current pricing..." : "Pricing is available on request"}
          </p>
          {!isFetching ? (
            <Button className="mt-4" variant="outline" asChild>
              <Link href={`mailto:${contactEmail}`}>Contact sales</Link>
            </Button>
          ) : null}
        </div>
      )}

      {addons.length ? (
        <section aria-labelledby="module-addons-heading">
          <div className="mx-auto max-w-2xl text-center">
            <h3 id="module-addons-heading" className="text-2xl font-semibold text-slate-950">
              Add the modules your team needs
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Extend a plan with focused capabilities as your operations grow.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((addon) => (
              <article key={addon.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Puzzle size={17} className="text-blue-700" />
                    <h4 className="font-semibold text-slate-950">{addon.name}</h4>
                  </div>
                  {addon.gstExtra ? (
                    <span className="text-[11px] text-slate-500">+ GST</span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <p className="font-semibold text-slate-950">
                    {formatCurrency(addon.monthlyPrice, addon.currency)}
                    <span className="text-xs font-normal text-slate-500">/mo</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {formatCurrency(addon.annualPrice, addon.currency)}/yr
                  </p>
                </div>
                {addon.positioningText ? (
                  <p className="mt-3 text-sm text-slate-600">{addon.positioningText}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PlanPrice({
  label,
  price,
  currency,
  from,
  offer,
}: {
  label: string;
  price: number;
  currency: string;
  from: boolean;
  offer?: PublicOffer;
}) {
  const numericPrice = Number(price ?? 0);
  const discount = Number(offer?.discountPercent ?? 0);
  const discountedPrice =
    label === "Monthly" && numericPrice > 0 && discount > 0
      ? Math.max(0, Math.round(numericPrice * (1 - discount / 100)))
      : null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {discountedPrice != null ? (
        <>
          <p className="mt-1 text-xs text-slate-400 line-through">
            {formatCurrency(numericPrice, currency)}
          </p>
          <p className="text-lg font-semibold text-slate-950">
            {from ? "From " : ""}
            {formatCurrency(discountedPrice, currency)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-lg font-semibold text-slate-950">
          {from ? "From " : ""}
          {numericPrice > 0 ? formatCurrency(numericPrice, currency) : "Contact us"}
        </p>
      )}
    </div>
  );
}

function bestDiscountOffer(offers: PublicOffer[]) {
  return offers
    .filter((offer) => offer.active && Number(offer.discountPercent ?? 0) > 0)
    .sort(
      (first, second) =>
        Number(second.discountPercent ?? 0) - Number(first.discountPercent ?? 0)
    )[0];
}

function splitCopy(value?: string | null) {
  return (value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortVisible<T extends { active: boolean; displayOrder: number }>(items: T[]) {
  return items
    .filter((item) => item.active)
    .sort((first, second) => first.displayOrder - second.displayOrder);
}

async function fetchApi<T>(path: string) {
  const response = await fetch(`${apiBaseUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

  const body = (await response.json()) as ApiResponse<T>;
  if (!body || !("data" in body)) throw new Error("Response did not include data");
  return body.data;
}

function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8080";
  }
  return defaultApiBaseUrl;
}

function formatCurrency(price: number, currency: string) {
  const currencyCode = /^[A-Z]{3}$/.test(currency) ? currency : "INR";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));
}

function PlanLine({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
      <span>{text}</span>
    </div>
  );
}
