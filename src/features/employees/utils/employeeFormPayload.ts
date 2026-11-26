import type { EmployeeFormValues } from "../schemas/employee.schema";
import type {
  CreateEmployeeRequest,
  EmployeeStatutoryProfileRequest,
  UpdateEmployeeRequest,
} from "../types/employee.types";
import { normalizeStatutoryProfile } from "./employeeStatutory.ts";

export class EmployeeStatutorySaveError extends Error {
  constructor(options?: ErrorOptions) {
    super("Employee fields were saved, but statutory details were not.", options);
    this.name = "EmployeeStatutorySaveError";
  }
}

export function buildEmployeeSalaryRequest(
  values: EmployeeFormValues
): Pick<
  CreateEmployeeRequest,
  "salaryConfigurationType" | "salaryRate" | "salaryType" | "salaryComponents"
> {
  if (values.salaryConfigurationType === "LEGACY") {
    return {
      salaryConfigurationType: "LEGACY",
      salaryRate: values.salaryRate,
      salaryType: values.salaryType,
      salaryComponents: [],
    };
  }

  if (values.salaryConfigurationType === "COMPONENTS") {
    return {
      salaryConfigurationType: "COMPONENTS",
      salaryRate: undefined,
      salaryType: undefined,
      salaryComponents: values.salaryComponents,
    };
  }

  return {
    salaryConfigurationType: "UNCONFIGURED",
    salaryRate: undefined,
    salaryType: undefined,
    salaryComponents: [],
  };
}

export function buildEmployeeUpdateRequest(
  values: EmployeeFormValues
): UpdateEmployeeRequest {
  const {
    code,
    statutoryProfile,
    salaryConfigurationType,
    salaryRate,
    salaryType,
    salaryComponents,
    ...employeeValues
  } = values;
  void code;
  void statutoryProfile;
  void salaryConfigurationType;
  void salaryRate;
  void salaryType;
  void salaryComponents;

  return {
    ...employeeValues,
    ...buildEmployeeSalaryRequest(values),
    phone: values.phone || undefined,
    email: values.email || undefined,
    photoDataUrl: values.photoDataUrl?.trim() || "",
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
  };
}

export async function saveEmployeeEdit({
  employeeId,
  hasStatutoryProfile,
  values,
  updateEmployee,
  createStatutoryProfile,
  updateStatutoryProfile,
}: {
  employeeId: string;
  hasStatutoryProfile: boolean;
  values: EmployeeFormValues;
  updateEmployee: (
    employeeId: string,
    request: UpdateEmployeeRequest
  ) => Promise<void>;
  createStatutoryProfile: (
    employeeId: string,
    request: EmployeeStatutoryProfileRequest
  ) => Promise<void>;
  updateStatutoryProfile: (
    employeeId: string,
    request: EmployeeStatutoryProfileRequest
  ) => Promise<void>;
}) {
  await updateEmployee(employeeId, buildEmployeeUpdateRequest(values));

  const statutoryRequest = normalizeStatutoryProfile(
    values.statutoryProfile ?? {}
  );
  try {
    if (hasStatutoryProfile) {
      await updateStatutoryProfile(employeeId, statutoryRequest);
    } else {
      await createStatutoryProfile(employeeId, statutoryRequest);
    }
  } catch (error) {
    throw new EmployeeStatutorySaveError({ cause: error });
  }
}
