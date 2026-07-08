"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  EmployeeFormValues,
  employeeFormSchema,
} from "../schemas/employee.schema";
import { useCreateEmployeeMutation } from "../api/employeeApi";
import { EmployeeForm } from "./EmployeeForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultValues: EmployeeFormValues = {
  employeeCode: "",
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

export function AddEmployeeDrawer({ open, onOpenChange }: Props) {
  const [createEmployee, { isLoading }] = useCreateEmployeeMutation();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  async function onSubmit(values: EmployeeFormValues) {
    try {
      await createEmployee({
        ...values,
        phone: values.phone || undefined,
        email: values.email || undefined,
        photoDataUrl: values.photoDataUrl || undefined,
        designation: values.designation || undefined,
        department: values.department || undefined,
        joiningDate: values.joiningDate || undefined,
      }).unwrap();

      toast.success("Employee added successfully");
      form.reset(defaultValues);
      onOpenChange(false);
    } catch {
      toast.error("Failed to add employee");
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
          <SheetTitle>Add Employee</SheetTitle>
        </SheetHeader>

        <EmployeeForm
          form={form}
          mode="create"
          loading={isLoading}
          onCancel={() => handleOpenChange(false)}
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}
