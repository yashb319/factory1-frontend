"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useDeleteSupplierMutation,
  useGetSupplierDashboardQuery,
  useGetSuppliersQuery,
} from "../api/supplierApi";
import type { Supplier, SupplierSearchParams } from "../types/supplier.types";
import { exportSuppliersCsv } from "../utils/supplierExport";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { SupplierBulkImportDialog } from "./SupplierBulkImportDialog";
import { SupplierConfirmDialog } from "./SupplierConfirmDialog";
import { SupplierDashboardCards } from "./SupplierDashboardCards";
import { SupplierFilters } from "./SupplierFilters";
import { SupplierFormDialog } from "./SupplierFormDialog";
import { SupplierTable } from "./SupplierTable";
import { useRuntimePermissions } from "@/features/partner-saas/runtime/permissions";
export function SupplierPage() {
  const { contextual, can } = useRuntimePermissions();
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

  const { data, isLoading, error } = useGetSuppliersQuery(filters);
  const { data: dashboard, isLoading: dashboardLoading, isError: dashboardError } =
    useGetSupplierDashboardQuery(undefined, { skip: !can("GET", "/api/suppliers/dashboard") });
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
      const exported = exportSuppliersCsv(suppliers);
      void logDataJob({
        operation: "EXPORT",
        module: "SUPPLIER",
        fileName: exported.fileName,
        status: "COMPLETED",
        progress: 100,
        totalRows: suppliers.length,
        successRows: suppliers.length,
        failedRows: 0,
        outputFileUrl: exported.outputFileUrl,
      });
      toast.success("Supplier CSV exported successfully");
    } catch {
      toast.error("Failed to export suppliers");
    }
  };

  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">Suppliers</h1>
          <p className="text-xs text-slate-500">
            Manage vendor records for inventory purchases and future billing flows.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={contextual || suppliers.length === 0}
          >
            Export CSV
          </Button>

          <Button variant="outline" disabled={contextual} onClick={() => setBulkOpen(true)}>
            Import CSV
          </Button>

          <Button disabled={!can("POST", "/api/suppliers")} onClick={openCreate}>Add Supplier</Button>
        </div>
      </div>

      {contextual && dashboardError ? <p role="alert">Supplier summary could not be loaded.</p> :
        can("GET", "/api/suppliers/dashboard") ? <SupplierDashboardCards data={dashboard} isLoading={dashboardLoading} /> : null}

      <SupplierFilters filters={filters} onChange={setFilters} />
      {error ? <p role="alert">Suppliers could not be loaded. Refresh and verify your access.</p> : null}

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

      {!contextual ? <SupplierBulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      /> : null}

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
