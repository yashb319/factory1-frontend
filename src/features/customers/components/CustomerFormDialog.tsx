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
import { stateNameFromGstNumber } from "@/lib/gstState";
import { LocationSuggestionHint } from "@/components/forms/LocationSuggestionHint";
import {
  getBestLocationSuggestion,
  getLocationSuggestions,
  type LocationSuggestion,
} from "@/lib/locationSuggestions";

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
      pincode: "",
      country: "India",
      contactPerson: "",
      paymentTerms: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  const [createCustomer, createState] = useCreateCustomerMutation();
  const [updateCustomer, updateState] = useUpdateCustomerMutation();
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
      customerCode: customer?.customerCode ?? "",
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      gstNumber: customer?.gstNumber ?? "",
      billingAddress: customer?.billingAddress ?? "",
      shippingAddress: customer?.shippingAddress ?? "",
      city: customer?.city ?? "",
      state: customer?.state ?? "",
      pincode: customer?.pincode ?? "",
      country: customer?.country ?? "India",
      contactPerson: customer?.contactPerson ?? "",
      paymentTerms: customer?.paymentTerms ?? "",
      status: customer?.status ?? "ACTIVE",
      notes: customer?.notes ?? "",
    });
  }, [open, customer, form]);

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
      if (isEdit && customer) {
        await updateCustomer({
          id: customer.id,
          body: payload,
        }).unwrap();

        toast.success("Customer updated successfully");
        onClose();
        return;
      }

      await createCustomer(payload).unwrap();

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
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl overflow-y-auto">
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
