import { brandColors, semanticColors } from "@/config/theme";
import { cn } from "@/lib/utils";

type StatusTone =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "draft"
  | "pending"
  | "approved"
  | "paid"
  | "cancelled";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
};

const toneStyles: Record<StatusTone, { color: string; backgroundColor: string }> = {
  success: {
    color: semanticColors.success,
    backgroundColor: semanticColors.successLight,
  },
  error: {
    color: semanticColors.error,
    backgroundColor: semanticColors.errorLight,
  },
  warning: {
    color: semanticColors.warning,
    backgroundColor: semanticColors.warningLight,
  },
  info: {
    color: semanticColors.info,
    backgroundColor: semanticColors.infoLight,
  },
  draft: {
    color: semanticColors.draft,
    backgroundColor: brandColors.surfaceMuted,
  },
  pending: {
    color: semanticColors.pending,
    backgroundColor: "#FFEDD5",
  },
  approved: {
    color: semanticColors.approved,
    backgroundColor: semanticColors.successLight,
  },
  paid: {
    color: semanticColors.paid,
    backgroundColor: "#D1FAE5",
  },
  cancelled: {
    color: semanticColors.cancelled,
    backgroundColor: semanticColors.errorLight,
  },
};

export function StatusBadge({
  children,
  tone = "info",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        className
      )}
      style={toneStyles[tone]}
    >
      {children}
    </span>
  );
}
