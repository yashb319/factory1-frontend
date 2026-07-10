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
import { LocationSuggestionHint } from "@/components/forms/LocationSuggestionHint";
import {
  getBestLocationSuggestion,
  getLocationSuggestions,
  type LocationSuggestion,
} from "@/lib/locationSuggestions";

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
      pincode: "",
      country: "India",
      contactPerson: "",
      paymentTerms: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  const [createSupplier, createState] = useCreateSupplierMutation();
  const [updateSupplier, updateState] = useUpdateSupplierMutation();
  const gstNumber = form.watch("gstNumber");
  const city = form.watch("city");
  const locationSuggestions = getLocationSuggestions(city);

  const applyLocationSuggestion = (suggestion: LocationSuggestion) => {
    form.setValue("city", suggestion.city, { shouldDirty: true });
    form.setValue("state", suggestion.state, { shouldDirty: true });
    form.setValue("pincode", suggestion.pincode, { shouldDirty: true });
    form.setValue("country", suggestion.country, { shouldDirty: true });
  };

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
      pincode: supplier?.pincode ?? "",
      country: supplier?.country ?? "India",
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const suggestion = getBestLocationSuggestion(city);
    if (!suggestion) {
      return;
    }

    if (!form.getValues("state")) {
      form.setValue("state", suggestion.state, { shouldDirty: true });
    }

    if (!form.getValues("pincode")) {
      form.setValue("pincode", suggestion.pincode, { shouldDirty: true });
    }

    if (!form.getValues("country")) {
      form.setValue("country", suggestion.country, { shouldDirty: true });
    }
  }, [city, form, open]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      gstNumber: values.gstNumber?.trim().toUpperCase(),
      state: values.state || stateNameFromGstNumber(values.gstNumber),
      country: values.country || "India",
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
            <div>
              <TextField name="city" label="City" />
              <LocationSuggestionHint
                suggestions={locationSuggestions}
                onApply={applyLocationSuggestion}
              />
            </div>
            <TextField name="state" label="State" />
            <TextField name="pincode" label="Pincode" />
            <TextField name="country" label="Country" />
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
