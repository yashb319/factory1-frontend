"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AppForm,
  FormActions,
  NumberField,
  SelectField,
  TextField,
} from "@/components/forms";
import { SupplierFormDialog } from "@/features/suppliers/components/SupplierFormDialog";
import { useGetActiveSuppliersQuery } from "@/features/suppliers/api/supplierApi";
import type {
  InventoryItem,
  InventoryItemRequest,
  InventoryItemUpdateRequest,
} from "../types/inventory.types";
import {
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
} from "../api/inventoryApi";
import { useLazyGetGstSuggestionsQuery } from "@/features/billing/api/billingApi";
import type { GstRateSuggestion } from "@/features/billing/types/billing.types";

type Props = {
  open: boolean;
  item?: InventoryItem | null;
  onClose: () => void;
};

type FormValues = {
  itemCode: string;
  name: string;
  category: string;
  itemType: string;
  unit: string;
  openingStock: number;
  minimumStock: number;
  purchasePrice?: number;
  sellingPrice?: number;
  hsnCode: string;
  gstRate?: number;
  supplierId: string;
  supplierName: string;
  status: string;
  notes: string;
};

export function InventoryFormDialog({ open, item, onClose }: Props) {
  const isEdit = Boolean(item);

  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [gstSuggestions, setGstSuggestions] = useState<GstRateSuggestion[]>([]);

  const { data: suppliers = [] } = useGetActiveSuppliersQuery();

  const form = useForm<FormValues>({
    defaultValues: {
      itemCode: "",
      name: "",
      category: "",
      itemType: "RAW_MATERIAL",
      unit: "pcs",
      openingStock: 0,
      minimumStock: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      hsnCode: "",
      gstRate: 18,
      supplierId: "",
      supplierName: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  const [createItem, createState] = useCreateInventoryItemMutation();
  const [updateItem, updateState] = useUpdateInventoryItemMutation();
  const [getGstSuggestions, gstSuggestionState] = useLazyGetGstSuggestionsQuery();
  const selectedSupplierId = form.watch("supplierId");
  const itemType = form.watch("itemType");
  const purchasePrice = form.watch("purchasePrice");
  const sellingPrice = form.watch("sellingPrice");
  const itemName = form.watch("name");
  const hsnCode = form.watch("hsnCode");

  useEffect(() => {
    if (!open) return;

    if (item) {
      setGstSuggestions([]);
      form.reset({
        itemCode: item.itemCode,
        name: item.name,
        category: item.category ?? "",
        itemType: item.itemType,
        unit: item.unit,
        openingStock: item.currentStock,
        minimumStock: item.minimumStock,
        purchasePrice: item.purchasePrice ?? 0,
        sellingPrice: item.sellingPrice ?? 0,
        hsnCode: item.hsnCode ?? "",
        gstRate: item.gstRate ?? 18,
        supplierId: item.supplierId ?? "",
        supplierName: item.supplierName ?? "",
        status: item.status,
        notes: item.notes ?? "",
      });
    } else {
      setGstSuggestions([]);
      form.reset({
        itemCode: "",
        name: "",
        category: "",
        itemType: "RAW_MATERIAL",
        unit: "pcs",
        openingStock: 0,
        minimumStock: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        hsnCode: "",
        gstRate: 18,
        supplierId: "",
        supplierName: "",
        status: "ACTIVE",
        notes: "",
      });
    }
  }, [open, item, form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const supplier = suppliers.find((entry) => entry.id === selectedSupplierId);
    form.setValue("supplierName", supplier?.name ?? "", { shouldDirty: true });
  }, [form, open, selectedSupplierId, suppliers]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (itemType === "FINISHED_GOOD" && !sellingPrice && purchasePrice) {
      form.setValue("sellingPrice", Number(purchasePrice), { shouldDirty: true });
    }
  }, [form, itemType, open, purchasePrice, sellingPrice]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && item) {
        const body: InventoryItemUpdateRequest = {
          name: values.name,
          category: values.category,
          itemType: values.itemType as InventoryItemUpdateRequest["itemType"],
          unit: values.unit,
          minimumStock: Number(values.minimumStock),
          purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : null,
          sellingPrice: values.sellingPrice ? Number(values.sellingPrice) : null,
          hsnCode: values.hsnCode?.trim().toUpperCase(),
          gstRate:
            values.gstRate === undefined || values.gstRate === null
              ? null
              : Number(values.gstRate),
          supplierId: values.supplierId || null,
          supplierName:
            suppliers.find((supplier) => supplier.id === values.supplierId)?.name
            ?? values.supplierName,
          status: values.status as InventoryItemUpdateRequest["status"],
          notes: values.notes,
        };

        await updateItem({
          id: item.id,
          body,
        }).unwrap();

        toast.success("Inventory item updated successfully");
        onClose();
        return;
      }

      const body: InventoryItemRequest = {
        itemCode: values.itemCode,
        name: values.name,
        category: values.category,
        itemType: values.itemType as InventoryItemRequest["itemType"],
        unit: values.unit,
        openingStock: Number(values.openingStock),
        minimumStock: Number(values.minimumStock),
        purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : null,
        sellingPrice: values.sellingPrice ? Number(values.sellingPrice) : null,
        hsnCode: values.hsnCode?.trim().toUpperCase(),
        gstRate:
          values.gstRate === undefined || values.gstRate === null
            ? null
            : Number(values.gstRate),
        supplierId: values.supplierId || null,
        supplierName:
          suppliers.find((supplier) => supplier.id === values.supplierId)?.name
          ?? values.supplierName,
        notes: values.notes,
      };

      await createItem(body).unwrap();

      toast.success("Inventory item created successfully");
      onClose();
    } catch {
      toast.error(
        isEdit
          ? "Failed to update inventory item"
          : "Failed to create inventory item"
      );
    }
  };

  const lookupGst = async () => {
    const query = hsnCode || itemName;

    if (!query.trim()) {
      toast.error("Enter item name or HSN first");
      return;
    }

    try {
      const suggestions = await getGstSuggestions(query).unwrap();
      setGstSuggestions(suggestions);

      if (!suggestions.length) {
        toast.info("No GST suggestion found. Please verify manually.");
      }
    } catch {
      toast.error("Could not fetch GST suggestion");
    }
  };

  const applyGstSuggestion = (suggestion: GstRateSuggestion) => {
    form.setValue("hsnCode", suggestion.hsnCode, { shouldDirty: true });
    form.setValue("gstRate", Number(suggestion.igstRate ?? 0), {
      shouldDirty: true,
    });
    setGstSuggestions([]);
  };

  const isLoading = createState.isLoading || updateState.isLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>

          <AppForm form={form} onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                name="itemCode"
                label="Item Code"
                disabled={isEdit}
                required
              />

              <TextField name="name" label="Item Name" required />

              <TextField name="category" label="Category" />

              <SelectField
                name="itemType"
                label="Item Type"
                options={[
                  { label: "Raw Material", value: "RAW_MATERIAL" },
                  { label: "Finished Good", value: "FINISHED_GOOD" },
                  { label: "Packaging", value: "PACKAGING" },
                  { label: "Consumable", value: "CONSUMABLE" },
                  { label: "Semi Finished", value: "SEMI_FINISHED" },
                  { label: "Other", value: "OTHER" },
                ]}
                required
              />

              <TextField name="unit" label="Unit" required />

              {!isEdit && (
                <NumberField
                  name="openingStock"
                  label="Opening Stock"
                  required
                />
              )}

              <NumberField name="minimumStock" label="Minimum Stock" required />

              <NumberField name="purchasePrice" label="Purchase / Cost Price" />

              <NumberField name="sellingPrice" label="Selling Price" />

              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField
                      name="hsnCode"
                      label="HSN / SAC"
                      placeholder="Optional"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={gstSuggestionState.isFetching}
                    onClick={lookupGst}
                    aria-label="Find GST suggestion"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {gstSuggestions.length > 0 ? (
                  <div className="space-y-1">
                    {gstSuggestions.slice(0, 3).map((suggestion) => (
                      <button
                        key={`${suggestion.hsnCode}-${suggestion.description}`}
                        type="button"
                        onClick={() => applyGstSuggestion(suggestion)}
                        className="block w-full rounded-md border bg-slate-50 px-2 py-1 text-left text-xs hover:bg-slate-100"
                      >
                        <span className="block font-medium">
                          {suggestion.hsnCode || "HSN/SAC"} - {suggestion.igstRate}% GST
                        </span>
                        <span className="mt-0.5 block truncate text-muted-foreground">
                          {suggestion.source?.toLowerCase().includes("ai")
                            ? "AI suggestion, editable"
                            : "Official/common suggestion, editable"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <NumberField
                name="gstRate"
                label="GST %"
                min={0}
                max={28}
              />

              <div className="space-y-2">
                <SelectField
                  name="supplierId"
                  label="Supplier"
                  options={[
                    { label: "No Supplier", value: "" },
                    ...suppliers.map((supplier) => ({
                      label: `${supplier.name} (${supplier.supplierCode})`,
                      value: supplier.id,
                    })),
                  ]}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSupplierDialogOpen(true)}
                >
                  + New Supplier
                </Button>
              </div>

              {isEdit && (
                <SelectField
                  name="status"
                  label="Status"
                  options={[
                    { label: "Active", value: "ACTIVE" },
                    { label: "Inactive", value: "INACTIVE" },
                  ]}
                />
              )}

              <div className="md:col-span-2">
                <TextField name="notes" label="Notes" />
              </div>
            </div>

            <FormActions
              submitLabel={isEdit ? "Update Item" : "Create Item"}
              cancelLabel="Cancel"
              onCancel={onClose}
              loading={isLoading}
            />
          </AppForm>
        </DialogContent>
      </Dialog>

      <SupplierFormDialog
        open={supplierDialogOpen}
        supplier={null}
        onClose={() => setSupplierDialogOpen(false)}
      />
    </>
  );
}
