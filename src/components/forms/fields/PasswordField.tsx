"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FieldError } from "../FieldError";
import { FieldHelper } from "../FieldHelper";

type PasswordFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
};

export function PasswordField<T extends FieldValues>({
  name,
  label = "Password",
  placeholder = "Enter password",
  helperText,
  disabled = false,
  required = false,
}: PasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
          {...register(name)}
        />

        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon size={17} />
        </button>
      </div>

      <FieldHelper text={helperText} />
      <FieldError message={error} />
    </div>
  );
}
