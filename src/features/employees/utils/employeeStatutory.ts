import type { EmployeeStatutoryProfileRequest } from "../types/employee.types";

export function createDefaultStatutoryProfile(): EmployeeStatutoryProfileRequest {
  return {
    panNumber: "",
    uan: "",
    pfAccountNumber: "",
    pfEnabled: false,
    epsMember: false,
    pfCalculationType: "STATUTORY_CEILING",
    customPfWage: undefined,
    voluntaryPfEnabled: false,
    voluntaryPfPercent: undefined,
    taxRegime: "NEW",
    previousEmployerIncome: undefined,
    otherDeclaredIncome: undefined,
    housePropertyIncome: undefined,
    declaredDeductionsTotal: undefined,
  };
}

export function normalizeStatutoryProfile(
  values: EmployeeStatutoryProfileRequest
): EmployeeStatutoryProfileRequest {
  return {
    ...values,
    panNumber: values.panNumber?.trim() || undefined,
    uan: values.uan?.trim() || undefined,
    pfAccountNumber: values.pfAccountNumber?.trim() || undefined,
    customPfWage:
      values.pfCalculationType === "CUSTOM" ? values.customPfWage : undefined,
    voluntaryPfPercent: values.voluntaryPfEnabled
      ? values.voluntaryPfPercent
      : undefined,
    declaredDeductionsTotal:
      values.taxRegime === "OLD" ? values.declaredDeductionsTotal : undefined,
  };
}
