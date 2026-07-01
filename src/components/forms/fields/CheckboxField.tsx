"use client";

import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "../FieldError";
import { FieldHelper } from "../FieldHelper";

type CheckboxFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  helperText?: string;
  disabled?: boolean;
};

export function CheckboxField<T extends FieldValues>({
  name,
  label,
  helperText,
  disabled = false,
}: CheckboxFieldProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className="mt-1"
            />
          )}
        />

        <div>
          <label className="text-sm font-medium text-slate-700">{label}</label>
          <FieldHelper text={helperText} />
        </div>
      </div>

      <FieldError message={error} />
    </div>
  );
}