"use client";

import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form";
import { FieldError } from "../FieldError";
import { FieldHelper } from "../FieldHelper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
};

export function SelectField<T extends FieldValues>({
  name,
  label,
  options,
  placeholder = "Select option",
  helperText,
  disabled = false,
  required = false,
}: SelectFieldProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <FieldHelper text={helperText} />
      <FieldError message={error} />
    </div>
  );
}