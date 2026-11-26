"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetNextEmployeeCodeQuery,
} from "../api/employeeApi";
import { TallyMasterList } from "@/components/layout/TallyMasterList";
import type {
  CreateEmployeeRequest,
  EmployeeStatutoryProfileRequest,
  UpdateEmployeeRequest,
} from "../types/employee.types";
import {
  createDefaultStatutoryProfile,
  normalizeStatutoryProfile,
} from "../utils/employeeStatutory";

const STATUTORY_FIELD_KEYS = [
  "panNumber",
  "uan",
  "pfAccountNumber",
  "pfEnabled",
  "epsMember",
  "pfCalculationType",
  "customPfWage",
  "voluntaryPfEnabled",
  "voluntaryPfPercent",
  "taxRegime",
  "previousEmployerIncome",
  "otherDeclaredIncome",
  "housePropertyIncome",
  "declaredDeductionsTotal",
] as const;

function optionalNumber(value: unknown) {
  return value === "" || value === undefined ? undefined : Number(value);
}

export function EmployeesTallyView({
  initialScreen = "list",
}: {
  initialScreen?: "list" | "create" | "alter";
}) {
  const router = useRouter();
  const { data, isFetching } = useGetEmployeesQuery({
    page: 0,
    size: 300,
    sortBy: "name",
    sortDirection: "asc",
  });

  const [createEmployee, createEmployeeState] = useCreateEmployeeMutation();
  const [updateEmployee, updateEmployeeState] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const { data: suggestedCode } = useGetNextEmployeeCodeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const items = useMemo(() => data?.content ?? [], [data]);

  return (
    <TallyMasterList
      title="Employees"
      initialScreen={initialScreen}
      subtitle="Manage employee records. Use the Employees editor for component salary breakdowns."
      items={items}
      columns={[
        { key: "employeeCode", label: "Code" },
        { key: "name", label: "Name" },
        { key: "department", label: "Department" },
        { key: "designation", label: "Designation" },
        {
          key: "salaryRate",
          label: "Salary",
          className: "text-right",
          render: (item) => {
            if (
              item.salaryConfigurationType === "UNCONFIGURED" ||
              (item.salaryConfigurationType === undefined &&
                item.salaryRate == null)
            ) {
              return "Not configured";
            }
            if (item.salaryConfigurationType === "COMPONENTS") {
              return (
                <div className="space-y-0.5">
                  {(item.salaryComponents ?? []).map((component) => (
                    <p key={`${component.name}-${component.type}`}>
                      {component.name}: ₹
                      {component.amount.toLocaleString("en-IN")}
                    </p>
                  ))}
                </div>
              );
            }
            return new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(item.salaryRate ?? 0);
          },
        },
        { key: "status", label: "Status" },
      ]}
      fields={[
        {
          key: "code",
          label: "Employee Code (automatic)",
          type: "text",
          createOnly: true,
          readOnly: true,
        },
        { key: "name", label: "Name", type: "text", required: true, autoFocus: true },
        { key: "phone", label: "Phone", type: "text" },
        {
          key: "mobile",
          label: "Mobile",
          type: "text",
          inputMode: "numeric",
          maxLength: 10,
        },
        { key: "email", label: "Email", type: "email" },
        { key: "department", label: "Department", type: "text" },
        { key: "designation", label: "Designation", type: "text" },
        {
          key: "salaryRate",
          label: "Salary Rate",
          type: "number",
          min: 0,
          step: 0.01,
        },
        {
          key: "salaryType",
          label: "Salary Type",
          type: "select",
          options: [
            { value: "HOURLY", label: "Hourly" },
            { value: "DAILY", label: "Daily" },
            { value: "MONTHLY", label: "Monthly" },
          ],
        },
        { key: "joiningDate", label: "Joining Date", type: "date" },
        { key: "dateOfBirth", label: "Date of Birth", type: "date" },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ],
        },
        { key: "panNumber", label: "PAN Number", type: "text", createOnly: true },
        { key: "uan", label: "UAN", type: "text", createOnly: true },
        {
          key: "pfAccountNumber",
          label: "PF Account Number",
          type: "text",
          createOnly: true,
        },
        {
          key: "pfEnabled",
          label: "PF Enabled",
          type: "checkbox",
          createOnly: true,
        },
        {
          key: "epsMember",
          label: "EPS Member",
          type: "checkbox",
          createOnly: true,
        },
        {
          key: "pfCalculationType",
          label: "PF Calculation",
          type: "select",
          createOnly: true,
          options: [
            { value: "STATUTORY_CEILING", label: "Statutory Ceiling" },
            { value: "ACTUAL_WAGES", label: "Actual Wages" },
            { value: "CUSTOM", label: "Custom" },
          ],
        },
        {
          key: "customPfWage",
          label: "Custom PF Wage",
          type: "number",
          createOnly: true,
          min: 0,
          step: 0.01,
        },
        {
          key: "voluntaryPfEnabled",
          label: "Voluntary PF",
          type: "checkbox",
          createOnly: true,
        },
        {
          key: "voluntaryPfPercent",
          label: "Voluntary PF %",
          type: "number",
          createOnly: true,
          min: 0,
          max: 100,
          step: 0.01,
        },
        {
          key: "taxRegime",
          label: "Tax Regime",
          type: "select",
          createOnly: true,
          options: [
            { value: "NEW", label: "New" },
            { value: "OLD", label: "Old" },
          ],
        },
        {
          key: "previousEmployerIncome",
          label: "Previous Employer Income",
          type: "number",
          createOnly: true,
          min: 0,
          step: 0.01,
        },
        {
          key: "otherDeclaredIncome",
          label: "Other Declared Income",
          type: "number",
          createOnly: true,
          min: 0,
          step: 0.01,
        },
        {
          key: "housePropertyIncome",
          label: "House Property Income",
          type: "number",
          createOnly: true,
          step: 0.01,
        },
        {
          key: "declaredDeductionsTotal",
          label: "Declared Deductions",
          type: "number",
          createOnly: true,
          min: 0,
          step: 0.01,
        },
      ]}
      isFetching={isFetching}
      onSelectItem={() => {}}
      validateDraft={(draft) => {
        const mobile = String(draft.mobile ?? "");
        if (mobile && !/^\d{10}$/.test(mobile)) {
          return "Mobile number must contain exactly 10 digits";
        }
        if (
          draft.dateOfBirth &&
          draft.joiningDate &&
          String(draft.dateOfBirth) >= String(draft.joiningDate)
        ) {
          return "Date of birth must be before the joining date";
        }
        const hasSalaryRate =
          draft.salaryRate !== "" &&
          draft.salaryRate !== undefined &&
          draft.salaryRate !== null;
        const hasSalaryType = Boolean(String(draft.salaryType ?? "").trim());
        if (hasSalaryRate !== hasSalaryType) {
          return "Legacy salary rate and type must be supplied together";
        }
        if (
          hasSalaryRate &&
          (!Number.isFinite(Number(draft.salaryRate)) ||
            Number(draft.salaryRate) < 0)
        ) {
          return "Salary Rate cannot be negative";
        }
      }}
      onCreateItem={async (data) => {
        const employeeData = { ...data };
        delete employeeData.code;
        const salaryRate = optionalNumber(employeeData.salaryRate);
        const salaryType = String(employeeData.salaryType ?? "");
        delete employeeData.salaryRate;
        delete employeeData.salaryType;

        const statutoryProfile: EmployeeStatutoryProfileRequest = {
          ...createDefaultStatutoryProfile(),
          panNumber: String(employeeData.panNumber ?? ""),
          uan: String(employeeData.uan ?? ""),
          pfAccountNumber: String(employeeData.pfAccountNumber ?? ""),
          pfEnabled: Boolean(employeeData.pfEnabled),
          epsMember: Boolean(employeeData.epsMember),
          pfCalculationType:
            (employeeData.pfCalculationType as
              | EmployeeStatutoryProfileRequest["pfCalculationType"]
              | "") || "STATUTORY_CEILING",
          customPfWage: optionalNumber(employeeData.customPfWage),
          voluntaryPfEnabled: Boolean(employeeData.voluntaryPfEnabled),
          voluntaryPfPercent: optionalNumber(employeeData.voluntaryPfPercent),
          taxRegime:
            (employeeData.taxRegime as
              | EmployeeStatutoryProfileRequest["taxRegime"]
              | "") || "NEW",
          previousEmployerIncome: optionalNumber(
            employeeData.previousEmployerIncome
          ),
          otherDeclaredIncome: optionalNumber(
            employeeData.otherDeclaredIncome
          ),
          housePropertyIncome: optionalNumber(employeeData.housePropertyIncome),
          declaredDeductionsTotal: optionalNumber(
            employeeData.declaredDeductionsTotal
          ),
        };
        STATUTORY_FIELD_KEYS.forEach((key) => {
          delete employeeData[key];
        });

        return createEmployee({
          ...(employeeData as unknown as CreateEmployeeRequest),
          ...(salaryRate !== undefined && salaryType
            ? {
                salaryConfigurationType: "LEGACY" as const,
                salaryRate,
                salaryType: salaryType as CreateEmployeeRequest["salaryType"],
                salaryComponents: [],
              }
            : {
                salaryConfigurationType: "UNCONFIGURED" as const,
                salaryComponents: [],
              }),
          statutoryProfile: normalizeStatutoryProfile(statutoryProfile),
        }).unwrap();
      }}
      onUpdateItem={(id, data) => {
        const employeeData = { ...data };
        const salaryRate = optionalNumber(employeeData.salaryRate);
        const salaryType = String(employeeData.salaryType ?? "");
        delete employeeData.salaryRate;
        delete employeeData.salaryType;
        return updateEmployee({
          id,
          body: {
            ...(employeeData as unknown as UpdateEmployeeRequest),
            ...(salaryRate !== undefined && salaryType
              ? {
                  salaryConfigurationType: "LEGACY" as const,
                  salaryRate,
                  salaryType: salaryType as UpdateEmployeeRequest["salaryType"],
                  salaryComponents: [],
                }
              : {}),
          },
        }).unwrap();
      }}
      onDeleteItem={(id) => deleteEmployee(id).unwrap()}
      isCreating={createEmployeeState.isLoading}
      isUpdating={updateEmployeeState.isLoading}
      suggestedCode={suggestedCode}
      onBack={() => router.push("/gateway?menu=employees")}
    />
  );
}
