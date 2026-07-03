"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useDeleteSupplierMutation,
  useGetSupplierDashboardQuery,
  useGetSupplierInsightsQuery,
  useGetSuppliersQuery,
} from "../api/supplierApi";
import type { Supplier, SupplierSearchParams } from "../types/supplier.types";
import { exportSuppliersCsv } from "../utils/supplierExport";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { SupplierAiInsights } from "./SupplierAiInsights";
import { SupplierBulkImportDialog } from "./SupplierBulkImportDialog";
import { SupplierConfirmDialog } from "./SupplierConfirmDialog";
import { SupplierDashboardCards } from "./SupplierDashboardCards";
import { SupplierFilters } from "./SupplierFilters";
import { SupplierFormDialog } from "./SupplierFormDialog";
import { SupplierTable } from "./SupplierTable";

export function SupplierPage() {
  const [filters, setFilters] = useState<SupplierSearchParams>({
    page: 0,
    size: 10,
    sortBy: "createdAt",
    sortDirection: "DESC",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const { data, isLoading } = useGetSuppliersQuery(filters);
  const { data: dashboard, isLoading: dashboardLoading } =
    useGetSupplierDashboardQuery();
  const { data: insights, isLoading: insightsLoading } =
    useGetSupplierInsightsQuery();

  const [deleteSupplier, deleteState] = useDeleteSupplierMutation();
  const logDataJob = useLogDataJob();

  const suppliers = useMemo(() => data?.content ?? [], [data]);

  const openCreate = () => {
    setSelectedSupplier(null);
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormOpen(true);
  };

  const openDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      await deleteSupplier(selectedSupplier.id).unwrap();
      toast.success("Supplier disabled successfully");
      setConfirmOpen(false);
      setSelectedSupplier(null);
    } catch {
      toast.error("Failed to disable supplier");
    }
  };

  const handleExport = () => {
    try {
      exportSuppliersCsv(suppliers);
      void logDataJob({
        operation: "EXPORT",
        module: "SUPPLIER",
        fileName: `suppliers-${new Date().toISOString().slice(0, 10)}.csv`,
        status: "COMPLETED",
        progress: 100,
        totalRows: suppliers.length,
        successRows: suppliers.length,
        failedRows: 0,
      });
      toast.success("Supplier CSV exported successfully");
    } catch {
      toast.error("Failed to export suppliers");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor records for inventory purchases and future billing flows.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={suppliers.length === 0}
          >
            Export CSV
          </Button>

          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            Import CSV
          </Button>

          <Button onClick={openCreate}>Add Supplier</Button>
        </div>
      </div>

      <SupplierDashboardCards data={dashboard} isLoading={dashboardLoading} />

      <SupplierAiInsights insights={insights} isLoading={insightsLoading} />

      <SupplierFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Loading suppliers...
        </div>
      ) : (
        <SupplierTable
          suppliers={suppliers}
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      )}

      <SupplierFormDialog
        open={formOpen}
        supplier={selectedSupplier}
        onClose={() => setFormOpen(false)}
      />

      <SupplierBulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />

      <SupplierConfirmDialog
        open={confirmOpen}
        title="Disable supplier?"
        description={
          selectedSupplier
            ? `${selectedSupplier.name} will be marked inactive. Existing records will remain safe.`
            : "This supplier will be marked inactive."
        }
        loading={deleteState.isLoading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
