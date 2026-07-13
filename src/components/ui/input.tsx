import * as React from "react"

import { cn } from "@/lib/utils"

const autoSelectTypes = new Set([
  "email",
  "number",
  "search",
  "tel",
  "text",
  "time",
  "url",
]);

function Input({
  className,
  type = "text",
  onFocus,
  onMouseUp,
  ...props
}: React.ComponentProps<"input">) {
  const autoSelectDisabled =
    (props as Record<string, unknown>)["data-no-auto-select"] === true ||
    (props as Record<string, unknown>)["data-no-auto-select"] === "true";

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);

    if (
      event.defaultPrevented ||
      props.readOnly ||
      props.disabled ||
      autoSelectDisabled ||
      !autoSelectTypes.has(type)
    ) {
      return;
    }

    event.currentTarget.select();
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLInputElement>) => {
    onMouseUp?.(event);

    if (
      event.defaultPrevented ||
      props.readOnly ||
      props.disabled ||
      autoSelectDisabled ||
      !autoSelectTypes.has(type)
    ) {
      return;
    }

    event.preventDefault();
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-[var(--factory1-border-strong)] bg-white px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--factory1-text-disabled)] focus-visible:border-[var(--factory1-primary)] focus-visible:ring-3 focus-visible:ring-[var(--factory1-focus-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--factory1-surface-muted)] disabled:text-[var(--factory1-text-disabled)] disabled:opacity-100 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      {...props}
    />
  )
}

export { Input }
