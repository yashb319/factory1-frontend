"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  /**
   * When true, typing a value that doesn't match any option keeps the typed
   * text as the value (e.g. designation). When false, a value can only be
   * chosen from `options` (e.g. reporting-to employee reference).
   */
  allowFreeText?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Lightweight searchable combobox: a text input that filters a dropdown list
 * of options. Supports free-text entry for fields like designation, or a
 * strict "pick from the list" mode for reference fields like reporting-to.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyText = "No matches found",
  allowFreeText = true,
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  // Null means "not currently being edited" — the input then displays the
  // resolved label for `value` instead of a stale typed draft.
  const [draft, setDraft] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const displayValue =
    draft !== null ? draft : selectedOption ? selectedOption.label : value;

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
        setDraft(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = displayValue.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(term)
    );
  }, [options, displayValue]);

  function handlePick(option: ComboboxOption) {
    onChange(option.value);
    setDraft(null);
    setOpen(false);
  }

  function handleBlurCommit() {
    if (draft === null) return;

    if (allowFreeText) {
      const trimmed = draft.trim();
      if (trimmed !== value) onChange(trimmed);
    }
    // Strict mode: nothing to commit — reverting draft below shows the last
    // valid selection again.
    setDraft(null);
  }

  return (
    <div className={cn("relative", className)} ref={boxRef}>
      <div className="relative">
        <Input
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
            if (allowFreeText) onChange(event.target.value);
          }}
          onBlur={handleBlurCommit}
          className="pr-8"
        />
        <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {filteredOptions.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {emptyText}
            </p>
          )}

          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handlePick(option)}
            >
              <span className="min-w-0 truncate">
                {option.label}
                {option.description && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </span>
              {option.value === value && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
