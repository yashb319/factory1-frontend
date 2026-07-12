"use client";

import { AlertTriangle, Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  InventoryItemStatus,
  InventoryItemType,
  InventorySearchParams,
} from "../types/inventory.types";

type Props = {
  filters: InventorySearchParams;
  onChange: (filters: InventorySearchParams) => void;
};

export function InventoryFilters({ filters, onChange }: Props) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filter inventory
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:min-w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search item code or name"
            value={filters.search ?? ""}
            onChange={(event) =>
              onChange({
                ...filters,
                search: event.target.value,
                page: 0,
              })
            }
            className="pl-9"
          />
        </div>

        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={filters.itemType ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              itemType: event.target.value as InventoryItemType | "",
              page: 0,
            })
          }
        >
          <option value="">All Types</option>
          <option value="RAW_MATERIAL">Raw Material</option>
          <option value="FINISHED_GOOD">Finished Good</option>
          <option value="PACKAGING">Packaging</option>
          <option value="CONSUMABLE">Consumable</option>
          <option value="SEMI_FINISHED">Semi Finished</option>
          <option value="OTHER">Other</option>
        </select>

        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={filters.status ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as InventoryItemStatus | "",
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
          variant={filters.lowStockOnly ? "default" : "outline"}
          onClick={() =>
            onChange({
              ...filters,
              lowStockOnly: !filters.lowStockOnly,
              page: 0,
            })
          }
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Low Stock
        </Button>

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
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
