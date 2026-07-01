"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useDeleteInventoryItemMutation,
  useGetInventoryDashboardQuery,
  useGetInventoryItemsQuery,
} from "../api/inventoryApi";
import type {
  InventoryItem,
  InventorySearchParams,
} from "../types/inventory.types";
import { exportInventoryCsv } from "../utils/inventoryExport";
import { InventoryAiInsights } from "./InventoryAiInsights";
import { InventoryDashboardCards } from "./InventoryDashboardCards";
import { InventoryDetailsDialog } from "./InventoryDetailsDialog";
import { InventoryFilters } from "./InventoryFilters";
import { InventoryFormDialog } from "./InventoryFormDialog";
import { InventoryTable } from "./InventoryTable";
import { StockMovementDialog } from "./StockMovementDialog";

export function InventoryPage() {
  const [filters, setFilters] = useState<InventorySearchParams>({
    page: 0,
    size: 10,
    sortBy: "createdAt",
    sortDirection: "DESC",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data: dashboard, isLoading: dashboardLoading } =
    useGetInventoryDashboardQuery();

  const { data, isLoading } = useGetInventoryItemsQuery(filters);

  const [deleteItem] = useDeleteInventoryItemMutation();

  const items = useMemo(() => data?.content ?? [], [data]);

  const openCreate = () => {
    setSelectedItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const openStock = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockOpen(true);
  };

  const openDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    const confirmed = window.confirm(
      `Disable ${item.name}? It will not be deleted permanently.`
    );

    if (!confirmed) return;

    await deleteItem(item.id).unwrap();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage raw materials, finished goods, stock movements and low-stock
            alerts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportInventoryCsv(items)}
            disabled={items.length === 0}
          >
            Export CSV
          </Button>

          <Button onClick={openCreate}>Add Item</Button>
        </div>
      </div>

      <InventoryDashboardCards
        data={dashboard}
        isLoading={dashboardLoading}
      />

      <InventoryAiInsights items={items} />

      <InventoryFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Loading inventory...
        </div>
      ) : (
        <InventoryTable
          items={items}
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          onPageChange={(page) =>
            setFilters((prev) => ({
              ...prev,
              page,
            }))
          }
          onView={openDetails}
          onEdit={openEdit}
          onStockMovement={openStock}
          onDelete={handleDelete}
        />
      )}

      <InventoryFormDialog
        open={formOpen}
        item={selectedItem}
        onClose={() => setFormOpen(false)}
      />

      <StockMovementDialog
        open={stockOpen}
        item={selectedItem}
        onClose={() => setStockOpen(false)}
      />

      <InventoryDetailsDialog
        open={detailsOpen}
        item={selectedItem}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}