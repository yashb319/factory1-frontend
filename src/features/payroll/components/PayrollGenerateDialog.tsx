"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AppForm, FormActions, SelectField } from "@/components/forms";

import { useGeneratePayrollMutation } from "../api/payrollApi";
import { monthOptions, yearOptions } from "../utils/payroll.utils";

const payrollGenerateSchema = z.object({
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
});

type PayrollGenerateFormValues = z.infer<typeof payrollGenerateSchema>;

interface PayrollGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated?: (id: string) => void;
}

export function PayrollGenerateDialog({
  open,
  onOpenChange,
  onGenerated,
}: PayrollGenerateDialogProps) {
  const [generatePayroll, { isLoading }] = useGeneratePayrollMutation();

  const form = useForm<PayrollGenerateFormValues>({
    resolver: zodResolver(payrollGenerateSchema),
    defaultValues: {
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    },
  });

  async function onSubmit(values: PayrollGenerateFormValues) {
    try {
      const response = await generatePayroll({
        month: Number(values.month),
        year: Number(values.year),
      }).unwrap();

      toast.success("Payroll generated successfully");
      onGenerated?.(response.data.id);
      onOpenChange(false);

      form.reset({
        month: values.month,
        year: values.year,
      });
    } catch (error) {
      toast.error(errorMessage(error) ?? "Could not generate payroll");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Payroll</DialogTitle>
        </DialogHeader>

        <AppForm form={form} onSubmit={onSubmit}>
          <SelectField<PayrollGenerateFormValues>
            name="month"
            label="Month"
            options={monthOptions.map((month) => ({
              label: month.label,
              value: String(month.value),
            }))}
            required
          />

          <SelectField<PayrollGenerateFormValues>
            name="year"
            label="Year"
            options={yearOptions.map((year) => ({
              label: year.label,
              value: String(year.value),
            }))}
            required
          />

          <FormActions
            submitLabel="Generate Payroll"
            loading={isLoading}
            onCancel={() => onOpenChange(false)}
          />
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (error as { data?: { message?: string } }).data;

    return data?.message;
  }

  return null;
}
