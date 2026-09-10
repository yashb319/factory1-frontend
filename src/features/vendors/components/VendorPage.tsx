"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useDeleteVendorMutation,
  useGetVendorDashboardQuery,
  useGetVendorsQuery,
} from "../api/vendorApi";
import type { Vendor, VendorSearchParams } from "../types/vendor.types";
import { VendorConfirmDialog } from "./VendorConfirmDialog";
import { VendorDashboardCards } from "./VendorDashboardCards";
import { VendorFilters } from "./VendorFilters";
import { VendorFormDialog } from "./VendorFormDialog";
import { VendorTable } from "./VendorTable";

export function VendorPage() {
  const [filters, setFilters] = useState<VendorSearchParams>({
    page: 0,
    size: 10,
    sortBy: "name",
    sortDirection: "ASC",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const { data, isLoading } = useGetVendorsQuery(filters);
  const { data: dashboard, isLoading: dashboardLoading } = useGetVendorDashboardQuery();
  const [deleteVendor, deleteState] = useDeleteVendorMutation();

  const vendors = useMemo(() => data?.content ?? [], [data]);

  const openCreate = () => {
    setSelectedVendor(null);
    setFormOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormOpen(true);
  };

  const openDelete = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedVendor) return;

    try {
      await deleteVendor(selectedVendor.id).unwrap();
      toast.success("Vendor disabled successfully");
      setConfirmOpen(false);
      setSelectedVendor(null);
    } catch {
      toast.error("Failed to disable vendor");
    }
  };

  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">Vendors</h1>
          <p className="text-xs text-slate-500">
            Manage third-party vendors used to outsource production steps.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}>Add Vendor</Button>
        </div>
      </div>

      <VendorDashboardCards data={dashboard} isLoading={dashboardLoading} />

      <VendorFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Loading vendors...
        </div>
      ) : (
        <VendorTable
          vendors={vendors}
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      )}

      <VendorFormDialog open={formOpen} vendor={selectedVendor} onClose={() => setFormOpen(false)} />

      <VendorConfirmDialog
        open={confirmOpen}
        title="Disable vendor?"
        description={
          selectedVendor
            ? `${selectedVendor.name} will be marked inactive and won't be selectable for new assignments.`
            : "This vendor will be marked inactive."
        }
        loading={deleteState.isLoading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
