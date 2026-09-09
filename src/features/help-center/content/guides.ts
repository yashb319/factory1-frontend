import {
  Bot,
  Building2,
  CalendarCheck,
  CalendarDays,
  FileText,
  Landmark,
  LockKeyhole,
  Package,
  PackageCheck,
  Truck,
  UserRound,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import type { UserRole } from "@/features/auth/types";
import type { HelpGuide } from "../types";

const allRoles: UserRole[] = ["OWNER", "ADMIN", "EMPLOYEE", "FINANCE", "MANAGEMENT"];
const operationsRoles: UserRole[] = ["OWNER", "ADMIN", "MANAGEMENT"];
const financeRoles: UserRole[] = ["OWNER", "ADMIN", "FINANCE"];
const adminRoles: UserRole[] = ["OWNER", "ADMIN"];

/**
 * Module guide registry.
 *
 * MAINTENANCE RULE: when a module's screens, statuses, routes or role access
 * change, update its guide here in the same commit, bump `contentVersion`,
 * refresh `lastUpdated`, and extend `reviewBy`. See content/catalog.ts for the
 * full checklist and stale-content tracking.
 */
export const helpGuides: HelpGuide[] = [
  {
    id: "authentication",
    title: "Authentication & Access",
    route: "/login",
    module: "settings",
    icon: LockKeyhole,
    summary: "Sign up, verify your factory, log in, reset passwords and activate employee accounts.",
    keywords: ["login", "signup", "password", "otp", "activate", "access", "security", "forgot"],
    roles: allRoles,
    purpose:
      "Controls how owners create an organization, how users log in with email and OTP verification, and how invited employees activate their own accounts.",
    prerequisites: [
      "Owners need a work email they can access for OTP verification.",
      "Employee users must be invited from Organization Settings before they can activate an account.",
    ],
    steps: [
      {
        title: "Create your organization",
        detail:
          "Open Sign up, enter organization and owner details, verify the email OTP and complete the factory profile. New organizations may wait for approval before full access.",
      },
      {
        title: "Log in",
        detail:
          "Use your registered email and password on the Login page. Complete OTP verification when asked.",
      },
      {
        title: "Reset a forgotten password",
        detail:
          "Use Forgot password on the Login page, verify the OTP sent to your email and set a new password.",
      },
      {
        title: "Activate an employee account",
        detail:
          "Employees open the activation link sent to them, set a password and can then log in with their own credentials.",
      },
    ],
    keyFields: [
      { name: "Email", description: "Primary login identity and the address OTPs are sent to." },
      { name: "Role", description: "OWNER, ADMIN, FINANCE, MANAGEMENT or EMPLOYEE. Decides which modules are visible." },
      { name: "Organization status", description: "Pending approval, Active, Suspended or Terminated. Only Active organizations have full access." },
    ],
    statuses: [
      { name: "PENDING_APPROVAL", description: "Organization registered; waiting for Factory1 approval." },
      { name: "ACTIVE", description: "Organization can use all subscribed modules." },
      { name: "SUSPENDED / TERMINATED", description: "Access blocked; contact Factory1 support." },
    ],
    troubleshooting: [
      {
        problem: "OTP email never arrives.",
        fix: "Check spam/junk folders, confirm the email spelling, wait a minute and resend. Contact support if it still fails.",
      },
      {
        problem: "Login works but modules are missing.",
        fix: "Your role controls module access. Ask an OWNER or ADMIN to review your role in Organization Settings.",
      },
      {
        problem: "Employee activation link does not work.",
        fix: "Links can expire. An OWNER or ADMIN should re-invite the employee from Organization Settings.",
      },
    ],
    relatedRoutes: [
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Forgot password", href: "/forgot-password" },
      { label: "Organization Settings", href: "/organization-settings" },
    ],
    contentOwner: "Platform team",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "employees",
    title: "Employees & Onboarding",
    route: "/employees",
    module: "employees",
    icon: Users,
    summary: "Maintain employee records, departments, photos, salary details and login access.",
    keywords: ["staff", "worker", "department", "onboarding", "photo", "mobile", "joining"],
    roles: operationsRoles,
    purpose:
      "Keeps every employee record — name, phone, department, salary details, photo and work status — so attendance, payroll and AI answers stay accurate.",
    prerequisites: [
      "Only OWNER, ADMIN and MANAGEMENT roles can manage employees.",
      "Create departments before or while adding employees.",
    ],
    steps: [
      {
        title: "Add an employee",
        detail:
          "Open Employees, create a record with name, mobile number, department, joining date and salary details.",
      },
      {
        title: "Upload a photo",
        detail:
          "Attach a clear photo when using automatic (capture-based) attendance so the capture website can identify the person.",
      },
      {
        title: "Give login access",
        detail:
          "An OWNER or ADMIN creates a login for the employee from Organization Settings; the employee activates it via the emailed link.",
      },
      {
        title: "Handle exits",
        detail:
          "Mark the employee inactive instead of deleting them, so historical attendance and payroll records stay intact.",
      },
    ],
    keyFields: [
      { name: "Mobile number", description: "Used for contact and employee identification." },
      { name: "Department", description: "Groups employees for attendance, payroll and reports." },
      { name: "Joining date", description: "Used by payroll pro-rating and tenure views." },
      { name: "Salary details", description: "Base for payroll generation." },
    ],
    statuses: [
      { name: "Active", description: "Employee appears in attendance, payroll and billing flows." },
      { name: "Inactive", description: "Hidden from daily flows; history is preserved." },
    ],
    troubleshooting: [
      {
        problem: "An employee is missing from attendance.",
        fix: "Check the employee is Active and belongs to the correct department.",
      },
      {
        problem: "Photo upload fails.",
        fix: "Use a standard image format and a reasonable file size, then retry on a stable connection.",
      },
      {
        problem: "Employee cannot log in.",
        fix: "Confirm a login was created in Organization Settings and the activation link was completed.",
      },
    ],
    relatedRoutes: [
      { label: "Employees", href: "/employees" },
      { label: "Attendance", href: "/attendance" },
      { label: "Payroll", href: "/payroll" },
      { label: "Organization Settings", href: "/organization-settings" },
    ],
    contentOwner: "HR module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "attendance",
    title: "Attendance",
    route: "/attendance",
    module: "attendance",
    icon: CalendarCheck,
    summary: "Track present, absent and late days, with manual entry or QR/photo auto-capture.",
    keywords: ["present", "absent", "late", "punch", "check-in", "check-out", "capture", "qr"],
    roles: operationsRoles,
    purpose:
      "Tracks who is present, absent, late or on leave. Supports manual marking and automatic capture through the attendance capture website using your organization key.",
    prerequisites: [
      "Employees must exist and be Active.",
      "For auto attendance, set the attendance capture key in Organization Settings.",
    ],
    steps: [
      {
        title: "Set up auto capture (optional)",
        detail:
          "Copy the capture key from Organization Settings and use it on the attendance capture website for QR/photo-based check-in and check-out.",
      },
      {
        title: "Mark or review daily attendance",
        detail:
          "Open Attendance to mark manually or review captured check-ins. Multiple punches in a day are supported.",
      },
      {
        title: "Verify work hours",
        detail:
          "Total hours use the first check-in and the last check-out of the day, so remind employees to punch out.",
      },
    ],
    keyFields: [
      { name: "Capture key", description: "Organization-level key that links the capture website to your factory." },
      { name: "Punch history", description: "Every check-in/check-out event for an employee-day." },
      { name: "Work hours", description: "First check-in to last check-out." },
    ],
    statuses: [
      { name: "Present", description: "Employee checked in or was marked present." },
      { name: "Absent", description: "No attendance or approved leave recorded." },
      { name: "Leave", description: "Day covered by an approved leave request." },
    ],
    troubleshooting: [
      {
        problem: "Capture website does not check anyone in.",
        fix: "Verify the capture key in Organization Settings matches the one used on the capture site.",
      },
      {
        problem: "Work hours look wrong.",
        fix: "Check the punch history — a missing final check-out shortens the counted hours.",
      },
      {
        problem: "Someone is absent but was on approved leave.",
        fix: "Confirm the leave request was Approved in the Leave module, not just submitted.",
      },
    ],
    relatedRoutes: [
      { label: "Attendance", href: "/attendance" },
      { label: "Leave", href: "/leave" },
      { label: "Employees", href: "/employees" },
      { label: "Organization Settings", href: "/organization-settings" },
    ],
    contentOwner: "HR module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "leave",
    title: "Leave Management",
    route: "/leave",
    module: "attendance",
    icon: CalendarDays,
    summary: "Employees request leave; managers approve or reject with a clear status trail.",
    keywords: ["vacation", "holiday", "sick", "approve", "reject", "request", "time off"],
    roles: allRoles,
    purpose:
      "Lets employees submit leave requests and gives owners, admins and managers a single place to approve, reject or track them. Approved leave feeds attendance and payroll.",
    prerequisites: [
      "Employees log in with their own activated accounts to apply.",
      "Approvals need an OWNER, ADMIN or MANAGEMENT user.",
    ],
    steps: [
      {
        title: "Apply for leave",
        detail:
          "Open Leave (employees see it as My Leave), choose dates and leave type, add a reason and submit.",
      },
      {
        title: "Review requests",
        detail:
          "Managers open the Leave queue, check overlapping absences and approve or reject with a note.",
      },
      {
        title: "Track the outcome",
        detail:
          "Approved leave automatically counts in attendance; rejected or cancelled leave does not.",
      },
    ],
    keyFields: [
      { name: "Leave type", description: "Category such as casual, sick or earned leave." },
      { name: "Date range", description: "Start and end dates used by attendance and payroll." },
      { name: "Reason", description: "Shown to approvers for faster decisions." },
    ],
    statuses: [
      { name: "PENDING", description: "Submitted and waiting for an approver." },
      { name: "APPROVED", description: "Counts as leave in attendance and payroll." },
      { name: "REJECTED", description: "Declined by an approver; attendance is unaffected." },
      { name: "CANCELLED", description: "Withdrawn after submission; no attendance impact." },
    ],
    troubleshooting: [
      {
        problem: "An employee cannot see the Leave page.",
        fix: "Confirm the employee login is activated; Leave is available to every signed-in role.",
      },
      {
        problem: "Approved leave still shows as absent.",
        fix: "Check the approved date range covers the absence day and the request was not cancelled afterwards.",
      },
    ],
    relatedRoutes: [
      { label: "Leave", href: "/leave" },
      { label: "Attendance", href: "/attendance" },
      { label: "Payroll", href: "/payroll" },
      { label: "My Profile", href: "/profile" },
    ],
    contentOwner: "HR module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "payroll",
    title: "Payroll",
    route: "/payroll",
    module: "payroll",
    icon: Wallet,
    summary: "Generate monthly salary runs from employee salary data and attendance.",
    keywords: ["salary", "wage", "payslip", "payrun", "compensation", "export"],
    roles: financeRoles,
    purpose:
      "Calculates salary runs for a chosen period using employee salary details and attendance information, with review before amounts are finalized.",
    prerequisites: [
      "Employees must have salary details filled in.",
      "Attendance (and approved leave) for the period should be up to date.",
    ],
    steps: [
      {
        title: "Prepare data",
        detail: "Confirm employee salary details and close attendance for the period.",
      },
      {
        title: "Generate the run",
        detail: "Open Payroll, choose the period and generate. The action is safe to repeat.",
      },
      {
        title: "Review each employee",
        detail:
          "Check per-employee amounts, especially for missing attendance or missing salary records, before using the run.",
      },
    ],
    keyFields: [
      { name: "Payroll period", description: "Month/range the salary run covers." },
      { name: "Generated amount", description: "Per-employee payout computed from salary and attendance." },
    ],
    troubleshooting: [
      {
        problem: "Payroll did not generate.",
        fix: "Check that employees have salary details and the selected period has attendance data.",
      },
      {
        problem: "An amount looks wrong.",
        fix: "Review that employee's attendance and approved leaves for the period, then regenerate.",
      },
    ],
    relatedRoutes: [
      { label: "Payroll", href: "/payroll" },
      { label: "Employees", href: "/employees" },
      { label: "Attendance", href: "/attendance" },
      { label: "Accounting", href: "/accounting" },
    ],
    contentOwner: "Finance module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "inventory",
    title: "Inventory",
    route: "/inventory",
    module: "inventory",
    icon: Package,
    summary: "Manage stock items, units, HSN/GST details, movements and low-stock signals.",
    keywords: ["stock", "material", "raw material", "finished goods", "hsn", "gst", "reorder", "low stock"],
    roles: operationsRoles,
    purpose:
      "Maintains stock of raw materials, finished goods and other factory items. Purchase bills increase stock and sales bills reduce it automatically.",
    prerequisites: [
      "Only OWNER, ADMIN and MANAGEMENT roles manage inventory.",
      "Add suppliers and customers before relying on bill-driven stock movement.",
    ],
    steps: [
      {
        title: "Create stock items",
        detail: "Add items with unit of measure, HSN code and GST rate so billing can tax them correctly.",
      },
      {
        title: "Record movements",
        detail: "Use manual stock-in/stock-out entries for corrections, opening stock or wastage.",
      },
      {
        title: "Let bills move stock",
        detail:
          "Posting a purchase bill increases stock; posting a sales bill decreases it. Cancelling a bill reverses the impact.",
      },
      {
        title: "Watch low stock",
        detail: "Review low-stock warnings on Inventory and the Dashboard before production is blocked.",
      },
    ],
    keyFields: [
      { name: "Unit", description: "Measurement such as pcs, kg or metre used across stock and bills." },
      { name: "HSN / GST", description: "Tax classification used by billing and GST reports." },
      { name: "Current stock", description: "Live quantity after all movements and posted bills." },
      { name: "Reorder level", description: "Threshold that triggers low-stock warnings." },
    ],
    troubleshooting: [
      {
        problem: "Stock went negative.",
        fix: "A sales bill posted more quantity than available. Add opening stock or a purchase entry, then review.",
      },
      {
        problem: "Stock did not change after a bill.",
        fix: "Stock only moves when the bill is Posted, not while it is a Draft.",
      },
    ],
    relatedRoutes: [
      { label: "Inventory", href: "/inventory" },
      { label: "Products", href: "/products" },
      { label: "Billing", href: "/billing" },
      { label: "Suppliers", href: "/suppliers" },
    ],
    contentOwner: "Inventory module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "products",
    title: "Products & BOM",
    route: "/products",
    module: "production",
    icon: PackageCheck,
    summary: "Define finished products and their bill of materials for production.",
    keywords: ["bom", "bill of materials", "finished goods", "recipe", "assembly"],
    roles: operationsRoles,
    purpose:
      "Connects finished products to their bill of materials (BOM) so production entries know exactly which raw materials to consume.",
    prerequisites: [
      "Raw materials must exist in Inventory before they can be added to a BOM.",
      "Finished products are themselves stock items in Inventory.",
    ],
    steps: [
      {
        title: "Create a finished product",
        detail: "Add the product with its unit and tax details.",
      },
      {
        title: "Build the BOM",
        detail: "Add each raw material and the quantity needed to make one unit of the product.",
      },
      {
        title: "Run production",
        detail: "Use the Production module to convert raw materials into finished goods using the BOM.",
      },
    ],
    keyFields: [
      { name: "BOM item", description: "One raw material line with the quantity consumed per finished unit." },
      { name: "Output unit", description: "Unit in which the finished product is stocked." },
    ],
    troubleshooting: [
      {
        problem: "Cannot add a material to the BOM.",
        fix: "Create the raw material in Inventory first, then return to the product.",
      },
      {
        problem: "Production fails for insufficient stock.",
        fix: "Check current raw-material quantities; production consumes BOM quantity × output units.",
      },
    ],
    relatedRoutes: [
      { label: "Products", href: "/products" },
      { label: "Production", href: "/production" },
      { label: "Inventory", href: "/inventory" },
    ],
    contentOwner: "Production module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "production",
    title: "Production Tracking",
    route: "/production",
    module: "production",
    icon: Workflow,
    summary: "Plan, run and complete production entries that turn raw materials into finished goods.",
    keywords: ["manufacturing", "batch", "work order", "consume", "output", "shop floor"],
    roles: operationsRoles,
    purpose:
      "Tracks production work from plan to completion. A completed production entry consumes BOM raw materials and adds finished goods to inventory automatically.",
    prerequisites: [
      "The product and its BOM must be configured in Products.",
      "Required raw-material quantities must be available in Inventory.",
    ],
    steps: [
      {
        title: "Create a production entry",
        detail: "Choose the product and planned quantity. The BOM expands into required raw materials.",
      },
      {
        title: "Start the work",
        detail: "Move the entry to In Progress when the shop floor begins.",
      },
      {
        title: "Complete and post",
        detail:
          "On completion, raw-material stock decreases and finished-goods stock increases in one step.",
      },
      {
        title: "Cancel when needed",
        detail: "Cancel entries that will not run so plans and stock expectations stay clean.",
      },
    ],
    keyFields: [
      { name: "Product", description: "Finished good being manufactured; drives the BOM expansion." },
      { name: "Planned quantity", description: "Output units the entry is expected to produce." },
      { name: "Consumed materials", description: "Raw materials deducted on completion." },
    ],
    statuses: [
      { name: "DRAFT", description: "Created but not yet planned; no stock impact." },
      { name: "PLANNED", description: "Scheduled for production." },
      { name: "IN_PROGRESS", description: "Work has started on the shop floor." },
      { name: "COMPLETED", description: "Stock moved: materials consumed, finished goods added." },
      { name: "CANCELLED", description: "Abandoned entry; no stock impact." },
    ],
    troubleshooting: [
      {
        problem: "Cannot complete an entry.",
        fix: "Check raw-material availability — completion consumes BOM quantity × planned output.",
      },
      {
        problem: "Finished goods did not increase.",
        fix: "Stock moves only when the entry reaches COMPLETED, not while planned or in progress.",
      },
    ],
    relatedRoutes: [
      { label: "Production", href: "/production" },
      { label: "Products & BOM", href: "/products" },
      { label: "Inventory", href: "/inventory" },
    ],
    contentOwner: "Production module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "billing",
    title: "Billing",
    route: "/billing",
    module: "sales",
    icon: FileText,
    summary: "Create sales and purchase bills with GST, stock and accounting handled automatically.",
    keywords: ["invoice", "sales", "purchase", "gst", "print", "voucher", "party"],
    roles: financeRoles,
    purpose:
      "Creates sales bills for customers and purchase bills for suppliers. Posting a bill updates stock, GST and accounting in one action.",
    prerequisites: [
      "Customers and suppliers should exist for correct party and GST auto-fill.",
      "Inventory items need HSN and GST details for correct tax lines.",
    ],
    steps: [
      {
        title: "Choose the voucher type",
        detail: "Pick Sales or Purchase. Function keys (F8/F9) jump straight to entry.",
      },
      {
        title: "Select the party",
        detail: "Choosing the customer or supplier auto-fills GST number and address.",
      },
      {
        title: "Add items",
        detail: "Enter item, quantity, rate and GST per line; review totals and tax.",
      },
      {
        title: "Post the bill",
        detail:
          "Posting updates stock and accounting. Drafts can be edited freely; posted bills are reversed by cancelling.",
      },
    ],
    keyFields: [
      { name: "Voucher type", description: "SALES bills customers; PURCHASE records supplier bills." },
      { name: "Party ledger", description: "Customer or supplier the bill is booked against." },
      { name: "Tax lines", description: "GST computed from item HSN/rates and party state." },
    ],
    statuses: [
      { name: "Draft", description: "Editable; no stock or accounting impact." },
      { name: "Posted", description: "Stock, GST and ledgers updated." },
      { name: "Cancelled", description: "Posted effects reversed with an audit trail." },
    ],
    troubleshooting: [
      {
        problem: "GST or address did not auto-fill.",
        fix: "Update the customer/supplier master with GST number and billing address.",
      },
      {
        problem: "Cannot edit a posted bill.",
        fix: "Posted bills are locked for audit safety. Cancel and recreate with corrections.",
      },
    ],
    relatedRoutes: [
      { label: "Billing", href: "/billing" },
      { label: "Customers", href: "/customers" },
      { label: "Suppliers", href: "/suppliers" },
      { label: "Accounting", href: "/accounting" },
    ],
    contentOwner: "Finance module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "accounting",
    title: "Accounting",
    route: "/accounting",
    module: "finance",
    icon: Landmark,
    summary: "Tally-like ledgers, vouchers, day book, GST and CA-ready financial reports.",
    keywords: ["ledger", "voucher", "journal", "trial balance", "p&l", "balance sheet", "gst", "tally", "ca"],
    roles: financeRoles,
    purpose:
      "Provides double-entry accounting: groups, ledgers, vouchers, day book, cash/bank book, P&L, balance sheet, trial balance, GST and outstanding reports.",
    prerequisites: [
      "Finance roles only: OWNER, ADMIN or FINANCE.",
      "Billing already creates vouchers automatically; use manual vouchers for everything else.",
    ],
    steps: [
      {
        title: "Review masters",
        detail: "Check account groups and ledgers before posting.",
      },
      {
        title: "Post manual vouchers",
        detail: "Create payment, receipt, contra or journal vouchers with matching debit and credit.",
      },
      {
        title: "Use the books",
        detail: "Open Day Book and Cash/Bank Book for daily verification.",
      },
      {
        title: "Export reports",
        detail: "Download P&L, Balance Sheet, Trial Balance and Group Summary for your CA.",
      },
    ],
    keyFields: [
      { name: "Debit / Credit", description: "Every voucher must balance across the two sides." },
      { name: "Voucher source", description: "Billing-created vouchers are read-only here; manual vouchers are editable." },
      { name: "Auto Balance", description: "Helper that balances a voucher when totals differ." },
    ],
    troubleshooting: [
      {
        problem: "Why can't I edit a billing voucher here?",
        fix: "Bill-generated vouchers belong to Billing. Cancel the bill there to reverse it.",
      },
      {
        problem: "Voucher will not save.",
        fix: "Debit and credit totals must match — use Auto Balance or fix the amounts.",
      },
    ],
    relatedRoutes: [
      { label: "Accounting", href: "/accounting" },
      { label: "Billing", href: "/billing" },
      { label: "Import / Export", href: "/import-export" },
    ],
    contentOwner: "Finance module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "suppliers",
    title: "Suppliers",
    route: "/suppliers",
    module: "suppliers",
    icon: Truck,
    summary: "Maintain supplier masters with GST and contact details for purchase billing.",
    keywords: ["vendor", "purchase", "material source", "gstin"],
    roles: operationsRoles,
    purpose:
      "Stores supplier details used in purchase bills, GST calculations, payables and material sourcing.",
    prerequisites: ["Only OWNER, ADMIN and MANAGEMENT roles manage suppliers."],
    steps: [
      {
        title: "Add a supplier",
        detail: "Capture name, GST number, contact details and address.",
      },
      {
        title: "Use in purchase bills",
        detail: "Selecting the supplier in Billing auto-fills GST and address details.",
      },
      {
        title: "Keep data clean",
        detail: "Accurate supplier GST data keeps accounting and GST reports correct.",
      },
    ],
    keyFields: [
      { name: "GST number", description: "Drives tax treatment and invoice compliance." },
      { name: "Contact & address", description: "Auto-filled into purchase bills." },
    ],
    troubleshooting: [
      {
        problem: "Supplier not selectable in Billing.",
        fix: "Confirm the supplier record exists and is active, then retry.",
      },
    ],
    relatedRoutes: [
      { label: "Suppliers", href: "/suppliers" },
      { label: "Billing", href: "/billing" },
      { label: "Inventory", href: "/inventory" },
    ],
    contentOwner: "Inventory module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "customers",
    title: "Customers",
    route: "/customers",
    module: "customers",
    icon: UserRound,
    summary: "Maintain customer masters for sales billing, receivables and GST compliance.",
    keywords: ["client", "buyer", "receivable", "outstanding", "gstin"],
    roles: financeRoles,
    purpose:
      "Stores customer details for sales billing, receivable tracking, GST and follow-up.",
    prerequisites: ["Finance roles only: OWNER, ADMIN or FINANCE."],
    steps: [
      {
        title: "Add a customer",
        detail: "Capture name, GST number, phone and billing address.",
      },
      {
        title: "Use in sales bills",
        detail: "Selecting the customer in Billing auto-fills GST and address details.",
      },
      {
        title: "Track receivables",
        detail: "Review pending customer money from Accounting > Overview and outstanding reports.",
      },
    ],
    keyFields: [
      { name: "GST number", description: "Appears on sales invoices and GST reports." },
      { name: "Billing address", description: "Auto-filled on invoices; drives place-of-supply." },
    ],
    troubleshooting: [
      {
        problem: "Customer GST is missing on the invoice.",
        fix: "Edit the customer master and add the GST number, then recreate or correct the bill.",
      },
      {
        problem: "Where do I see pending payments?",
        fix: "Open Accounting and check receivables/outstanding reports for the customer ledger.",
      },
    ],
    relatedRoutes: [
      { label: "Customers", href: "/customers" },
      { label: "Billing", href: "/billing" },
      { label: "Accounting", href: "/accounting" },
    ],
    contentOwner: "Finance module owner",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "ai",
    title: "AI Assistant",
    route: "/ai",
    module: "aiInsights",
    icon: Bot,
    summary: "Ask questions about your factory data with role-aware, quota-managed answers.",
    keywords: ["chat", "assistant", "question", "insights", "quota", "ask"],
    roles: allRoles,
    purpose:
      "Lets any signed-in user ask questions about employees, stock, billing, accounting and more. Answers respect role-based access and plan quotas.",
    prerequisites: [
      "Available to every signed-in role; sensitive data follows your role's access.",
      "AI usage is limited by your plan's quota.",
    ],
    steps: [
      {
        title: "Open the assistant",
        detail: "Use the AI Assistant page or the floating assistant button on any screen.",
      },
      {
        title: "Ask data questions",
        detail: "Try questions like employee contact details, low-stock items or receivable summaries.",
      },
      {
        title: "Use suggestions",
        detail: "When unsure, start from the suggested questions shown in the assistant.",
      },
    ],
    keyFields: [
      { name: "Quota", description: "Plan-level prompt limit; owners can see usage in their plan controls." },
      { name: "Role scope", description: "AI only answers with data your role is allowed to see." },
    ],
    troubleshooting: [
      {
        problem: "AI did not find a record.",
        fix: "Check the record exists in the module and your role can access that module.",
      },
      {
        problem: "AI quota is over.",
        fix: "Wait for the quota window to reset or ask an owner to review the plan's AI quota.",
      },
    ],
    relatedRoutes: [
      { label: "AI Assistant", href: "/ai" },
      { label: "Dashboard", href: "/dashboard" },
    ],
    contentOwner: "Platform team",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
  {
    id: "organization-settings",
    title: "Organization Settings",
    route: "/organization-settings",
    module: "organization",
    icon: Building2,
    summary: "Manage factory profile, employee logins, roles, attendance key and features.",
    keywords: ["settings", "org", "roles", "users", "access", "profile", "gst", "features"],
    roles: adminRoles,
    purpose:
      "Controls organization-level configuration: factory profile, employee login access and roles, attendance capture key and feature settings.",
    prerequisites: ["Only OWNER and ADMIN roles can open Organization Settings."],
    steps: [
      {
        title: "Complete the factory profile",
        detail: "Fill name, address, GST and contact details — billing uses them for invoice headers.",
      },
      {
        title: "Create employee logins",
        detail: "Invite users and assign roles (ADMIN, FINANCE, MANAGEMENT, EMPLOYEE) to control module access.",
      },
      {
        title: "Set the attendance capture key",
        detail: "Generate/copy the key used by the attendance capture website for auto check-ins.",
      },
    ],
    keyFields: [
      { name: "Factory profile", description: "Legal name, address and GST used on invoices." },
      { name: "User roles", description: "Per-login access level across modules." },
      { name: "Capture key", description: "Links the attendance capture website to your factory." },
    ],
    troubleshooting: [
      {
        problem: "A user sees too few modules.",
        fix: "Review their assigned role here; module visibility follows role.",
      },
      {
        problem: "Invoice header shows old address/GST.",
        fix: "Update the factory profile; new bills pick up the change.",
      },
    ],
    relatedRoutes: [
      { label: "Organization Settings", href: "/organization-settings" },
      { label: "Employees", href: "/employees" },
      { label: "Authentication & Access", href: "/help?module=authentication" },
    ],
    contentOwner: "Platform team",
    contentVersion: "1.0.0",
    lastUpdated: "2026-09-09",
    reviewBy: "2026-12-09",
  },
];
