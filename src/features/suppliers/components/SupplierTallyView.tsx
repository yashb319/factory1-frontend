"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useDeleteSupplierMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
} from "../api/supplierApi";
import { TallyMasterList } from "@/components/layout/TallyMasterList";
import type { SupplierRequest } from "../types/supplier.types";

export function SupplierTallyView({
  initialScreen = "list",
}: {
  initialScreen?: "list" | "create" | "alter";
}) {
  const router = useRouter();
  const { data, isLoading } = useGetSuppliersQuery({
    page: 0,
    size: 300,
    sortBy: "name",
    sortDirection: "ASC",
  });

  const [deleteSupplier] = useDeleteSupplierMutation();
  const [createSupplier, createSupplierState] = useCreateSupplierMutation();
  const [updateSupplier, updateSupplierState] = useUpdateSupplierMutation();

  const suppliers = useMemo(() => data?.content ?? [], [data]);

  return (
    <TallyMasterList
      title="Suppliers"
      initialScreen={initialScreen}
      subtitle="Manage vendor records for inventory purchases and future billing flows."
      items={suppliers}
      columns={[
        { key: "supplierCode", label: "Code" },
        { key: "name", label: "Name" },
        { key: "contactPerson", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true, autoFocus: true },
        { key: "phone", label: "Phone", type: "text" },
        { key: "email", label: "Email", type: "email" },
        { key: "contactPerson", label: "Contact Person", type: "text" },
        { key: "gstNumber", label: "GST Number", type: "text" },
        { key: "address", label: "Address", type: "textarea" },
        { key: "city", label: "City", type: "text" },
        { key: "state", label: "State", type: "text" },
        { key: "pincode", label: "Pincode", type: "text" },
        { key: "country", label: "Country", type: "text" },
        { key: "paymentTerms", label: "Payment Terms", type: "text" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ],
        },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      isFetching={isLoading}
      onSelectItem={() => {}}
      onCreateItem={(data) => createSupplier(data as SupplierRequest).unwrap()}
      onUpdateItem={(id, data) => updateSupplier({ id, body: data as SupplierRequest }).unwrap()}
      onDeleteItem={(id) => deleteSupplier(id).unwrap()}
      isCreating={createSupplierState.isLoading}
      isUpdating={updateSupplierState.isLoading}
      onBack={() => router.push("/gateway?menu=suppliers")}
    />
  );
}
