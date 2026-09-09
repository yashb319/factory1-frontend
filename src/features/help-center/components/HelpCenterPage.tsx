"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CirclePlay,
  History,
  ListChecks,
  Search,
  SearchX,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { moduleTheme } from "@/config/theme";
import { useAppSelector } from "@/lib/hook";
import { cn } from "@/lib/utils";
import type { HelpGuide } from "../types";
import {
  guidesForRole,
  HELP_CENTER_CONTENT_VERSION,
  isGuideStale,
  resolveVideoEmbedUrl,
} from "../content/catalog";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function guideHaystack(guide: HelpGuide) {
  return normalize(
    [
      guide.title,
      guide.summary,
      guide.purpose,
      guide.route,
      guide.contentOwner,
      ...guide.keywords,
      ...guide.steps.map((step) => `${step.title} ${step.detail}`),
      ...guide.keyFields.map((field) => field.name),
      ...(guide.statuses ?? []).map((status) => status.name),
      ...guide.troubleshooting.map((item) => `${item.problem} ${item.fix}`),
    ].join(" ")
  );
}

function formatDate(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HelpCenterPage() {
  const user = useAppSelector((state) => state.auth.user);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const visibleGuides = useMemo(
    () => guidesForRole(user?.role, user?.platformAdmin),
    [user]
  );

  const filteredGuides = useMemo(() => {
    const normalized = normalize(query);
    if (!normalized) {
      return visibleGuides;
    }
    return visibleGuides.filter((guide) =>
      guideHaystack(guide).includes(normalized)
    );
  }, [query, visibleGuides]);

  const staleCount = useMemo(
    () => visibleGuides.filter((guide) => isGuideStale(guide)).length,
    [visibleGuides]
  );

  const latestUpdate = useMemo(
    () =>
      visibleGuides.reduce<string>(
        (latest, guide) =>
          guide.lastUpdated > latest ? guide.lastUpdated : latest,
        ""
      ),
    [visibleGuides]
  );

  // Deep links: /help?module=<id> or /help#<id> scroll to and highlight a guide.
  const requestedModule = searchParams.get("module");
  const lastScrolledRef = useRef<string | null>(null);

  useEffect(() => {
    const hashId =
      typeof window !== "undefined" && window.location.hash
        ? decodeURIComponent(window.location.hash.slice(1))
        : null;
    const targetId = requestedModule ?? hashId;

    if (!targetId || lastScrolledRef.current === targetId) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    lastScrolledRef.current = targetId;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });

    const frame = requestAnimationFrame(() => setHighlightedId(targetId));
    return () => cancelAnimationFrame(frame);
  }, [requestedModule, filteredGuides]);

  if (user?.platformAdmin) {
    return (
      <div className="space-y-6">
        <HelpHeader
          query={query}
          onQueryChange={setQuery}
          resultCount={0}
          totalCount={0}
          staleCount={0}
          latestUpdate=""
        />
        <Card className="rounded-lg">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">
              The Help Center documents factory modules.
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Platform admin accounts manage factories, plans and pricing from
              the SaaS Admin area instead.
            </p>
            <Button asChild variant="outline">
              <Link href="/saas-admin">Open SaaS Admin</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HelpHeader
        query={query}
        onQueryChange={setQuery}
        resultCount={filteredGuides.length}
        totalCount={visibleGuides.length}
        staleCount={staleCount}
        latestUpdate={latestUpdate}
      />

      {filteredGuides.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
            {query ? (
              <>
                <p className="text-sm font-medium">
                  No guides match &quot;{query}&quot;.
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Try a module name like &quot;billing&quot;, a task like
                  &quot;approve leave&quot;, or a term like &quot;GST&quot;.
                </p>
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </>
            ) : (
              <p className="max-w-md text-sm text-muted-foreground">
                Loading guides for your role...
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <nav aria-label="Help modules">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredGuides.map((guide) => (
                <ModuleCard key={guide.id} guide={guide} />
              ))}
            </div>
          </nav>

          <div className="space-y-4">
            {filteredGuides.map((guide) => (
              <GuideSection
                key={guide.id}
                guide={guide}
                highlighted={highlightedId === guide.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HelpHeader({
  query,
  onQueryChange,
  resultCount,
  totalCount,
  staleCount,
  latestUpdate,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  staleCount: number;
  latestUpdate: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Factory1 Help Center
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          How can we help?
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Search module guides for purpose, setup prerequisites, step-by-step
          usage, key fields, statuses and troubleshooting. Content v
          {HELP_CENTER_CONTENT_VERSION}
          {latestUpdate ? ` · updated ${formatDate(latestUpdate)}` : ""}.
        </p>
        {staleCount > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {staleCount} guide{staleCount === 1 ? "" : "s"} due for content
            review
          </p>
        ) : null}
      </div>

      <div className="w-full lg:w-80">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search guides, tasks, statuses..."
            aria-label="Search help guides"
            className="pl-8"
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-muted-foreground" aria-live="polite">
          {query
            ? `${resultCount} of ${totalCount} guides`
            : `${totalCount} guides`}
        </p>
      </div>
    </div>
  );
}

function ModuleCard({ guide }: { guide: HelpGuide }) {
  const Icon = guide.icon;
  const theme = moduleTheme[guide.module];
  const stale = isGuideStale(guide);

  return (
    <a
      href={`#${guide.id}`}
      className="group flex h-full flex-col gap-3 rounded-lg border border-[var(--factory1-border)] bg-white p-4 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--factory1-primary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: theme.light, color: theme.color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        {stale ? (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800"
          >
            Needs review
          </Badge>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">{guide.title}</h2>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {guide.summary}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--factory1-primary)]">
        Read guide
        <ArrowRight
          className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </a>
  );
}

function GuideSection({
  guide,
  highlighted,
}: {
  guide: HelpGuide;
  highlighted: boolean;
}) {
  const Icon = guide.icon;
  const theme = moduleTheme[guide.module];
  const stale = isGuideStale(guide);

  return (
    <section
      id={guide.id}
      tabIndex={-1}
      aria-labelledby={`${guide.id}-title`}
      className={cn(
        "scroll-mt-24 rounded-lg outline-none",
        highlighted && "ring-2 ring-[var(--factory1-primary)] ring-offset-2"
      )}
    >
      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div className="flex gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: theme.light, color: theme.color }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <CardTitle id={`${guide.id}-title`}>{guide.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {guide.purpose}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {stale ? (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-800"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                  Needs review
                </Badge>
              ) : null}
              <Badge variant="secondary">{guide.route}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-5 lg:grid-cols-2">
          <GuideBlock
            icon={<BadgeCheck className="h-4 w-4" aria-hidden />}
            title="Prerequisites & access"
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>
                  Available to: {guide.roles.join(", ")}
                </span>
              </li>
              {guide.prerequisites.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </GuideBlock>

          <GuideBlock
            icon={<ListChecks className="h-4 w-4" aria-hidden />}
            title="How to use it"
          >
            <ol className="space-y-3">
              {guide.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: theme.light, color: theme.color }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </GuideBlock>

          <GuideBlock title="Key fields">
            <dl className="space-y-2">
              {guide.keyFields.map((field) => (
                <div key={field.name} className="text-sm">
                  <dt className="inline font-medium">{field.name}: </dt>
                  <dd className="inline text-muted-foreground">
                    {field.description}
                  </dd>
                </div>
              ))}
            </dl>
          </GuideBlock>

          {guide.statuses?.length ? (
            <GuideBlock title="Statuses">
              <div className="flex flex-wrap gap-2">
                {guide.statuses.map((status) => (
                  <Badge
                    key={status.name}
                    variant="outline"
                    title={status.description}
                    className="cursor-help"
                  >
                    {status.name}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Hover a status to see what it means.
              </p>
            </GuideBlock>
          ) : null}

          <GuideBlock
            icon={<Wrench className="h-4 w-4" aria-hidden />}
            title="Troubleshooting"
            className="lg:col-span-2"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {guide.troubleshooting.map((item) => (
                <div
                  key={item.problem}
                  className="rounded-md border bg-slate-50 p-3"
                >
                  <p className="text-sm font-medium">{item.problem}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.fix}
                  </p>
                </div>
              ))}
            </div>
          </GuideBlock>

          <div className="space-y-4 lg:col-span-2">
            <VideoBlock guide={guide} />
          </div>

          <div className="lg:col-span-2">
            <Separator className="mb-4" />
            <div className="flex flex-col justify-between gap-3 text-xs text-muted-foreground md:flex-row md:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-600">
                  Related routes:
                </span>
                {guide.relatedRoutes.map((route) => (
                  <Link
                    key={`${guide.id}-${route.href}`}
                    href={route.href}
                    className="rounded-md border border-[var(--factory1-border)] px-2 py-1 font-medium text-[var(--factory1-text-secondary)] hover:bg-[var(--factory1-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--factory1-primary)]"
                  >
                    {route.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <History className="h-3.5 w-3.5" aria-hidden />
                  Updated {formatDate(guide.lastUpdated)}
                </span>
                <span>v{guide.contentVersion}</span>
                <span>Owner: {guide.contentOwner}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function GuideBlock({
  title,
  icon,
  className,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function VideoBlock({ guide }: { guide: HelpGuide }) {
  const embedUrl = guide.video ? resolveVideoEmbedUrl(guide.video) : null;

  return (
    <GuideBlock
      icon={<CirclePlay className="h-4 w-4" aria-hidden />}
      title="Video tutorial"
    >
      {guide.video && embedUrl ? (
        <div className="overflow-hidden rounded-md border">
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              title={guide.video.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full"
            />
          </div>
          <p className="border-t bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
            {guide.video.title}
            {guide.video.durationLabel ? ` · ${guide.video.durationLabel}` : ""}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-slate-50 px-4 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
            <CirclePlay className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm font-medium">
            Video walkthrough coming soon
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            A recorded tutorial for {guide.title} has not been published yet.
            The step-by-step guide above covers the same flow.
          </p>
        </div>
      )}
    </GuideBlock>
  );
}
