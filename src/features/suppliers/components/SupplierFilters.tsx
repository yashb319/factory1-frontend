"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SupplierSearchParams, SupplierStatus } from "../types/supplier.types";

type Props = {
  filters: SupplierSearchParams;
  onChange: (filters: SupplierSearchParams) => void;
};

export function SupplierFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
      <Input
        placeholder="Search code, name, phone or GST"
        value={filters.search ?? ""}
        onChange={(e) => onChange({ ...filters, search: e.target.value, page: 0 })}
        className="md:max-w-xs"
      />

      <Input
        placeholder="City"
        value={filters.city ?? ""}
        onChange={(e) => onChange({ ...filters, city: e.target.value, page: 0 })}
        className="md:max-w-[180px]"
      />

      <Input
        placeholder="State"
        value={filters.state ?? ""}
        onChange={(e) => onChange({ ...filters, state: e.target.value, page: 0 })}
        className="md:max-w-[180px]"
      />

      <select
        className="h-10 rounded-md border bg-background px-3 text-sm"
        value={filters.status ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            status: e.target.value as SupplierStatus | "",
            page: 0,
          })
        }
      >
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>

      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          onChange({
            page: 0,
            size: 10,
            sortBy: "createdAt",
            sortDirection: "DESC",
          })
        }
      >
        Reset
      </Button>
    </div>
  );
}