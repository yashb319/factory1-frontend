"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useDeleteCustomerMutation,
  useGetCustomerDashboardQuery,
  useGetCustomersQuery,
} from "../api/customerApi";
import type {
  Customer,
  CustomerSearchParams,
} from "../types/customer.types";
import { exportCustomersCsv } from "../utils/customerExport";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { CustomerBulkImportDialog } from "./CustomerBulkImportDialog";
import { CustomerConfirmDialog } from "./CustomerConfirmDialog";
import { CustomerDashboardCards } from "./CustomerDashboardCards";
import { CustomerFilters } from "./CustomerFilters";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CustomerTable } from "./CustomerTable";

export function CustomerPage() {
  const [filters, setFilters] = useState<CustomerSearchParams>({
    page: 0,
    size: 10,
    sortBy: "createdAt",
    sortDirection: "DESC",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const { data, isLoading } = useGetCustomersQuery(filters);

  const { data: dashboard, isLoading: dashboardLoading } =
    useGetCustomerDashboardQuery();

  const [deleteCustomer, deleteState] = useDeleteCustomerMutation();
  const logDataJob = useLogDataJob();

  const customers = useMemo(() => data?.content ?? [], [data]);

  const openCreate = () => {
    setSelectedCustomer(null);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };

  const openDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    try {
      await deleteCustomer(selectedCustomer.id).unwrap();

      toast.success("Customer disabled successfully");
      setConfirmOpen(false);
      setSelectedCustomer(null);
    } catch {
      toast.error("Failed to disable customer");
    }
  };

  const handleExport = () => {
    try {
      const exported = exportCustomersCsv(customers);
      void logDataJob({
        operation: "EXPORT",
        module: "CUSTOMER",
        fileName: exported.fileName,
        status: "COMPLETED",
        progress: 100,
        totalRows: customers.length,
        successRows: customers.length,
        failedRows: 0,
        outputFileUrl: exported.outputFileUrl,
      });
      toast.success("Customer CSV exported successfully");
    } catch {
      toast.error("Failed to export customers");
    }
  };

  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">Customers</h1>
          <p className="text-xs text-slate-500">
            Manage customer records for billing, GST invoices and receivables.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={customers.length === 0}
          >
            Export CSV
          </Button>

          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            Import CSV
          </Button>

          <Button onClick={openCreate}>Add Customer</Button>
        </div>
      </div>

      <CustomerDashboardCards
        data={dashboard}
        isLoading={dashboardLoading}
      />

      <CustomerFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Loading customers...
        </div>
      ) : (
        <CustomerTable
          customers={customers}
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          onPageChange={(page) =>
            setFilters((prev) => ({
              ...prev,
              page,
            }))
          }
          onEdit={openEdit}
          onDelete={openDelete}
        />
      )}

      <CustomerFormDialog
        open={formOpen}
        customer={selectedCustomer}
        onClose={() => setFormOpen(false)}
      />

      <CustomerBulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />

      <CustomerConfirmDialog
        open={confirmOpen}
        title="Disable customer?"
        description={
          selectedCustomer
            ? `${selectedCustomer.name} will be marked inactive. Existing records will remain safe.`
            : "This customer will be marked inactive."
        }
        loading={deleteState.isLoading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
