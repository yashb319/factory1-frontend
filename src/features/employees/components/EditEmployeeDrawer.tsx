"use client";

import { useEffect, useMemo } from "react";
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
import {
  useGetEmployeeDesignationsQuery,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
} from "../api/employeeApi";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeStatutoryForm } from "./EmployeeStatutoryForm";

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
  designation: "",
  department: "",
  salaryRate: 0,
  salaryType: "DAILY",
  joiningDate: "",
  status: "ACTIVE",
  location: "",
  dateOfBirth: "",
  gender: undefined,
  address: "",
  mobile: "",
  permanentAddress: "",
  maritalStatus: undefined,
  aadhaarNumber: "",
  bankAccountNumber: "",
  bankName: "",
  bankBranchName: "",
  bankIfscCode: "",
  employmentBasis: undefined,
  reportingToEmployeeId: "",
};

export function EditEmployeeDrawer({ employee, open, onOpenChange }: Props) {
  const [updateEmployee, { isLoading }] = useUpdateEmployeeMutation();
  const { data: designations } = useGetEmployeeDesignationsQuery(undefined, {
    skip: !open,
  });
  const { data: employeesPage } = useGetEmployeesQuery(
    { size: 1000, sortBy: "name", sortDirection: "asc" },
    { skip: !open }
  );

  const reportingToOptions = useMemo(
    () =>
      (employeesPage?.content ?? [])
        .filter((candidate) => candidate.id !== employee?.id)
        .map((candidate) => ({
          value: candidate.id,
          label: candidate.name,
          description: candidate.employeeCode,
        })),
    [employeesPage, employee?.id]
  );

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
      designation: employee.designation ?? "",
      department: employee.department ?? "",
      salaryRate: Number(employee.salaryRate ?? 0),
      salaryType: employee.salaryType,
      joiningDate: employee.joiningDate ?? "",
      status: employee.status,
      location: employee.location ?? "",
      dateOfBirth: employee.dateOfBirth ?? "",
      gender: employee.gender,
      address: employee.address ?? "",
      mobile: employee.mobile ?? "",
      permanentAddress: employee.permanentAddress ?? "",
      maritalStatus: employee.maritalStatus,
      aadhaarNumber: employee.aadhaarNumber ?? "",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      bankName: employee.bankName ?? "",
      bankBranchName: employee.bankBranchName ?? "",
      bankIfscCode: employee.bankIfscCode ?? "",
      employmentBasis: employee.employmentBasis,
      reportingToEmployeeId: employee.reportingToEmployeeId ?? "",
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
          location: values.location || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
          gender: values.gender || undefined,
          address: values.address || undefined,
          mobile: values.mobile || undefined,
          permanentAddress: values.permanentAddress || undefined,
          maritalStatus: values.maritalStatus || undefined,
          aadhaarNumber: values.aadhaarNumber || undefined,
          bankAccountNumber: values.bankAccountNumber || undefined,
          bankName: values.bankName || undefined,
          bankBranchName: values.bankBranchName || undefined,
          bankIfscCode: values.bankIfscCode || undefined,
          employmentBasis: values.employmentBasis || undefined,
          reportingToEmployeeId: values.reportingToEmployeeId || undefined,
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
          designationOptions={designations ?? []}
          reportingToOptions={reportingToOptions}
          onCancel={() => handleOpenChange(false)}
          onSubmit={onSubmit}
        />
        {employee && <EmployeeStatutoryForm employeeId={employee.id} />}
      </SheetContent>
    </Sheet>
  );
}
