"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeListParams } from "../types/employee.types";

interface Props {
  filters: EmployeeListParams;
  onChange: (filters: Partial<EmployeeListParams>) => void;
}

export function EmployeeFilters({ filters, onChange }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, phone..."
            value={filters.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.status ?? "ALL"}
          onValueChange={(value) => onChange({ status: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.employeeType ?? "ALL"}
          onValueChange={(value) => onChange({ employeeType: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Employee Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="BLUE_COLLAR">Blue Collar</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
            <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.salaryType ?? "ALL"}
          onValueChange={(value) => onChange({ salaryType: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Salary Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Salary Types</SelectItem>
            <SelectItem value="HOURLY">Hourly</SelectItem>
            <SelectItem value="DAILY">Daily</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}