import type { SupplierAiInsight } from "../types/supplier.types";

export const getSeverityClass = (severity: SupplierAiInsight["severity"]) => {
  if (severity === "HIGH") return "border-red-200 bg-red-50 text-red-800";
  if (severity === "MEDIUM") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  return "border-muted bg-muted/30";
};