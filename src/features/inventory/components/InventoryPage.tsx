"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Download,
  PackagePlus,
  SearchCheck,
  Upload,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
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
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { InventoryBulkImportDialog } from "./InventoryBulkImportDialog";
import { InventoryConfirmDialog } from "./InventoryConfirmDialog";
import { InventoryDashboardCards } from "./InventoryDashboardCards";
import { InventoryDetailsDialog } from "./InventoryDetailsDialog";
import { InventoryFilters } from "./InventoryFilters";
import { InventoryFormDialog } from "./InventoryFormDialog";
import { InventoryInsightsPanel } from "./InventoryInsightsPanel";
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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data: dashboard, isLoading: dashboardLoading } =
    useGetInventoryDashboardQuery();

  const { data, isLoading } = useGetInventoryItemsQuery(filters);

  const [deleteItem, deleteState] = useDeleteInventoryItemMutation();
  const logDataJob = useLogDataJob();

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

  const openDeleteConfirm = (item: InventoryItem) => {
    setSelectedItem(item);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      await deleteItem(selectedItem.id).unwrap();
      toast.success("Inventory item disabled successfully");
      setConfirmOpen(false);
      setSelectedItem(null);
    } catch {
      toast.error("Failed to disable inventory item");
    }
  };

  const handleExport = () => {
    try {
      const exported = exportInventoryCsv(items);
      void logDataJob({
        operation: "EXPORT",
        module: "INVENTORY",
        fileName: exported.fileName,
        status: "COMPLETED",
        progress: 100,
        totalRows: items.length,
        successRows: items.length,
        failedRows: 0,
        outputFileUrl: exported.outputFileUrl,
      });
      toast.success("Inventory CSV exported successfully");
    } catch {
      toast.error("Failed to export inventory CSV");
    }
  };

  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Stock Control
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">Inventory</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage raw materials, finished goods, stock movements and low-stock
            alerts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--factory1-border)] bg-white p-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={items.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>

          <Button onClick={openCreate}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <InventoryInsightsPanel items={items} loading={isLoading} />

      <InventoryDashboardCards data={dashboard} isLoading={dashboardLoading} />

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            title: "Create item masters",
            description: "Maintain HSN, GST, minimum stock and valuation fields.",
            icon: ClipboardList,
          },
          {
            title: "Record movements",
            description: "Use stock movement for adjustments outside billing and production.",
            icon: Warehouse,
          },
          {
            title: "Review exceptions",
            description: "Filter low stock and inactive records before purchase planning.",
            icon: SearchCheck,
          },
        ].map((step) => {
          const Icon = step.icon;

          return (
            <div key={step.title} className="flex gap-3 rounded-lg border bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">{step.title}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

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
          onDelete={openDeleteConfirm}
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

      <InventoryBulkImportDialog
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
      />

      <InventoryConfirmDialog
        open={confirmOpen}
        title="Disable inventory item?"
        description={
          selectedItem
            ? `${selectedItem.name} will be marked inactive. This will not delete stock movement history.`
            : "This item will be marked inactive."
        }
        confirmLabel="Disable"
        loading={deleteState.isLoading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
