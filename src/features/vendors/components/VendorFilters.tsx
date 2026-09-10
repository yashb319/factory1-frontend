"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VendorSearchParams } from "../types/vendor.types";

type Props = {
  filters: VendorSearchParams;
  onChange: (filters: VendorSearchParams) => void;
};

export function VendorFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
      <Input
        placeholder="Search name, email or phone"
        value={filters.search ?? ""}
        onChange={(e) => onChange({ ...filters, search: e.target.value, page: 0 })}
        className="md:max-w-xs"
      />

      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          onChange({
            page: 0,
            size: 10,
            sortBy: "name",
            sortDirection: "ASC",
          })
        }
      >
        Reset
      </Button>
    </div>
  );
}
