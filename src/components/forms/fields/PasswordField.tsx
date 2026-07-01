"use client";

import { TextField } from "./TextField";
import type { FieldValues, Path } from "react-hook-form";

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
  return (
    <TextField
      name={name}
      label={label}
      placeholder={placeholder}
      type="password"
      helperText={helperText}
      disabled={disabled}
      required={required}
    />
  );
}