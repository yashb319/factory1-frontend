"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AppForm,
  FormActions,
  SelectField,
  TextField,
} from "@/components/forms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from "../api/productsApi";
import type { Product, ProductRequest } from "../types/product.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
};

type FormValues = {
  productCode: string;
  name: string;
  description: string;
  finishedGoodInventoryItemId: string;
  unit: string;
  active: string;
};

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = Boolean(product);

  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 200,
    itemType: "FINISHED_GOOD",
    status: "ACTIVE",
  });

  const inventoryItems = inventoryPage?.content ?? [];

  const finishedGoodOptions = inventoryItems
      .filter((item) => item.itemType === "FINISHED_GOOD")
      .map((item) => ({
        label: `${item.itemCode} - ${item.name} (${item.currentStock} ${item.unit})`,
        value: item.id,
      }));

  const form = useForm<FormValues>({
    defaultValues: {
      productCode: "",
      name: "",
      description: "",
      finishedGoodInventoryItemId: "",
      unit: "PCS",
      active: "true",
    },
  });

  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const selectedFinishedGoodId = form.watch("finishedGoodInventoryItemId");

  useEffect(() => {
    if (!open) return;

    form.reset({
      productCode: product?.productCode ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      finishedGoodInventoryItemId: product?.finishedGoodInventoryItemId ?? "",
      unit: product?.unit ?? "PCS",
      active: String(product?.active ?? true),
    });
  }, [open, product, form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const selectedItem = inventoryItems.find(
      (item) => item.id === selectedFinishedGoodId
    );

    if (!selectedItem) {
      return;
    }

    if (!form.getValues("name")) {
      form.setValue("name", selectedItem.name, { shouldDirty: true });
    }

    form.setValue("unit", selectedItem.unit || "PCS", { shouldDirty: true });
  }, [form, inventoryItems, open, selectedFinishedGoodId]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (!values.finishedGoodInventoryItemId) {
        toast.error("Please select a finished good inventory item");
        return;
      }

      const body: ProductRequest = {
        productCode: values.productCode,
        name: values.name,
        description: values.description,
        finishedGoodInventoryItemId: values.finishedGoodInventoryItemId,
        unit: values.unit,
        active: values.active === "true",
      };

      if (isEdit && product) {
        await updateProduct({ id: product.id, body }).unwrap();
        toast.success("Product updated successfully");
        onOpenChange(false);
        return;
      }

      await createProduct(body).unwrap();
      toast.success("Product created successfully");
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? "Failed to update product" : "Failed to create product");
    }
  };

  const isLoading = createState.isLoading || updateState.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <AppForm form={form} onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="productCode" label="Product Code" disabled={isEdit} required />

            <TextField name="name" label="Product Name" required />

            <div className="md:col-span-2">
              <TextField name="description" label="Description" />
            </div>

            <SelectField
              name="finishedGoodInventoryItemId"
              label="Finished Good Inventory Item"
              options={finishedGoodOptions}
              placeholder="Select finished good item"
              required
            />

            <SelectField
              name="unit"
              label="Unit"
              options={[
                { label: "PCS", value: "PCS" },
                { label: "KG", value: "KG" },
                { label: "Meter", value: "METER" },
                { label: "Box", value: "BOX" },
              ]}
              required
            />

            <SelectField
              name="active"
              label="Status"
              options={[
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ]}
            />
          </div>

          <FormActions
            submitLabel={isEdit ? "Update Product" : "Create Product"}
            cancelLabel="Cancel"
            onCancel={() => onOpenChange(false)}
            loading={isLoading}
          />
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}
