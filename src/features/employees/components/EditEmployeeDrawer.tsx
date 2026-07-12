"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Employee } from "../types/employee.types";
import {
  EmployeeFormValues,
  employeeFormSchema,
} from "../schemas/employee.schema";
import { useUpdateEmployeeMutation } from "../api/employeeApi";
import { EmployeeForm } from "./EmployeeForm";

interface Props {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultValues: EmployeeFormValues = {
  name: "",
  phone: "",
  email: "",
  photoDataUrl: "",
  employeeType: "BLUE_COLLAR",
  designation: "",
  department: "",
  salaryRate: 0,
  salaryType: "DAILY",
  joiningDate: "",
  status: "ACTIVE",
};

export function EditEmployeeDrawer({ employee, open, onOpenChange }: Props) {
  const [updateEmployee, { isLoading }] = useUpdateEmployeeMutation();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!employee) return;

    form.reset({
      name: employee.name,
      phone: employee.phone ?? "",
      email: employee.email ?? "",
      photoDataUrl: employee.photoDataUrl ?? "",
      employeeType: employee.employeeType,
      designation: employee.designation ?? "",
      department: employee.department ?? "",
      salaryRate: Number(employee.salaryRate ?? 0),
      salaryType: employee.salaryType,
      joiningDate: employee.joiningDate ?? "",
      status: employee.status,
    });
  }, [employee, form]);

  async function onSubmit(values: EmployeeFormValues) {
    if (!employee) return;

    try {
      await updateEmployee({
        id: employee.id,
        body: {
          ...values,
          phone: values.phone || undefined,
          email: values.email || undefined,
          photoDataUrl: values.photoDataUrl || undefined,
          designation: values.designation || undefined,
          department: values.department || undefined,
          joiningDate: values.joiningDate || undefined,
        },
      }).unwrap();

      toast.success("Employee updated successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update employee");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset(defaultValues);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-2xl lg:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Edit Employee</SheetTitle>
        </SheetHeader>

        <EmployeeForm
          form={form}
          mode="edit"
          loading={isLoading}
          onCancel={() => handleOpenChange(false)}
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}
