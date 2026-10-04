import type { HealthCheckArea, HealthCheckAnswerValue } from "./types";

export const HEALTH_CHECK_SCHEMA_VERSION = "2026-10-04" as const;
export const HEALTH_CHECK_DRAFT_VERSION = 5;
export const DEFAULT_PROJECTION_INPUTS = {
  workingDaysPerMonth: "26",
  loadedHourlyLabourCostInr: "250",
} as const;

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
    id: "basics",
    title: "A quick picture of your factory",
    description: "Two basics help us keep the rest of the check relevant.",
    questions: [
      { id: "factory_size", label: "About how many people work in your factory?", area: "FULL_FACTORY", required: true, options: [
        { label: "1–20 people", value: "MICRO" }, { label: "21–50 people", value: "SMALL" }, { label: "51–200 people", value: "MEDIUM" }, { label: "More than 200 people", value: "LARGE" },
      ] },
      { id: "improvement_readiness", label: "When would you want to improve one important workflow?", area: "FULL_FACTORY", required: true, options: [
        { label: "Start now", value: "START_NOW" }, { label: "Within the next 3 months", value: "NEXT_3_MONTHS" }, { label: "Later", value: "LATER" }, { label: "I am only exploring", value: "EXPLORING" },
      ] },
    ],
  },
  {
    id: "daily-work",
    title: "What takes effort each day?",
    description: "Choose the answer closest to how work happens now.",
    questions: [
      { id: "people_and_payroll", label: "How do you manage worker records, attendance, and payroll?", area: "EMPLOYEE", required: true, options: [
        { label: "Mostly paper or memory", value: "PAPER_OR_MEMORY" }, { label: "Mostly spreadsheets", value: "SPREADSHEETS" }, { label: "Separate tools that need manual updates", value: "SEPARATE_TOOLS" }, { label: "One connected system", value: "CONNECTED_SYSTEM" },
      ] },
      { id: "production_visibility", label: "When can you see whether today's production is on track?", area: "PRODUCTION", required: true, options: [
        { label: "After the shift or later", value: "AFTER_SHIFT_OR_LATER" }, { label: "From a board or paper update", value: "BOARD_OR_PAPER" }, { label: "From a spreadsheet", value: "SPREADSHEET" }, { label: "Live in a system", value: "LIVE_SYSTEM" },
      ] },
      { id: "stock_control", label: "How do you usually know what stock is available?", area: "INVENTORY", required: true, options: [
        { label: "We look, count, or rely on memory", value: "VISUAL_OR_MEMORY" }, { label: "We check paper records", value: "PAPER" }, { label: "We check spreadsheets", value: "SPREADSHEET" }, { label: "We check a live stock system", value: "LIVE_SYSTEM" },
      ] },
    ],
  },
  {
    id: "visibility",
    title: "Can you spot issues early?",
    description: "These questions show where clearer information may help.",
    questions: [
      { id: "cost_and_cash_visibility", label: "How quickly can you see real costs and cash due?", area: "FINANCE", required: true, options: [
        { label: "We mostly guess or find out late", value: "GUESS_OR_DELAYED" }, { label: "In monthly reports", value: "MONTHLY_REPORTS" }, { label: "From spreadsheets", value: "SPREADSHEETS" }, { label: "Live in a system", value: "LIVE_SYSTEM" },
      ] },
      { id: "owner_reporting", label: "How do owners get a useful factory update?", area: "REPORTING", required: true, options: [
        { label: "Ask people and wait", value: "ASK_AND_WAIT" }, { label: "A manual weekly report", value: "MANUAL_WEEKLY" }, { label: "A spreadsheet dashboard", value: "SPREADSHEET_DASHBOARD" }, { label: "A live dashboard", value: "LIVE_DASHBOARD" },
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
