"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep, type PopoverDOM } from "driver.js";
import { toast } from "sonner";

const TOUR_STORAGE_PREFIX = "factory1-walkthrough-seen:";
const GLOBAL_AUTO_TOUR_KEY = TOUR_STORAGE_PREFIX + "workspace";
const TOUR_EVENT = "factory1:start-walkthrough";

type ModuleTourConfig = {
  name: string;
  intro: string;
  workflow: string;
  actions: string;
  ai: string;
};

const moduleTourConfigs: Record<string, ModuleTourConfig> = {
  "/dashboard": {
    name: "Dashboard",
    intro: "This is your live factory overview. Use it to check employees, attendance, payroll, inventory, billing and production at a glance.",
    workflow: "The cards summarize the current health of your factory. Recent activity below shows what changed most recently.",
    actions: "Click any sidebar module when a dashboard number needs attention, such as low stock, absences or pending billing.",
    ai: "Ask AI for a plain-language summary of risks, charts or next steps across the modules your role can access.",
  },
  "/employees": {
    name: "Employees",
    intro: "This module manages worker and staff records, departments, designations, salary type and contact details.",
    workflow: "Use filters and the employee table to find records. Add, edit, view or disable employees from this workspace.",
    actions: "Use Import and Export for bulk movement. Employee records can later be linked with attendance, payroll and access management.",
    ai: "Ask AI to find employee data points, missing contact details or department summaries. Confirm before applying any AI-suggested updates.",
  },
  "/attendance": {
    name: "Attendance",
    intro: "This module tracks daily attendance, absences, leaves, half-days and monthly workforce signals.",
    workflow: "Start by checking today's stats and daily register, then use filters to review records by date or status.",
    actions: "Use Mark Attendance for manual entries. Attendance directly affects payroll and workforce planning.",
    ai: "Ask AI for absence summaries, leave patterns or workforce risk for the selected period.",
  },
  "/payroll": {
    name: "Payroll",
    intro: "This module generates, approves, pays and exports monthly salary runs.",
    workflow: "Use the dashboard cards and filters to find payroll runs, then open details to inspect employees, deductions and net salary.",
    actions: "Generate payroll only after employee and attendance data are ready. Approve and mark as paid when salary processing is complete.",
    ai: "Ask AI to explain payroll totals, overtime, deductions or payment risk.",
  },
  "/inventory": {
    name: "Inventory",
    intro: "This module manages raw materials, finished goods, stock levels, prices, suppliers and stock movements.",
    workflow: "Use dashboard cards to spot low stock, then filter the table to review active, raw material or finished goods items.",
    actions: "Add stock movements for manual adjustments. Supplier and billing flows can also increase or reduce stock automatically.",
    ai: "Ask AI for low-stock risks, out-of-stock items, inventory value charts or supplier mapping gaps.",
  },
  "/products": {
    name: "Products And Production",
    intro: "This module manages finished products, BOM setup and production entries.",
    workflow: "Create products, link them to finished goods inventory and configure BOM where production planning needs materials.",
    actions: "Use Record Production to increase finished goods and consume BOM materials when configured.",
    ai: "Ask AI whether production is ready, which products need BOM setup or how production looks this month.",
  },
  "/billing": {
    name: "Billing",
    intro: "This module creates sales bills and supplier bills with GST totals and stock updates.",
    workflow: "Choose Sales Bill to reduce stock for customers, or Supplier Bill to increase stock from vendors.",
    actions: "Use GST suggestions by HSN or item name, then post the bill. Recent bills appear on the right and can be exported.",
    ai: "Ask AI to find bills, summarize unpaid billing, compare sales and purchases or explain GST totals.",
  },
  "/accounting": {
    name: "Accounting",
    intro: "This module gives finance users party ledgers, receivables, payables and GST summaries from posted bills.",
    workflow: "Choose a month or quarter range, review ledger balances, then export ledger or GST CSVs for CA review.",
    actions: "Use Billing to post sales or supplier bills. Accounting reports update automatically from posted billing data.",
    ai: "Ask AI for receivable risks, payable totals, GST payable or party ledger summaries within your finance access.",
  },
  "/customers": {
    name: "Customers",
    intro: "This module manages customer records used in sales billing and receivable workflows.",
    workflow: "Use filters and the customer table to review GST details, contact people, payment terms and status.",
    actions: "Add or import customers before creating sales bills. Keep GST and contact details complete for cleaner invoices.",
    ai: "Ask AI for customer details, missing GST numbers or recent customer billing activity.",
  },
  "/suppliers": {
    name: "Suppliers",
    intro: "This module manages supplier records used for inventory purchases and supplier bills.",
    workflow: "Review vendor contact details, GST information, payment terms and active status from this workspace.",
    actions: "Add or import suppliers before supplier billing. Supplier mapping also helps inventory planning.",
    ai: "Ask AI for supplier details, missing GST numbers or purchase-bill activity by supplier.",
  },
  "/import-export": {
    name: "Import / Export History",
    intro: "This module tracks import and export jobs started across Factory1.",
    workflow: "Use it as the history view for CSV exports and imports, including status, row counts and download links.",
    actions: "Refresh the table to see the latest jobs. Completed exports can be downloaded from the action menu.",
    ai: "Ask AI to summarize recent data movement or identify failed import/export jobs.",
  },
  "/organization-settings": {
    name: "Organization Settings",
    intro: "This module manages organization profile, employee login access and role-based control.",
    workflow: "Use settings for business details and access management for employee user accounts.",
    actions: "Create employee logins here after adding employees, then test role-based access from their accounts.",
    ai: "Ask AI what setup is still needed before inviting the team.",
  },
  "/ai": {
    name: "AI Assistant",
    intro: "This is the full Factory1 AI chat area for asking questions across your factory data.",
    workflow: "Use the chat to ask detailed questions and request charts. AI uses live data and respects your role access.",
    actions: "For safe updates, AI will show a confirmation card before changing database records.",
    ai: "Try asking for specific data points, summaries, risks, charts or safe update proposals.",
  },
};

