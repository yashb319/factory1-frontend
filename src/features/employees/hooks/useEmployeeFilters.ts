"use client";

import { useState } from "react";
import { EmployeeListParams } from "../types/employee.types";

export function useEmployeeFilters() {
  const [filters, setFilters] = useState<EmployeeListParams>({
    page: 0,
    size: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
    search: "",
    status: "ALL",
    employeeType: "ALL",
    salaryType: "ALL",
  });

  const updateFilters = (next: Partial<EmployeeListParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...next,
      page: next.page ?? 0,
    }));
  };

  return {
    filters,
    updateFilters,
    setFilters,
  };
}