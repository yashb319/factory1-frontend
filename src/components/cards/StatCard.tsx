import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { moduleTheme, type ModuleKey } from "@/config/theme";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  chart?: ReactNode;
  module?: ModuleKey;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  chart,
  module = "dashboard",
}: StatCardProps) {
  const theme = moduleTheme[module];

  return (
    <div
      className="rounded-lg border border-[var(--factory1-border)] bg-white p-3"
      style={{ borderTopColor: theme.color, borderTopWidth: 3 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--factory1-text-secondary)]">{title}</p>

        {Icon && (
          <div
            className="rounded-md p-1.5 sm:p-2"
            style={{ backgroundColor: theme.light, color: theme.color }}
          >
            <Icon size={16} className="sm:hidden" />
            <Icon size={18} className="hidden sm:block" />
          </div>
        )}
      </div>

      <p className="mt-2 text-xl font-bold text-[var(--factory1-text-primary)] sm:text-2xl">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-[var(--factory1-text-muted)]">{description}</p>
      )}

      {chart && <div className="mt-3">{chart}</div>}
    </div>
  );
}
