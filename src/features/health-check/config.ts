import type { HealthCheckArea, HealthCheckAnswerValue } from "./types";

export const HEALTH_CHECK_SCHEMA_VERSION = 1;

export type HealthCheckQuestion = {
  id: string;
  label: string;
  description?: string;
  type: "radio" | "checkbox";
  options: { label: string; value: string }[];
  area: HealthCheckArea;
  required?: boolean;
};

export type HealthCheckStep = {
  id: string;
  title: string;
  description: string;
  questions: HealthCheckQuestion[];
};

const scaleOptions = [
  { label: "1-20", value: "1_20" },
  { label: "21-50", value: "21_50" },
  { label: "51-200", value: "51_200" },
  { label: "More than 200", value: "200_PLUS" },
];

const maturityOptions = [
  { label: "Mostly manual or paper-based", value: "MANUAL" },
  { label: "Spreadsheets and messaging apps", value: "SPREADSHEETS" },
  { label: "A mix of software tools", value: "MIXED_TOOLS" },
  { label: "One connected system", value: "CONNECTED" },
];

export const HEALTH_CHECK_STEPS: HealthCheckStep[] = [
  {
    id: "profile",
    title: "Your factory",
    description: "Help us understand the scale and shape of your operations.",
    questions: [
      { id: "factory_size", label: "How many people work in your factory?", type: "radio", options: scaleOptions, area: "FULL_FACTORY", required: true },
      { id: "production_model", label: "What best describes your production?", type: "radio", options: [
        { label: "Made to order", value: "MAKE_TO_ORDER" },
        { label: "Made to stock", value: "MAKE_TO_STOCK" },
        { label: "Job work or contract manufacturing", value: "JOB_WORK" },
        { label: "A mix of these", value: "MIXED" },
      ], area: "PRODUCTION", required: true },
      { id: "locations", label: "How many operating locations do you manage?", type: "radio", options: [
        { label: "One", value: "ONE" }, { label: "2-3", value: "TWO_THREE" }, { label: "4 or more", value: "FOUR_PLUS" },
      ], area: "FULL_FACTORY", required: true },
    ],
  },
  {
    id: "employee",
    title: "People operations",
    description: "How your team records attendance, leave, and payroll.",
    questions: [
      { id: "attendance_process", label: "How do you track attendance and shifts?", type: "radio", options: maturityOptions, area: "EMPLOYEE", required: true },
      { id: "payroll_process", label: "How is payroll prepared?", type: "radio", options: maturityOptions, area: "EMPLOYEE", required: true },
      { id: "employee_challenges", label: "Which people-related tasks take the most effort?", description: "Choose all that apply.", type: "checkbox", options: [
        { label: "Attendance and overtime", value: "ATTENDANCE" }, { label: "Leave balances", value: "LEAVE" }, { label: "Payroll accuracy", value: "PAYROLL" }, { label: "Employee records and documents", value: "RECORDS" }, { label: "None of these", value: "NONE" },
      ], area: "EMPLOYEE", required: true },
    ],
  },
  {
    id: "production",
    title: "Production control",
    description: "How work moves from order to completed output.",
    questions: [
      { id: "production_tracking", label: "How do you track production progress?", type: "radio", options: maturityOptions, area: "PRODUCTION", required: true },
      { id: "bom_usage", label: "Do you maintain bills of materials or recipes?", type: "radio", options: [
        { label: "No formal BOMs", value: "NO" }, { label: "For some products", value: "SOME" }, { label: "For most products", value: "MOST" }, { label: "Yes, linked to production", value: "LINKED" },
      ], area: "PRODUCTION", required: true },
      { id: "production_visibility", label: "How quickly can you see delays or missed targets?", type: "radio", options: [
        { label: "Usually after the fact", value: "AFTER_FACT" }, { label: "In daily or weekly reviews", value: "REVIEWS" }, { label: "Within the same shift", value: "SAME_SHIFT" }, { label: "In real time", value: "REAL_TIME" },
      ], area: "PRODUCTION", required: true },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "How materials and finished goods are controlled.",
    questions: [
      { id: "inventory_tracking", label: "How do you track raw materials and finished goods?", type: "radio", options: maturityOptions, area: "INVENTORY", required: true },
      { id: "stock_accuracy", label: "How often does physical stock differ from records?", type: "radio", options: [
        { label: "Frequently", value: "FREQUENTLY" }, { label: "Sometimes", value: "SOMETIMES" }, { label: "Rarely", value: "RARELY" }, { label: "Records are consistently accurate", value: "ACCURATE" },
      ], area: "INVENTORY", required: true },
      { id: "reorder_process", label: "How are replenishment decisions made?", type: "radio", options: [
        { label: "When someone notices a shortage", value: "REACTIVE" }, { label: "Periodic manual checks", value: "MANUAL_CHECKS" }, { label: "Spreadsheet reorder levels", value: "SPREADSHEET_LEVELS" }, { label: "Automatic alerts from live stock", value: "AUTOMATIC" },
      ], area: "INVENTORY", required: true },
    ],
  },
  {
    id: "finance",
    title: "Finance and compliance",
    description: "How billing, accounting, and compliance information stays current.",
    questions: [
      { id: "billing_accounting", label: "How connected are billing and accounting?", type: "radio", options: maturityOptions, area: "FINANCE", required: true },
      { id: "cash_visibility", label: "How quickly can you see receivables, payables, and cash position?", type: "radio", options: [
        { label: "It requires manual consolidation", value: "MANUAL" }, { label: "At month end", value: "MONTH_END" }, { label: "Weekly", value: "WEEKLY" }, { label: "On demand", value: "ON_DEMAND" },
      ], area: "FINANCE", required: true },
      { id: "compliance_confidence", label: "How confident are you in payroll, invoice, and tax records?", type: "radio", options: [
        { label: "We often need corrections", value: "LOW" }, { label: "Some manual checks are needed", value: "MEDIUM" }, { label: "Mostly confident", value: "HIGH" }, { label: "Strong controls and audit trails", value: "VERY_HIGH" },
      ], area: "FINANCE", required: true },
    ],
  },
  {
    id: "reporting",
    title: "Reporting and readiness",
    description: "How easily leaders can use operational information.",
    questions: [
      { id: "reporting_speed", label: "How long does it take to prepare management reports?", type: "radio", options: [
        { label: "Several days", value: "DAYS" }, { label: "A day", value: "DAY" }, { label: "A few hours", value: "HOURS" }, { label: "Reports are always available", value: "LIVE" },
      ], area: "REPORTING", required: true },
      { id: "data_consistency", label: "Do teams work from the same numbers?", type: "radio", options: [
        { label: "Rarely", value: "RARELY" }, { label: "Sometimes", value: "SOMETIMES" }, { label: "Usually", value: "USUALLY" }, { label: "Yes, from one source", value: "ONE_SOURCE" },
      ], area: "REPORTING", required: true },
      { id: "improvement_goals", label: "What would you most like to improve?", description: "Choose up to three.", type: "checkbox", options: [
        { label: "Employee operations", value: "EMPLOYEE" }, { label: "Production visibility", value: "PRODUCTION" }, { label: "Inventory accuracy", value: "INVENTORY" }, { label: "Finance and compliance", value: "FINANCE" }, { label: "Reporting and decisions", value: "REPORTING" },
      ], area: "REPORTING", required: true },
    ],
  },
];

export const EMPTY_CONTACT = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  city: "",
};

export function isAnswerComplete(value: HealthCheckAnswerValue | undefined) {
  return typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) && value.length > 0;
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
