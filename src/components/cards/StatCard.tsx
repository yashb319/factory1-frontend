import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        {Icon && (
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            <Icon size={18} />
          </div>
        )}
      </div>

      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>

      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}