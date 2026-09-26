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

import {
  EmployeeFormValues,
  employeeFormSchema,
} from "../schemas/employee.schema";
import {
  useCreateEmployeeMutation,
  useGetEmployeeDesignationsQuery,
  useGetEmployeesQuery,
  useGetNextEmployeeCodeQuery,
} from "../api/employeeApi";
import { EmployeeForm } from "./EmployeeForm";
import {
  createDefaultStatutoryProfile,
  normalizeStatutoryProfile,
} from "../utils/employeeStatutory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultValues: EmployeeFormValues = {
  code: "",
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
  statutoryProfile: createDefaultStatutoryProfile(),
};

export function AddEmployeeDrawer({ open, onOpenChange }: Props) {
  const [createEmployee, { isLoading }] = useCreateEmployeeMutation();
  const { data: designations } = useGetEmployeeDesignationsQuery(undefined, {
    skip: !open,
  });
  const { data: nextCode } = useGetNextEmployeeCodeQuery(undefined, {
    skip: !open,
    refetchOnMountOrArgChange: true,
  });
  const { data: employeesPage } = useGetEmployeesQuery(
    { size: 1000, sortBy: "name", sortDirection: "asc" },
    { skip: !open }
  );

  const reportingToOptions = useMemo(
    () =>
      (employeesPage?.content ?? []).map((candidate) => ({
        value: candidate.id,
        label: candidate.name,
        description: candidate.employeeCode,
      })),
    [employeesPage]
  );

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open && nextCode && !form.getValues("code")) {
      form.setValue("code", nextCode);
    }
  }, [form, nextCode, open]);

  async function onSubmit(values: EmployeeFormValues) {
    const { statutoryProfile, code, ...employeeValues } = values;
    void code;

    try {
      await createEmployee({
        ...employeeValues,
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
        statutoryProfile: normalizeStatutoryProfile(
          statutoryProfile ?? createDefaultStatutoryProfile()
        ),
      }).unwrap();
    } catch {
      toast.error("Failed to add employee");
      return;
    }

    toast.success("Employee and statutory details added successfully");
    form.reset(defaultValues);
    onOpenChange(false);
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
          designationOptions={designations ?? []}
          reportingToOptions={reportingToOptions}
          onCancel={() => handleOpenChange(false)}
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}
