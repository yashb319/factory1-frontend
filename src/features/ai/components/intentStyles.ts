export type IntentStyle = {
  label: string;
  badge: string;
  border: string;
  dot: string;
};

const STYLES: Record<string, IntentStyle> = {
  CREATE: {
    label: "Create",
    badge: "bg-emerald-100 text-emerald-700",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  UPDATE: {
    label: "Update",
    badge: "bg-amber-100 text-amber-700",
    border: "border-l-amber-500",
    dot: "bg-amber-500",
  },
  DELETE: {
    label: "Delete",
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-500",
    dot: "bg-red-500",
  },
  ARCHIVE: {
    label: "Archive",
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-500",
    dot: "bg-red-500",
  },
  RESTORE: {
    label: "Restore",
    badge: "bg-teal-100 text-teal-700",
    border: "border-l-teal-500",
    dot: "bg-teal-500",
  },
  GET: {
    label: "Lookup",
    badge: "bg-sky-100 text-sky-700",
    border: "border-l-sky-500",
    dot: "bg-sky-500",
  },
  SEARCH: {
    label: "Search",
    badge: "bg-sky-100 text-sky-700",
    border: "border-l-sky-500",
    dot: "bg-sky-500",
  },
  REPORT: {
    label: "Report",
    badge: "bg-blue-100 text-blue-700",
    border: "border-l-blue-500",
    dot: "bg-blue-500",
  },
  ANALYTICS: {
    label: "Analytics",
    badge: "bg-violet-100 text-violet-700",
    border: "border-l-violet-500",
    dot: "bg-violet-500",
  },
  SUMMARIZE: {
    label: "Summary",
    badge: "bg-violet-100 text-violet-700",
    border: "border-l-violet-500",
    dot: "bg-violet-500",
  },
  APPROVE: {
    label: "Approve",
    badge: "bg-emerald-100 text-emerald-700",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  EXPORT: {
    label: "Export",
    badge: "bg-indigo-100 text-indigo-700",
    border: "border-l-indigo-500",
    dot: "bg-indigo-500",
  },
  IMPORT: {
    label: "Import",
    badge: "bg-indigo-100 text-indigo-700",
    border: "border-l-indigo-500",
    dot: "bg-indigo-500",
  },
  HELP: {
    label: "Help",
    badge: "bg-slate-100 text-slate-700",
    border: "border-l-slate-400",
    dot: "bg-slate-400",
  },
};

const FALLBACK: IntentStyle = {
  label: "Assistant",
  badge: "bg-slate-100 text-slate-700",
  border: "border-l-slate-400",
  dot: "bg-slate-400",
};

export function intentStyle(intent?: string | null): IntentStyle {
  if (!intent) {
    return FALLBACK;
  }

  return STYLES[intent.toUpperCase()] ?? FALLBACK;
}
