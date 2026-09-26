"use client";

import { useEffect, useMemo, useRef } from "react";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Employee } from "../types/employee.types";
import {
  EmployeeFormValues,
  employeeFormSchema,
} from "../schemas/employee.schema";
import {
  useGetEmployeeDesignationsQuery,
  useGetEmployeeStatutoryProfileQuery,
  useGetEmployeesQuery,
  useCreateEmployeeStatutoryProfileMutation,
  useUpdateEmployeeMutation,
  useUpdateEmployeeStatutoryProfileMutation,
} from "../api/employeeApi";
import { EmployeeForm } from "./EmployeeForm";
import { createDefaultStatutoryProfile } from "../utils/employeeStatutory";
import {
  EmployeeStatutorySaveError,
  saveEmployeeEdit,
} from "../utils/employeeFormPayload";

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
  statutoryProfile: createDefaultStatutoryProfile(),
};

function isNotFound(error: unknown) {
  return (error as FetchBaseQueryError | undefined)?.status === 404;
}

export function EditEmployeeDrawer({ employee, open, onOpenChange }: Props) {
  const [updateEmployee, { isLoading }] = useUpdateEmployeeMutation();
  const [createStatutoryProfile, createStatutoryState] =
    useCreateEmployeeStatutoryProfileMutation();
  const [updateStatutoryProfile, updateStatutoryState] =
    useUpdateEmployeeStatutoryProfileMutation();
  const profileQuery = useGetEmployeeStatutoryProfileQuery(employee?.id ?? "", {
    skip: !open || !employee,
  });
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
  const loadedEmployeeId = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !employee || loadedEmployeeId.current === employee.id) return;

    loadedEmployeeId.current = employee.id;
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
      statutoryProfile: createDefaultStatutoryProfile(),
    });
  }, [employee, form, open]);

  useEffect(() => {
    if (
      !open ||
      !employee ||
      !profileQuery.data ||
      form.getFieldState("statutoryProfile").isDirty
    ) {
      return;
    }
    form.setValue("statutoryProfile", profileQuery.data);
  }, [employee, form, open, profileQuery.data]);

  async function onSubmit(values: EmployeeFormValues) {
    if (!employee) return;

    try {
      await saveEmployeeEdit({
        employeeId: employee.id,
        hasStatutoryProfile: Boolean(profileQuery.data),
        values,
        updateEmployee: async (employeeId, body) => {
          await updateEmployee({ id: employeeId, body }).unwrap();
        },
        createStatutoryProfile: async (employeeId, body) => {
          await createStatutoryProfile({ employeeId, body }).unwrap();
        },
        updateStatutoryProfile: async (employeeId, body) => {
          await updateStatutoryProfile({ employeeId, body }).unwrap();
        },
      });
      toast.success("Employee updated successfully");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof EmployeeStatutorySaveError) {
        toast.error(
          "Employee fields were saved, but statutory details could not be saved. Review and try Save Changes again."
        );
        return;
      }
      toast.error("Failed to update employee");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      loadedEmployeeId.current = null;
      form.reset(defaultValues);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] max-h-[900px] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-3rem)]"
        onEscapeKeyDown={() => handleOpenChange(false)}
      >
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        {profileQuery.isError && !isNotFound(profileQuery.error) ? (
          <p
            role="alert"
            className="mx-4 mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:mx-6"
          >
            Statutory details could not be loaded. Close and retry before
            editing this employee.
          </p>
        ) : null}
        <EmployeeForm
          form={form}
          mode="edit"
          loading={
            isLoading ||
            createStatutoryState.isLoading ||
            updateStatutoryState.isLoading ||
            profileQuery.isLoading ||
            (profileQuery.isError && !isNotFound(profileQuery.error))
          }
          designationOptions={designations ?? []}
          reportingToOptions={reportingToOptions}
          onCancel={() => handleOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
