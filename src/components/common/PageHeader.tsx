import type { LucideIcon } from "lucide-react";
import { moduleTheme, type ModuleKey } from "@/config/theme";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  module?: ModuleKey;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  module = "dashboard",
  actions,
}: PageHeaderProps) {
  const theme = moduleTheme[module];

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--factory1-border)] bg-[var(--factory1-background)] py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
            style={{
              backgroundColor: theme.light,
              borderColor: theme.color,
              color: theme.color,
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">
            {title}
          </h1>

          {description && (
            <p className="mt-1 text-sm text-[var(--factory1-text-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
