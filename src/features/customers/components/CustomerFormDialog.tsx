"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AppForm,
  FormActions,
  SelectField,
  TextField,
} from "@/components/forms";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "../api/customerApi";
import type { Customer, CustomerRequest } from "../types/customer.types";

type Props = {
  open: boolean;
  customer?: Customer | null;
  onClose: () => void;
};

type FormValues = CustomerRequest;

export function CustomerFormDialog({ open, customer, onClose }: Props) {
  const isEdit = Boolean(customer);

  const form = useForm<FormValues>({
    defaultValues: {
      customerCode: "",
      name: "",
      phone: "",
      email: "",
      gstNumber: "",
      billingAddress: "",
      shippingAddress: "",
      city: "",
      state: "",
      contactPerson: "",
      paymentTerms: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  const [createCustomer, createState] = useCreateCustomerMutation();
  const [updateCustomer, updateState] = useUpdateCustomerMutation();

  useEffect(() => {
    if (!open) return;

    form.reset({
      customerCode: customer?.customerCode ?? "",
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      gstNumber: customer?.gstNumber ?? "",
      billingAddress: customer?.billingAddress ?? "",
      shippingAddress: customer?.shippingAddress ?? "",
      city: customer?.city ?? "",
      state: customer?.state ?? "",
      contactPerson: customer?.contactPerson ?? "",
      paymentTerms: customer?.paymentTerms ?? "",
      status: customer?.status ?? "ACTIVE",
      notes: customer?.notes ?? "",
    });
  }, [open, customer, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && customer) {
        await updateCustomer({
          id: customer.id,
          body: values,
        }).unwrap();

        toast.success("Customer updated successfully");
        onClose();
        return;
      }

      await createCustomer(values).unwrap();

      toast.success("Customer created successfully");
      onClose();
    } catch {
      toast.error(
        isEdit ? "Failed to update customer" : "Failed to create customer"
      );
    }
  };

  const loading = createState.isLoading || updateState.isLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>

        <AppForm form={form} onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              name="customerCode"
              label="Customer Code"
              disabled={isEdit}
              required
            />

            <TextField name="name" label="Customer Name" required />

            <TextField name="phone" label="Phone" />

            <TextField name="email" label="Email" />

            <TextField name="gstNumber" label="GST Number" />

            <TextField name="contactPerson" label="Contact Person" />

            <TextField name="city" label="City" />

            <TextField name="state" label="State" />

            <TextField name="paymentTerms" label="Payment Terms" />

            <SelectField
              name="status"
              label="Status"
              options={[
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ]}
            />

            <div className="md:col-span-2">
              <TextField name="billingAddress" label="Billing Address" />
            </div>

            <div className="md:col-span-2">
              <TextField name="shippingAddress" label="Shipping Address" />
            </div>

            <div className="md:col-span-2">
              <TextField name="notes" label="Notes" />
            </div>
          </div>

          <FormActions
            submitLabel={isEdit ? "Update Customer" : "Create Customer"}
            cancelLabel="Cancel"
            onCancel={onClose}
            loading={loading}
          />
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}