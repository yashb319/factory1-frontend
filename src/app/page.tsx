import Link from "next/link";
import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  Factory,
  FileText,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Employee Management",
    description: "Manage workers, departments, salary types and employee records.",
    icon: Users,
  },
  {
    title: "Attendance",
    description: "Track daily attendance and reduce manual register work.",
    icon: CalendarCheck,
  },
  {
    title: "Payroll",
    description: "Generate salary calculations from attendance and salary rules.",
    icon: Wallet,
  },
  {
    title: "Inventory",
    description: "Track stock, low inventory and material movement.",
    icon: Package,
  },
  {
    title: "Billing",
    description: "Create invoices and manage customer billing workflows.",
    icon: FileText,
  },
  {
    title: "AI Insights",
    description: "Get smart alerts for attendance, payroll, stock and operations.",
    icon: Bot,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Factory size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Factory1</p>
              <p className="text-xs text-slate-500">Operations OS</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-950">
              Features
            </a>
            <a href="#why" className="hover:text-slate-950">
              Why Factory1
            </a>
            <a href="#pricing" className="hover:text-slate-950">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>

            <Button asChild>
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-slate-600">
            <Bot size={15} className="text-blue-600" />
            AI-powered factory operations
          </div>

          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950">
            Run your factory smarter without ERP complexity.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-600">
            Factory1 helps small and mid-sized factories manage employees,
            attendance, payroll, inventory, billing and AI insights from one
            simple workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">Create your organization</Link>
            </Button>

            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              No heavy ERP setup
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              Built for SMEs
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              AI insights included
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="rounded-2xl border bg-slate-50 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Today’s Factory Status
                </p>
                <p className="text-xs text-slate-500">
                  ABC Manufacturing Workspace
                </p>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Running smoothly
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewCard label="Employees Present" value="142 / 154" />
              <PreviewCard label="Attendance Rate" value="92%" />
              <PreviewCard label="Monthly Payroll" value="₹4.8L" />
              <PreviewCard label="Low Stock Items" value="24" />
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Bot size={16} className="text-blue-600" />
                AI Insight
              </div>
              <p className="text-sm text-slate-600">
                Overtime is increasing in the stitching department. Review shift
                allocation before payroll generation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            Everything your factory needs in one workspace.
          </h2>
          <p className="mt-3 text-slate-600">
            Start with attendance and payroll. Expand into inventory, billing,
            suppliers, customers and AI-powered decision making.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="rounded-2xl border bg-white p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon size={21} />
                </div>
                <h3 className="font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="why" className="border-y bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-3">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Built for small factories, not corporate ERPs.
            </h2>
          </div>

          <div className="lg:col-span-2 grid gap-5 md:grid-cols-3">
            <WhyCard title="Simple" text="Easy screens your team can understand quickly." />
            <WhyCard title="Affordable" text="Designed for SME budgets, not enterprise pricing." />
            <WhyCard title="Intelligent" text="AI highlights problems before they become costly." />
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border bg-slate-950 p-8 text-white md:p-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">
              Start your pilot with Factory1.
            </h2>
            <p className="mt-3 text-slate-400">
              Built for early factory testing. Start with core modules and grow
              as your operations move online.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">Create organization</Link>
              </Button>

              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function WhyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}