const fallbackTour: ModuleTourConfig = {
  name: "Factory1",
  intro: "This workspace helps you run factory operations from one place.",
  workflow: "Use the page content to complete the current module workflow.",
  actions: "Use sidebar navigation and search to move quickly between modules.",
  ai: "Open AI for live answers from the modules your role can access.",
};

function isVisible(selector: string) {
  const element = document.querySelector(selector);

  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function currentTourConfig(pathname: string) {
  return moduleTourConfigs[pathname] ?? fallbackTour;
}

function availableSteps(pathname: string) {
  const config = currentTourConfig(pathname);

  const steps: DriveStep[] = [
    {
      element: "[data-tour='workspace']",
      popover: {
        title: `${config.name} Walkthrough`,
        description: config.intro,
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='mobile-menu']",
      popover: {
        title: "Mobile Navigation",
        description:
          "Open the side menu from here on mobile to move between Factory1 modules.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='sidebar']",
      popover: {
        title: "Factory Modules",
        description:
          "Use the sidebar to move between dashboard, employees, attendance, payroll, inventory, billing and AI.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='sidebar-collapse']",
      popover: {
        title: "Collapse Sidebar",
        description:
          "Collapse the sidebar on desktop when you want more workspace for tables and forms.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='global-search']",
      popover: {
        title: "Quick Search",
        description:
          "Use search to quickly find records as your factory data grows.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workspace']",
      popover: {
        title: `${config.name} Workflow`,
        description: config.workflow,
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='workspace']",
      popover: {
        title: "Key Actions",
        description: config.actions,
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='ai-assistant']",
      popover: {
        title: `${config.name} AI`,
        description: config.ai,
        side: "left",
        align: "end",
      },
    },
    {
      element: "[data-tour='account-menu']",
      popover: {
        title: "Account And Settings",
        description:
          "Open this menu for organization settings, access management, the walkthrough and logout.",
        side: "bottom",
        align: "end",
      },
    },
  ];

  return steps.filter((step) =>
    typeof step.element === "string" ? isVisible(step.element) : true
  );
}

function polishPopover(popover: PopoverDOM) {
  const step = tourDriver?.getActiveStep();
  const title = step?.popover?.title;
  const description = step?.popover?.description;

  if (title) {
    popover.title.textContent = title;
    popover.title.style.display = "block";
  }

  if (description) {
    popover.description.textContent = description;
    popover.description.style.display = "block";
  }

  popover.wrapper.style.background = "#ffffff";
  popover.wrapper.style.color = "#0f172a";
  popover.wrapper.style.minWidth = "280px";
  popover.wrapper.style.maxWidth = "340px";
}

let tourDriver: ReturnType<typeof driver> | null = null;

function currentPathname() {
  return window.location.pathname || "/dashboard";
}

function startWalkthrough(pathname = currentPathname()) {
  const steps = availableSteps(pathname);

  if (!steps.length) {
    toast.info("Walkthrough is not available on this screen yet.");
    return;
  }

  tourDriver?.destroy();
  tourDriver = driver({
    steps,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 10,
    showProgress: true,
    popoverClass: "factory1-tour-popover",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    onPopoverRender: polishPopover,
    onDestroyed: () => {
      tourDriver = null;
    },
  });

  tourDriver.drive();
}

export function FactoryWalkthrough() {
  const pathname = usePathname();

  useEffect(() => {
    const start = () => startWalkthrough(pathname);

    window.addEventListener(TOUR_EVENT, start);

    const hasSeenTour =
      window.localStorage.getItem(GLOBAL_AUTO_TOUR_KEY) === "true";

    if (!hasSeenTour) {
      window.localStorage.setItem(GLOBAL_AUTO_TOUR_KEY, "true");
      window.setTimeout(() => startWalkthrough(pathname), 700);
    }

    return () => {
      window.removeEventListener(TOUR_EVENT, start);
    };
  }, [pathname]);

  return null;
}

export function startFactoryWalkthrough() {
  window.setTimeout(() => startWalkthrough(), 150);
}
