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
import { getErrorMessage } from "@/lib/apiError";

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
    shouldFocusError: false,
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
      gender: employee.gender ?? undefined,
      address: employee.address ?? "",
      mobile: employee.mobile ?? "",
      permanentAddress: employee.permanentAddress ?? "",
      maritalStatus: employee.maritalStatus ?? undefined,
      aadhaarNumber: employee.aadhaarNumber ?? "",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      bankName: employee.bankName ?? "",
      bankBranchName: employee.bankBranchName ?? "",
      bankIfscCode: employee.bankIfscCode ?? "",
      employmentBasis: employee.employmentBasis ?? undefined,
      reportingToEmployeeId: employee.reportingToEmployeeId ?? "",
      fatherName: employee.fatherName ?? "",
      fatherDateOfBirth: employee.fatherDateOfBirth ?? "",
      fatherGender: employee.fatherGender ?? undefined,
      motherName: employee.motherName ?? "",
      motherDateOfBirth: employee.motherDateOfBirth ?? "",
      motherGender: employee.motherGender ?? undefined,
      spouseName: employee.spouseName ?? "",
      spouseDateOfBirth: employee.spouseDateOfBirth ?? "",
      spouseGender: employee.spouseGender ?? undefined,
      child1Name: employee.child1Name ?? "",
      child1DateOfBirth: employee.child1DateOfBirth ?? "",
      child1Gender: employee.child1Gender ?? undefined,
      child2Name: employee.child2Name ?? "",
      child2DateOfBirth: employee.child2DateOfBirth ?? "",
      child2Gender: employee.child2Gender ?? undefined,
      heightCm: employee.heightCm ?? undefined,
      weightKg: employee.weightKg ?? undefined,
      smoker: employee.smoker ?? undefined,
      occupation: employee.occupation ?? "",
      organizationName: employee.organizationName ?? "",
      annualIncome: employee.annualIncome ?? undefined,
      education: employee.education ?? "",
      nomineeName: employee.nomineeName ?? "",
      nomineeDateOfBirth: employee.nomineeDateOfBirth ?? "",
      nomineeGender: employee.nomineeGender ?? undefined,
      nomineeRelationship: employee.nomineeRelationship ?? "",
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
    form.setValue("statutoryProfile", {
      ...createDefaultStatutoryProfile(),
      panNumber: profileQuery.data.panNumber ?? "",
      uan: profileQuery.data.uan ?? "",
      pfAccountNumber: profileQuery.data.pfAccountNumber ?? "",
      pfEnabled: profileQuery.data.pfEnabled ?? false,
      epsMember: profileQuery.data.epsMember ?? false,
      pfCalculationType:
        profileQuery.data.pfCalculationType ?? "STATUTORY_CEILING",
      customPfWage: profileQuery.data.customPfWage ?? undefined,
      voluntaryPfEnabled: profileQuery.data.voluntaryPfEnabled ?? false,
      voluntaryPfPercent:
        profileQuery.data.voluntaryPfPercent ?? undefined,
      taxRegime: profileQuery.data.taxRegime ?? "NEW",
      previousEmployerIncome:
        profileQuery.data.previousEmployerIncome ?? undefined,
      otherDeclaredIncome:
        profileQuery.data.otherDeclaredIncome ?? undefined,
      housePropertyIncome:
        profileQuery.data.housePropertyIncome ?? undefined,
      declaredDeductionsTotal:
        profileQuery.data.declaredDeductionsTotal ?? undefined,
    });
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
        const backendMessage = getErrorMessage(error.cause, "");
        toast.error(
          backendMessage
            ? `Employee fields were saved, but statutory details could not be saved: ${backendMessage}`
            : "Employee fields were saved, but statutory details could not be saved. Review and try Save Changes again."
        );
        return;
      }
      toast.error(getErrorMessage(error, "Failed to update employee"));
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
        className="flex h-[calc(100dvh-1rem)] max-h-[960px] w-[95vw] max-w-[95vw] min-w-5xl flex-col gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-2rem)]"
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
