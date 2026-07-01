import { PayrollStatus } from "../types/payroll.types";

export const monthOptions = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

export const getMonthName = (month: number) => {
  return monthOptions.find((m) => m.value === month)?.label ?? "-";
};

export const formatCurrency = (amount?: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
};

export const getPayrollStatusLabel = (status: PayrollStatus) => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "APPROVED":
      return "Approved";
    case "PAID":
      return "Paid";
    default:
      return status;
  }
};

export const currentYear = new Date().getFullYear();

export const yearOptions = Array.from({ length: 6 }).map((_, index) => {
  const year = currentYear - 2 + index;
  return {
    label: String(year),
    value: year,
  };
});