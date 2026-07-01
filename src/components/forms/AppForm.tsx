"use client";

import { FormProvider, type FieldValues, type UseFormReturn } from "react-hook-form";

type AppFormProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
};

export function AppForm<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className = "space-y-4",
}: AppFormProps<T>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
}