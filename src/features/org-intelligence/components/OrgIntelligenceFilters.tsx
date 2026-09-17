"use client";

import { LayoutList, Search, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { EmployeeStatus } from "../types/orgIntelligence.types";
import { EMPLOYEE_STATUS_LABEL, type OrgFilters } from "../utils/orgIntelligence.utils";

const STATUS_OPTIONS: EmployeeStatus[] = ["ACTIVE", "ON_LEAVE", "INACTIVE", "TERMINATED"];

interface Props {
  filters: OrgFilters;
  onChange: (next: Partial<OrgFilters>) => void;
  departments: string[];
  view: "tree" | "table";
  onViewChange: (view: "tree" | "table") => void;
}

export function OrgIntelligenceFilters({
  filters,
  onChange,
  departments,
  view,
  onViewChange,
}: Props) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, designation..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.department}
          onValueChange={(value) => onChange({ department: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(value) => onChange({ status: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {EMPLOYEE_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={filters.issuesOnly ? "default" : "outline"}
            className="w-full"
            onClick={() => onChange({ issuesOnly: !filters.issuesOnly })}
          >
            Data issues only
          </Button>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2 border-t pt-3">
        <Button
          type="button"
          variant={view === "tree" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("tree")}
        >
          <LayoutList className="mr-2 h-4 w-4" />
          Tree
        </Button>
        <Button
          type="button"
          variant={view === "table" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("table")}
        >
          <Table2 className="mr-2 h-4 w-4" />
          Table
        </Button>
      </div>
    </div>
  );
}
