"use client";

import {
  Bot,
  Building2,
  CalendarCheck,
  FileSpreadsheet,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  PackageCheck,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModuleDoc = {
  id: string;
  title: string;
  route: string;
  owner: string;
  icon: ComponentType<{ className?: string }>;
  purpose: string;
  simpleFlow: string[];
  testingChecklist: string[];
  commonQuestions: string[];
  notes?: string[];
};

const moduleDocs: ModuleDoc[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/dashboard",
    owner: "Factory owner / manager",
    icon: LayoutDashboard,
    purpose:
      "Shows the current health of the factory in one place: employees, attendance, stock, payroll, billing and pending work.",
    simpleFlow: [
      "Open Dashboard after login.",
      "Check the numbers and warning cards.",
      "Click a module when any number looks wrong or needs action.",
    ],
    testingChecklist: [
      "A new factory should show empty but helpful starter steps.",
      "After adding employees, stock or bills, dashboard numbers should change.",
      "Shortcuts and module links should take the user to the correct page.",
    ],
    commonQuestions: [
      "Why is my dashboard empty?",
      "Which module should I set up first?",
      "Are these numbers live or manual?",
    ],
  },
  {
    id: "employees",
    title: "Employees",
    route: "/employees",
    owner: "HR / owner / admin",
    icon: Users,
    purpose:
      "Keeps employee records such as name, phone, department, salary details, photos and work status.",
    simpleFlow: [
      "Add departments and employee details.",
      "Upload employee photo when using auto attendance.",
      "Keep mobile number, joining date and status updated.",
    ],
    testingChecklist: [
      "Create, edit and deactivate an employee.",
      "Upload a photo and check it is saved.",
      "Confirm role-based users can only see allowed employee data.",
    ],
    commonQuestions: [
      "Can employees login separately?",
      "Can I upload employee photo directly?",
      "What happens if an employee leaves?",
    ],
  },
  {
    id: "attendance",
    title: "Attendance",
    route: "/attendance",
    owner: "HR / supervisor",
    icon: CalendarCheck,
    purpose:
      "Tracks who is present, absent, late or on leave. It also supports automatic attendance using the capture website and organization key.",
    simpleFlow: [
      "Set the attendance capture key from organization settings.",
      "Use the capture website for QR/photo-based check-in and check-out.",
      "Review daily attendance and punch history inside Factory1.",
    ],
    testingChecklist: [
      "Mark attendance manually.",
      "Use capture key on the attendance capture website.",
      "Scan/check-in an employee multiple times and verify in/out punch log.",
      "Check total work hours use first check-in and last checkout.",
    ],
    commonQuestions: [
      "Where do I get the capture key?",
      "Can an employee go out multiple times?",
      "Can this later work with RFID or camera hardware?",
    ],
    notes: [
      "Capture site: https://attendance-capture.factory1.in/",
    ],
  },
  {
    id: "payroll",
    title: "Payroll",
    route: "/payroll",
    owner: "Finance / HR",
    icon: Wallet,
    purpose:
      "Calculates employee salary runs using employee salary data and attendance information.",
    simpleFlow: [
      "Make sure employees and attendance are updated.",
      "Choose the payroll period.",
      "Generate payroll and review each employee amount before final use.",
    ],
    testingChecklist: [
      "Generate payroll for a month.",
      "Check missing attendance or employee salary cases.",
      "Verify the generate button is easy to find and repeat safely.",
    ],
    commonQuestions: [
      "Why did payroll not generate?",
      "Does attendance affect salary?",
      "Can I export payroll?",
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    route: "/inventory",
    owner: "Store / production team",
    icon: Package,
    purpose:
      "Maintains stock of raw material, finished goods and other factory items. Billing can increase or reduce stock automatically.",
    simpleFlow: [
      "Add inventory items with unit, HSN and GST details.",
      "Record manual stock movements when needed.",
      "Use supplier bills to increase stock and sales bills to reduce stock.",
    ],
    testingChecklist: [
      "Create an item with GST and HSN.",
      "Try stock in and stock out movements.",
      "Post a purchase bill and check stock increases.",
      "Post a sales bill and check stock decreases, including negative stock cases.",
    ],
    commonQuestions: [
      "Can stock go negative?",
      "Can GST/HSN be suggested by AI?",
      "How do I know low stock items?",
    ],
  },
  {
    id: "products",
    title: "Products & Production",
    route: "/products",
    owner: "Production manager",
    icon: PackageCheck,
    purpose:
      "Connects finished products with their bill of materials so production can consume raw materials and produce finished goods.",
    simpleFlow: [
      "Create finished products.",
      "Add BOM items and quantity needed.",
      "Use production entry to convert raw material into finished goods.",
    ],
    testingChecklist: [
      "Create a product and BOM.",
      "Run a production entry.",
      "Check raw material decreases and finished good increases.",
    ],
    commonQuestions: [
      "What is BOM?",
      "Can one product use multiple raw materials?",
      "Does production affect inventory automatically?",
    ],
  },
  {
    id: "billing",
    title: "Billing",
    route: "/billing",
    owner: "Finance / billing team",
    icon: FileText,
    purpose:
      "Creates sales bills for customers and purchase bills for suppliers. It updates stock, GST and accounting automatically.",
    simpleFlow: [
      "Choose Sales or Purchase voucher.",
      "Select customer or supplier ledger.",
      "Add items, quantity, GST and rate.",
      "Post the bill after reviewing total, tax and stock impact.",
    ],
    testingChecklist: [
      "Create a sales bill and print it.",
      "Create a supplier bill and confirm stock increases.",
      "Try payment update.",
      "Cancel a bill and confirm stock/accounting reversal.",
      "Export billing data.",
    ],
    commonQuestions: [
      "What is the difference between draft and posted?",
      "Why did stock change after posting?",
      "Where can I see GST reports?",
    ],
  },
  {
    id: "accounting",
    title: "Accounting",
    route: "/accounting",
    owner: "Finance / CA",
    icon: Landmark,
    purpose:
      "Gives Tally-like accounting: groups, ledgers, vouchers, day book, cash/bank book, P&L, balance sheet, trial balance, GST and outstanding reports.",
    simpleFlow: [
      "Create or review account groups and ledgers.",
      "Post manual vouchers like payment, receipt, contra or journal.",
      "Review Day Book, Cash/Bank Book and reports.",
      "Export reports for CA review.",
    ],
    testingChecklist: [
      "Create a manual payment voucher.",
      "Edit and cancel a manual voucher.",
      "Confirm bill-generated vouchers cannot be edited from Accounting.",
      "Download P&L, Balance Sheet, Trial Balance and Group Summary.",
      "Check keyboard commands F4-F11 or the command strip.",
    ],
    commonQuestions: [
      "Why can I not edit a billing voucher here?",
      "What is debit and credit?",
      "Can I download P&L for CA?",
    ],
  },
  {
    id: "suppliers",
    title: "Suppliers",
    route: "/suppliers",
    owner: "Purchase / store team",
    icon: Truck,
    purpose:
      "Stores supplier details used for purchase bills, GST details and material sourcing.",
    simpleFlow: [
      "Add supplier name, GST, contact and address.",
      "Use supplier while creating purchase bill.",
      "Keep supplier data clean for accounting and GST.",
    ],
    testingChecklist: [
      "Create and edit a supplier.",
      "Use supplier in purchase bill.",
      "Check GST/address auto-fill in billing.",
    ],
    commonQuestions: [
      "Why should I add GST number?",
      "Can one supplier provide multiple items?",
      "Can I import suppliers?",
    ],
  },
  {
    id: "customers",
    title: "Customers",
    route: "/customers",
    owner: "Sales / finance team",
    icon: UserRound,
    purpose:
      "Stores customer details for sales billing, receivables, GST and follow-up.",
    simpleFlow: [
      "Add customer name, GST, phone and billing address.",
      "Use customer in sales billing.",
      "Review receivable status from Accounting.",
    ],
    testingChecklist: [
      "Create and edit a customer.",
      "Use customer in sales bill.",
      "Check GST/address auto-fill in billing.",
    ],
    commonQuestions: [
      "Can I track pending customer payments?",
      "Where does customer GST show?",
      "Can I search customer by phone?",
    ],
  },
  {
    id: "import-export",
    title: "Import / Export",
    route: "/import-export",
    owner: "Admin / data operator",
    icon: FileSpreadsheet,
    purpose:
      "Keeps a history of import and export jobs so large data work does not feel lost or hidden.",
    simpleFlow: [
      "Start import or export from supported modules.",
      "Come here to check job status and history.",
      "Download output files when available.",
    ],
    testingChecklist: [
      "Export employees, billing or accounting report.",
      "Check the job appears in history.",
      "Confirm output file is downloadable when the export supports it.",
    ],
    commonQuestions: [
      "Why did my export not download immediately?",
      "Where can I see old exports?",
      "Can OCR import bills later?",
    ],
  },
  {
    id: "ai",
    title: "AI Assistant",
    route: "/ai",
    owner: "All allowed users",
    icon: Bot,
    purpose:
      "Lets users ask questions about factory data. It should respect role access and answer from real modules wherever possible.",
    simpleFlow: [
      "Open AI or the floating assistant.",
      "Ask about employees, stock, billing, accounting or dashboard.",
      "Use suggested questions when unsure what to ask.",
    ],
    testingChecklist: [
      "Ask simple data questions that should be answered from database.",
      "Ask chart/report questions.",
      "Check finance users cannot access unauthorized data.",
      "Check quota behavior after prompt limit.",
    ],
    commonQuestions: [
      "Why did AI not find a record?",
      "Does AI use my real factory data?",
      "What happens when AI quota is over?",
    ],
  },
  {
    id: "organization-settings",
    title: "Organization Settings",
    route: "/organization-settings",
    owner: "Owner / admin",
    icon: Building2,
    purpose:
      "Controls factory profile, employees login access, attendance key, roles and other organization-level settings.",
    simpleFlow: [
      "Complete factory profile during or after signup.",
      "Create employee users and assign roles.",
      "Set attendance capture key if using auto attendance.",
    ],
    testingChecklist: [
      "Create employee login.",
      "Test role-based access with different users.",
      "Update factory address/GST and check billing auto-fill.",
    ],
    commonQuestions: [
      "How can employees login?",
      "Who can change settings?",
      "Where is the attendance capture key?",
    ],
  },
  {
    id: "saas-admin",
    title: "SaaS Admin",
    route: "/saas-admin",
    owner: "Factory1 SaaS owner",
    icon: ShieldCheck,
    purpose:
      "Lets the platform owner see registered factories, plans, quotas, usage and pricing.",
    simpleFlow: [
      "Login as SaaS owner.",
      "Review factories, owners, employees and usage.",
      "Change plans, pricing and AI quota settings when needed.",
    ],
    testingChecklist: [
      "Confirm only SaaS owner can open this page.",
      "Change plan prices and verify public pricing.",
      "Update AI quota settings for an organization.",
    ],
    commonQuestions: [
      "Who can access SaaS Admin?",
      "Can plans be changed from UI?",
      "Where do public pricing cards get data?",
    ],
  },
];

const logicalTestingPath = [
  {
    title: "1. Login and check starter data",
    checks: [
      "Login with official.factory.one@gmail.com.",
      "Open Dashboard and confirm employees, attendance, inventory, billing and accounting are not empty.",
      "Open Docs from sidebar and keep this path open for reference.",
    ],
  },
  {
    title: "2. People and attendance flow",
    checks: [
      "Open Employees and search Rahul Kumar. Confirm phone, department and status are visible.",
      "Open Attendance and check today's manual attendance plus punch activity.",
      "Open Organization Settings and confirm the attendance capture key exists.",
    ],
  },
  {
    title: "3. Inventory and production flow",
    checks: [
      "Open Inventory and check raw materials plus finished goods.",
      "Confirm low-stock items are visible, especially Copper Motor Coil or Powder Coating Paint.",
      "Open Products & Production and check BOM for Industrial Control Cabinet.",
      "Run or inspect production entry and verify it connects raw material to finished goods.",
    ],
  },
  {
    title: "4. Billing flow",
    checks: [
      "Open Billing and create a Sales voucher for Alpha Automation.",
      "Confirm GST/address auto-fill after selecting the party.",
      "Post the bill and check finished goods stock decreases.",
      "Create a Purchase voucher from Bharat Steel Traders and check raw material stock increases.",
      "Print a bill and export billing data.",
    ],
  },
  {
    title: "5. Accounting flow without CA knowledge",
    checks: [
      "Open Accounting > Overview. Receivables should show customer pending money and Payables should show supplier pending money.",
      "Open Vouchers. Bill-generated vouchers show as Billing source and should not be editable here.",
      "Create a manual Payment voucher: Debit Factory Electricity Expense and Credit HDFC Bank Current A/c with the same amount.",
      "Use Auto Balance if debit and credit do not match.",
      "Edit the manual voucher, then cancel it with a reason. This tests audit-safe voucher lifecycle.",
    ],
  },
  {
    title: "6. CA/report flow",
    checks: [
      "Open Accounting > Cash/Bank and check HDFC Bank Current A/c running balance.",
      "Open Reports and download P&L, Balance Sheet, Trial Balance, Group Summary and Monthly Voucher Summary.",
      "Open ledger drilldown by clicking a ledger name in reports.",
      "Open Import / Export and confirm export jobs/history are visible.",
    ],
  },
  {
    title: "7. AI and role access flow",
    checks: [
      "Ask AI: What is Rahul Kumar's mobile number?",
      "Ask AI: Show low stock items.",
      "Ask AI: Summarize receivables and payables.",
      "Login with a non-finance role if available and confirm finance/accounting answers are restricted.",
    ],
  },
];

export function DocsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Factory1 Help
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Module Documentation
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Plain-language guide for factory owners, testers and new users. Use
            it to understand what each module does, how to test it, and what
            questions users commonly ask.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>

      <Card className="rounded-lg">
        <CardContent className="p-3">
          <div className="flex gap-2 overflow-x-auto">
            {moduleDocs.map((module) => (
              <a
                key={module.id}
                href={`#${module.id}`}
                className="whitespace-nowrap rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                {module.title}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Recommended Testing Path</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow this order when testing the demo data. It moves from simple
            records to stock, billing, accounting and AI so each module has the
            data it needs.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {logicalTestingPath.map((step) => (
            <div key={step.title} className="rounded-md border bg-slate-50 p-4">
              <h2 className="text-sm font-semibold">{step.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {step.checks.map((check) => (
                  <li key={check} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {moduleDocs.map((module) => {
          const Icon = module.icon;

          return (
            <section id={module.id} key={module.id} className="scroll-mt-24">
              <Card className="rounded-lg">
                <CardHeader className="border-b">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div className="flex gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <CardTitle>{module.title}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {module.purpose}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{module.owner}</Badge>
                      <Badge variant="secondary">{module.route}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 lg:grid-cols-3">
                  <DocBlock title="How It Works" items={module.simpleFlow} />
                  <DocBlock title="Testing Checklist" items={module.testingChecklist} />
                  <DocBlock title="Common Questions" items={module.commonQuestions} />
                  {module.notes?.length ? (
                    <div className="lg:col-span-3">
                      <DocBlock title="Useful Notes" items={module.notes} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DocBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
