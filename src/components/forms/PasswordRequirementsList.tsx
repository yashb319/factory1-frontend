"use client";

import { Check, X } from "lucide-react";
import { passwordRequirements } from "@/lib/passwordPolicy";

type PasswordRequirementsListProps = {
  /** Current password value. Never logged or displayed elsewhere. */
  password: string;
  id?: string;
  className?: string;
};

/**
 * Presentational password policy checklist. Shown before typing (all items
 * pending) and updates live as the user types. Uses text + icon + a
 * screen-reader-only status (not color alone) so it stays accessible.
 */
export function PasswordRequirementsList({
  password,
  id,
  className,
}: PasswordRequirementsListProps) {
  return (
    <ul
      id={id}
      aria-live="polite"
      className={`mt-2 space-y-1 text-xs ${className ?? ""}`.trim()}
    >
      {passwordRequirements.map((requirement) => {
        const met = requirement.test(password);
        const Icon = met ? Check : X;

        return (
          <li
            key={requirement.id}
            className={`flex items-center gap-1.5 ${
              met ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            <span>
              {requirement.label}
              <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
