import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  chart?: ReactNode;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  chart,
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-3 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{title}</p>

        {Icon && (
          <div className="rounded-lg bg-slate-100 p-1.5 text-slate-600 sm:p-2">
            <Icon size={16} className="sm:hidden" />
            <Icon size={18} className="hidden sm:block" />
          </div>
        )}
      </div>

      <p className="mt-2 text-xl font-semibold text-slate-950 sm:mt-4 sm:text-2xl">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
      )}

      {chart && <div className="mt-3">{chart}</div>}
    </div>
  );
}
