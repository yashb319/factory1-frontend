"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppForm, FormActions, SelectField, TextField } from "@/components/forms";
import {
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
} from "../api/supplierApi";
import type { Supplier, SupplierRequest } from "../types/supplier.types";
import { stateNameFromGstNumber } from "@/lib/gstState";

type Props = {
  open: boolean;
  supplier?: Supplier | null;
  onClose: () => void;
};

type FormValues = SupplierRequest;

export function SupplierFormDialog({ open, supplier, onClose }: Props) {
  const isEdit = Boolean(supplier);

  const form = useForm<FormValues>({
    defaultValues: {
      supplierCode: "",
      name: "",
      phone: "",
      email: "",
      gstNumber: "",
      address: "",
      city: "",
      state: "",
      contactPerson: "",
      paymentTerms: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  const [createSupplier, createState] = useCreateSupplierMutation();
  const [updateSupplier, updateState] = useUpdateSupplierMutation();
  const gstNumber = form.watch("gstNumber");

  useEffect(() => {
    if (!open) return;

    form.reset({
      supplierCode: supplier?.supplierCode ?? "",
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      gstNumber: supplier?.gstNumber ?? "",
      address: supplier?.address ?? "",
      city: supplier?.city ?? "",
      state: supplier?.state ?? "",
      contactPerson: supplier?.contactPerson ?? "",
      paymentTerms: supplier?.paymentTerms ?? "",
      status: supplier?.status ?? "ACTIVE",
      notes: supplier?.notes ?? "",
    });
  }, [open, supplier, form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const state = stateNameFromGstNumber(gstNumber);
    if (state && !form.getValues("state")) {
      form.setValue("state", state, { shouldDirty: true });
    }
  }, [form, gstNumber, open]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      gstNumber: values.gstNumber?.trim().toUpperCase(),
      state: values.state || stateNameFromGstNumber(values.gstNumber),
    };

    try {
      if (isEdit && supplier) {
        await updateSupplier({
          id: supplier.id,
          body: payload,
        }).unwrap();

        toast.success("Supplier updated successfully");
        onClose();
        return;
      }

      await createSupplier(payload).unwrap();

      toast.success("Supplier created successfully");
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to update supplier" : "Failed to create supplier");
    }
  };

  const loading = createState.isLoading || updateState.isLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>

        <AppForm form={form} onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="supplierCode" label="Supplier Code" disabled={isEdit} required />
            <TextField name="name" label="Supplier Name" required />
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
              <TextField name="address" label="Address" />
            </div>

            <div className="md:col-span-2">
              <TextField name="notes" label="Notes" />
            </div>
          </div>

          <FormActions
            submitLabel={isEdit ? "Update Supplier" : "Create Supplier"}
            cancelLabel="Cancel"
            onCancel={onClose}
            loading={loading}
          />
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}
