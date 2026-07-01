"use client";

import {
  FieldValues,
  Path,
  useController,
  useFormContext,
} from "react-hook-form";

import { cn } from "@/lib/utils";

export interface NumberFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  disabled,
  min,
  max,
  step = 1,
}: NumberFieldProps<T>) {
  const { control } = useFormContext<T>();

  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type="number"
        value={field.value ?? ""}
        onChange={(e) => {
          const value = e.target.value;

          field.onChange(value === "" ? undefined : Number(value));
        }}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive"
        )}
      />

      {error && (
        <p className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}