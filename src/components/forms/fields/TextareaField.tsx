"use client";

import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "../FieldError";
import { FieldHelper } from "../FieldHelper";

type TextareaFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
};

export function TextareaField<T extends FieldValues>({
  name,
  label,
  placeholder,
  helperText,
  disabled = false,
  required = false,
}: TextareaFieldProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <Textarea
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
      />

      <FieldHelper text={helperText} />
      <FieldError message={error} />
    </div>
  );
}