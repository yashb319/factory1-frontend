"use client";

import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FieldError } from "../FieldError";
import { FieldHelper } from "../FieldHelper";

type TextFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
};

export function TextField<T extends FieldValues>({
  name,
  label,
  placeholder,
  type = "text",
  helperText,
  disabled = false,
  required = false,
}: TextFieldProps<T>) {
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

      <Input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
      />

      <FieldHelper text={helperText} />
      <FieldError message={error} />
    </div>
  );
}