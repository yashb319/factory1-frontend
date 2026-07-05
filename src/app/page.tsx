import Link from "next/link";
import {
  Apple,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Smartphone,
  IndianRupee,
  Laptop,
  Mail,
  MapPin,
  Factory,
  FileText,
  Package,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPricingCards } from "@/features/public-pricing/components/PublicPricingCards";

const contactEmail = "official.factory.one@gmail.com";
const macDownloadUrl =
  process.env.NEXT_PUBLIC_FACTORY1_MAC_DOWNLOAD_URL ??
  "https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-mac-arm64.dmg";
const windowsDownloadUrl =
  process.env.NEXT_PUBLIC_FACTORY1_WINDOWS_DOWNLOAD_URL ??
  "https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-win-x64.exe";
const androidDownloadUrl =
  process.env.NEXT_PUBLIC_FACTORY1_ANDROID_DOWNLOAD_URL ??
  "https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-android.apk";
const iosDownloadUrl =
  process.env.NEXT_PUBLIC_FACTORY1_IOS_DOWNLOAD_URL ??
  "https://github.com/yashb319/factory1-frontend/releases/latest/download/Factory1-ios-project.zip";

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

const terms = [
  "Factory1 is provided as a SaaS platform for factory operations management and business workflow digitization.",
  "Customers are responsible for the correctness of employee, payroll, inventory, billing and tax data entered in the system.",
  "AI responses are designed to assist decision-making, but final business, payroll, GST and compliance decisions should be verified by the factory team or advisor.",
  "Plan limits, AI quotas, feature availability and pricing may change based on usage, infrastructure cost and commercial agreements.",
  "Factory1 aims to protect customer data with authenticated access, role-based permissions and secure cloud deployment practices.",
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
            <a href="#desktop" className="hover:text-slate-950">
              Apps
            </a>
            <a href="#terms" className="hover:text-slate-950">
              Terms
            </a>
            <a href="#contact" className="hover:text-slate-950">
              Contact
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-slate-600">
              <IndianRupee size={15} className="text-blue-600" />
              Flexible SaaS plans
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Start free, then scale with your factory.
            </h2>
            <p className="mt-3 text-slate-600">
              Plans are based on employee count and hosted AI usage. Pricing can
              be finalized after understanding your factory size and rollout
              needs.
            </p>
          </div>

          <Button size="lg" asChild>
            <Link href="/signup">Start free</Link>
          </Button>
        </div>

        <PublicPricingCards />
      </section>

      <section id="desktop" className="border-y bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-600">
              <Smartphone size={15} className="text-blue-600" />
              Apps
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Use Factory1 on desktop and mobile.
            </h2>
            <p className="mt-3 text-slate-600">
              Install Factory1 on Windows, macOS, Android or iOS and open
              directly from the login screen. The apps connect to the live
              Factory1 cloud workspace, so UI and backend improvements arrive
              automatically after deployment.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                Opens directly on the login screen
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                Works with your existing Factory1 account
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                No local database or Java setup needed
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <DownloadCard
              icon={Laptop}
              title="Windows"
              text="Installer for Windows 10 and 11 desktops."
              href={windowsDownloadUrl}
              buttonLabel="Download for Windows"
            />
            <DownloadCard
              icon={Apple}
              title="macOS"
              text="DMG installer for Apple Silicon Macs."
              href={macDownloadUrl}
              buttonLabel="Download for Mac"
            />
            <DownloadCard
              icon={Smartphone}
              title="Android"
              text="APK for Android phones and tablets."
              href={androidDownloadUrl}
              buttonLabel="Download Android APK"
            />
            <DownloadCard
              icon={Apple}
              title="iPhone and iPad"
              text="iOS project package for Apple signing, TestFlight and App Store release."
              href={iosDownloadUrl}
              buttonLabel="Download iOS package"
            />
          </div>
        </div>
      </section>

      <section id="terms" className="border-y bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-600">
              <ShieldCheck size={15} className="text-green-700" />
              Terms and conditions
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Clear operating terms for factory teams.
            </h2>
            <p className="mt-3 text-slate-600">
              These public terms summarize expected use of Factory1. Detailed
              commercial terms can be shared during onboarding.
            </p>
          </div>

          <div className="grid gap-3">
            {terms.map((term) => (
              <div key={term} className="rounded-xl border bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-700">{term}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Contact Factory1
            </h2>
            <p className="mt-3 text-slate-600">
              Reach out for onboarding, pricing, product questions or support.
            </p>
          </div>

          <ContactCard
            icon={Mail}
            title="Email"
            text={contactEmail}
            href={`mailto:${contactEmail}`}
          />
          <ContactCard icon={Clock} title="Response time" text="Within 24 hours" />
          <ContactCard icon={MapPin} title="Made in" text="Bangalore, India" />
          <ContactCard
            icon={ShieldCheck}
            title="Best for"
            text="SME factories digitizing operations"
          />
          <ContactCard
            icon={Bot}
            title="AI support"
            text="Factory data assistance with role-based access"
          />
        </div>
      </section>

      <footer className="border-t bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950">
                <Factory size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Factory1</p>
                <p className="text-xs text-slate-400">Operations OS</p>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Factory1 helps factories manage people, inventory, billing,
              production and AI insights from one practical SaaS workspace.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Company</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <a href="#features" className="hover:text-white">
                Features
              </a>
              <a href="#pricing" className="hover:text-white">
                Pricing
              </a>
              <a href="#desktop" className="hover:text-white">
                Apps
              </a>
              <a href="#terms" className="hover:text-white">
                Terms
              </a>
              <a href="#contact" className="hover:text-white">
                Contact
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Support</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <a href={`mailto:${contactEmail}`} className="hover:text-white">
                {contactEmail}
              </a>
              <span>Response time: 24 hours</span>
              <span>Made in Bangalore</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Factory1. All rights reserved.</span>
            <span>Built for Indian manufacturing teams.</span>
          </div>
        </div>
      </footer>
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

function ContactCard({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon size={21} />
      </div>
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block focus:outline-none focus:ring-2 focus:ring-slate-950">
        {content}
      </a>
    );
  }

  return content;
}

function DownloadCard({
  icon: Icon,
  title,
  text,
  href,
  buttonLabel,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col rounded-2xl border bg-slate-50 p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700">
        <Icon size={21} />
      </div>
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>

      <Button className="mt-auto" asChild>
        <a href={href}>
          <Download size={16} />
          {buttonLabel}
        </a>
      </Button>
    </div>
  );
}
