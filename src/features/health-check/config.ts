import type { HealthCheckArea, HealthCheckAnswerValue } from "./types";

export const HEALTH_CHECK_SCHEMA_VERSION = "2026-10-01" as const;
export const HEALTH_CHECK_DRAFT_VERSION = 2;

export type HealthCheckQuestion = {
  id: string;
  label: string;
  options: { label: string; value: string }[];
  area: HealthCheckArea;
  required: true;
};

export type HealthCheckStep = {
  id: string;
  title: string;
  description: string;
  questions: HealthCheckQuestion[];
};

export const HEALTH_CHECK_STEPS: HealthCheckStep[] = [
  {
    id: "profile",
    title: "Your factory",
    description: "Help us understand your scale and readiness to improve.",
    questions: [
      { id: "factory_size", label: "How many people work in your factory?", area: "FULL_FACTORY", required: true, options: [
        { label: "Micro (1-20)", value: "MICRO" }, { label: "Small (21-50)", value: "SMALL" }, { label: "Medium (51-200)", value: "MEDIUM" }, { label: "Large (more than 200)", value: "LARGE" },
      ] },
      { id: "software_usage", label: "What software do you use for factory operations today?", area: "FULL_FACTORY", required: true, options: [
        { label: "No dedicated software", value: "NONE" }, { label: "Accounting software only", value: "ACCOUNTING_ONLY" }, { label: "A few separate tools", value: "FEW_TOOLS" }, { label: "An ERP or connected platform", value: "ERP" },
      ] },
      { id: "implementation_timeline", label: "When would you want to start improving your systems?", area: "FULL_FACTORY", required: true, options: [
        { label: "Now", value: "NOW" }, { label: "In 1-3 months", value: "ONE_TO_THREE_MONTHS" }, { label: "In 3-6 months", value: "THREE_TO_SIX_MONTHS" }, { label: "Just exploring", value: "EXPLORING" },
      ] },
    ],
  },
  {
    id: "employee",
    title: "People operations",
    description: "How employee records, attendance, payroll, and compliance are managed.",
    questions: [
      { id: "employee_records", label: "How are employee records maintained?", area: "EMPLOYEE", required: true, options: [
        { label: "Paper files", value: "PAPER" }, { label: "Spreadsheets", value: "SPREADSHEET" }, { label: "Multiple separate tools", value: "MULTIPLE_TOOLS" }, { label: "One central system", value: "CENTRAL_SYSTEM" },
      ] },
      { id: "attendance_payroll", label: "How connected are attendance and payroll?", area: "EMPLOYEE", required: true, options: [
        { label: "Entirely manual", value: "MANUAL" }, { label: "Partly digital", value: "PARTLY_DIGITAL" }, { label: "Separate systems", value: "SEPARATE_SYSTEMS" }, { label: "Fully integrated", value: "INTEGRATED" },
      ] },
      { id: "employee_compliance", label: "How do you track employee compliance tasks and due dates?", area: "EMPLOYEE", required: true, options: [
        { label: "React when an issue arises", value: "REACTIVE" }, { label: "Manual calendar", value: "CALENDAR" }, { label: "Outsourced support", value: "OUTSOURCED" }, { label: "System-tracked alerts", value: "SYSTEM_TRACKED" },
      ] },
    ],
  },
  {
    id: "production",
    title: "Production control",
    description: "How output, downtime, and quality are tracked.",
    questions: [
      { id: "production_tracking", label: "How do you track production progress?", area: "PRODUCTION", required: true, options: [
        { label: "Paper records", value: "PAPER" }, { label: "Spreadsheets", value: "SPREADSHEET" }, { label: "Basic production software", value: "BASIC_SOFTWARE" }, { label: "A real-time system", value: "REAL_TIME_SYSTEM" },
      ] },
      { id: "downtime_visibility", label: "How is machine or line downtime recorded?", area: "PRODUCTION", required: true, options: [
        { label: "Not tracked", value: "NOT_TRACKED" }, { label: "Shared verbally", value: "VERBAL" }, { label: "Manual log", value: "MANUAL_LOG" }, { label: "Tracked in a system", value: "SYSTEM_TRACKED" },
      ] },
      { id: "quality_tracking", label: "How are quality issues and checks recorded?", area: "PRODUCTION", required: true, options: [
        { label: "Only after a problem", value: "REACTIVE" }, { label: "Paper checklists", value: "PAPER_CHECKS" }, { label: "Spreadsheets", value: "SPREADSHEET" }, { label: "Tracked in a system", value: "SYSTEM_TRACKED" },
      ] },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "How stock levels, accuracy, and reordering are controlled.",
    questions: [
      { id: "inventory_tracking", label: "How do you track raw materials and finished goods?", area: "INVENTORY", required: true, options: [
        { label: "Visual checks", value: "VISUAL" }, { label: "Paper records", value: "PAPER" }, { label: "Spreadsheets", value: "SPREADSHEET" }, { label: "A stock system", value: "SYSTEM_TRACKED" },
      ] },
      { id: "stock_accuracy", label: "How accurate are your stock records?", area: "INVENTORY", required: true, options: [
        { label: "Often inaccurate", value: "LOW" }, { label: "Accuracy varies", value: "VARIABLE" }, { label: "Mostly accurate", value: "MOSTLY_ACCURATE" }, { label: "Real-time and reliable", value: "REAL_TIME" },
      ] },
      { id: "reorder_planning", label: "How are replenishment decisions made?", area: "INVENTORY", required: true, options: [
        { label: "After a shortage", value: "SHORTAGE_DRIVEN" }, { label: "From team experience", value: "EXPERIENCE" }, { label: "Min/max spreadsheet", value: "MIN_MAX_SHEET" }, { label: "Automated alerts", value: "AUTOMATED" },
      ] },
    ],
  },
  {
    id: "finance",
    title: "Finance and compliance",
    description: "How costing, receivables, and statutory obligations stay visible.",
    questions: [
      { id: "costing_visibility", label: "How clearly can you see product or job costs?", area: "FINANCE", required: true, options: [
        { label: "Costs are largely unknown", value: "UNKNOWN" }, { label: "Estimated from experience", value: "ESTIMATED" }, { label: "Calculated in spreadsheets", value: "SPREADSHEET" }, { label: "Calculated by the system", value: "SYSTEM_CALCULATED" },
      ] },
      { id: "receivables_tracking", label: "How do you track customer receivables?", area: "FINANCE", required: true, options: [
        { label: "From memory", value: "MEMORY" }, { label: "Paper records", value: "PAPER" }, { label: "Spreadsheets", value: "SPREADSHEET" }, { label: "Tracked in a system", value: "SYSTEM_TRACKED" },
      ] },
      { id: "statutory_compliance", label: "How are statutory compliance due dates managed?", area: "FINANCE", required: true, options: [
        { label: "Reactively", value: "REACTIVE" }, { label: "Manual calendar", value: "MANUAL_CALENDAR" }, { label: "Led by an accountant", value: "ACCOUNTANT_LED" }, { label: "Tracked in a system", value: "SYSTEM_TRACKED" },
      ] },
    ],
  },
  {
    id: "reporting",
    title: "Reporting and readiness",
    description: "How quickly leaders can get consistent operational information.",
    questions: [
      { id: "reporting_frequency", label: "How often are management reports available?", area: "REPORTING", required: true, options: [
        { label: "Only when requested", value: "ON_REQUEST" }, { label: "Monthly", value: "MONTHLY" }, { label: "Weekly", value: "WEEKLY" }, { label: "In real time", value: "REAL_TIME" },
      ] },
      { id: "reports_effort", label: "How much effort does it take to prepare reports?", area: "REPORTING", required: true, options: [
        { label: "Several days", value: "DAYS" }, { label: "A few hours", value: "HOURS" }, { label: "Under an hour", value: "UNDER_HOUR" }, { label: "Reports are automated", value: "AUTOMATED" },
      ] },
      { id: "data_fragmentation", label: "Where is operational data spread today?", area: "REPORTING", required: true, options: [
        { label: "Paper and local files", value: "PAPER_AND_FILES" }, { label: "Many spreadsheets", value: "MANY_SPREADSHEETS" }, { label: "Separate apps", value: "SEPARATE_APPS" }, { label: "One connected platform", value: "ONE_PLATFORM" },
      ] },
    ],
  },
];

export const EMPTY_CONTACT = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  location: "",
};

export function isAnswerComplete(value: HealthCheckAnswerValue | undefined) {
  return Boolean(value?.trim());
}

export const areaLabels: Record<HealthCheckArea, string> = {
  EMPLOYEE: "People operations",
  PRODUCTION: "Production control",
  INVENTORY: "Inventory management",
  FINANCE: "Finance and compliance",
  REPORTING: "Reporting and digital readiness",
  FULL_FACTORY: "Connected factory operations",
};

export const priorityLabels = {
  HIGH_OPPORTUNITY: "High improvement opportunity",
  MEDIUM_OPPORTUNITY: "Focused improvement opportunity",
  EARLY_STAGE: "Digital foundation opportunity",
  NO_FOLLOW_UP: "Health check complete",
} as const;
