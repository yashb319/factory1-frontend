"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppForm, CheckboxField, FormActions, SelectField, TextField } from "@/components/forms";
import {
  useCreateVendorMutation,
  useUpdateVendorMutation,
} from "../api/vendorApi";
import type { Vendor, VendorRequest } from "../types/vendor.types";

type Props = {
  open: boolean;
  vendor?: Vendor | null;
  onClose: () => void;
};

type FormValues = VendorRequest;

const SERVICE_TYPE_OPTIONS = [
  { label: "Outsourced Manufacturing", value: "OUTSOURCED_MANUFACTURING" },
  { label: "Quality Inspection", value: "QUALITY_INSPECTION" },
  { label: "Logistics", value: "LOGISTICS" },
  { label: "Packaging", value: "PACKAGING" },
  { label: "Other", value: "OTHER" },
];

export function VendorFormDialog({ open, vendor, onClose }: Props) {
  const isEdit = Boolean(vendor);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      serviceType: "OUTSOURCED_MANUFACTURING",
      active: true,
    },
  });

  const [createVendor, createState] = useCreateVendorMutation();
  const [updateVendor, updateState] = useUpdateVendorMutation();

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: vendor?.name ?? "",
      contactEmail: vendor?.contactEmail ?? "",
      contactPhone: vendor?.contactPhone ?? "",
      serviceType: vendor?.serviceType ?? "OUTSOURCED_MANUFACTURING",
      active: vendor?.active ?? true,
    });
  }, [open, vendor, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && vendor) {
        await updateVendor({
          id: vendor.id,
          body: values,
        }).unwrap();

        toast.success("Vendor updated successfully");
        onClose();
        return;
      }

      await createVendor(values).unwrap();

      toast.success("Vendor created successfully");
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to update vendor" : "Failed to create vendor");
    }
  };

  const loading = createState.isLoading || updateState.isLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>

        <AppForm form={form} onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="name" label="Vendor Name" required />
            <SelectField
              name="serviceType"
              label="Service Type"
              options={SERVICE_TYPE_OPTIONS}
            />
            <TextField name="contactEmail" label="Contact Email" />
            <TextField name="contactPhone" label="Contact Phone" />

            <div className="md:col-span-2">
              <CheckboxField name="active" label="Active" />
            </div>
          </div>

          <FormActions
            submitLabel={isEdit ? "Update Vendor" : "Create Vendor"}
            cancelLabel="Cancel"
            onCancel={onClose}
            loading={loading}
          />
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}
