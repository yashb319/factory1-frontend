"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useDeleteCustomerMutation,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "../api/customerApi";
import { TallyMasterList } from "@/components/layout/TallyMasterList";
import type { CustomerRequest } from "../types/customer.types";

export function CustomerTallyView({
  initialScreen = "list",
}: {
  initialScreen?: "list" | "create" | "alter";
}) {
  const router = useRouter();
  const { data, isLoading } = useGetCustomersQuery({
    page: 0,
    size: 300,
    sortBy: "name",
    sortDirection: "ASC",
  });

  const [deleteCustomer] = useDeleteCustomerMutation();
  const [createCustomer, createCustomerState] = useCreateCustomerMutation();
  const [updateCustomer, updateCustomerState] = useUpdateCustomerMutation();

  const customers = useMemo(() => data?.content ?? [], [data]);

  return (
    <TallyMasterList
      title="Customers"
      initialScreen={initialScreen}
      subtitle="Manage customer records for billing, GST invoices and receivables."
      items={customers}
      columns={[
        { key: "customerCode", label: "Code" },
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
        { key: "billingAddress", label: "Billing Address", type: "textarea" },
        { key: "shippingAddress", label: "Shipping Address", type: "textarea" },
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
      onCreateItem={(data) => createCustomer(data as CustomerRequest).unwrap()}
      onUpdateItem={(id, data) => updateCustomer({ id, body: data as CustomerRequest }).unwrap()}
      onDeleteItem={(id) => deleteCustomer(id).unwrap()}
      isCreating={createCustomerState.isLoading}
      isUpdating={updateCustomerState.isLoading}
      onBack={() => router.push("/gateway?menu=customers")}
    />
  );
}
