"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  AppForm,
  FormActions,
  NumberField,
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
import { useRecordProductionMutation } from "../api/productsApi";
import type { Product, ProductionRequest } from "../types/product.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  products: Product[];
};

type FormValues = {
  productId: string;
  finishedGoodInventoryItemId: string;
  quantityProduced: number;
  productionDate: string;
  notes: string;
};

export function ProductionDialog({
  open,
  onOpenChange,
  product,
  products,
}: Props) {
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
  });

  const inventoryItems = inventoryPage?.content ?? [];

  const finishedGoodOptions = [
    { label: "Use product linked finished good item", value: "" },
    ...inventoryItems
      .filter((item) => item.itemType === "FINISHED_GOOD")
      .map((item) => ({
        label: `${item.itemCode} - ${item.name} (${item.currentStock} ${item.unit})`,
        value: item.id,
      })),
  ];

  const form = useForm<FormValues>({
    defaultValues: {
      productId: "",
      finishedGoodInventoryItemId: "",
      quantityProduced: 1,
      productionDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const selectedProductId = useWatch({
    control: form.control,
    name: "productId",
  });

  const selectedProduct = products.find((item) => item.id === selectedProductId);
  const linkedFinishedGoodItem = inventoryItems.find(
    (item) => item.id === selectedProduct?.finishedGoodInventoryItemId
  );

  const [recordProduction, recordState] = useRecordProductionMutation();

  useEffect(() => {
    if (!open) return;

    form.reset({
      productId: product?.id ?? "",
      finishedGoodInventoryItemId: "",
      quantityProduced: 1,
      productionDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  }, [open, product, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const body: ProductionRequest = {
        productId: values.productId,
        finishedGoodInventoryItemId:
          values.finishedGoodInventoryItemId || undefined,
        quantityProduced: Number(values.quantityProduced),
        productionDate: values.productionDate,
        notes: values.notes,
      };

      await recordProduction(body).unwrap();

      toast.success("Production recorded successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to record production. Check raw material stock.");
    }
  };

  const productOptions = products.map((item) => ({
    label: `${item.productCode} - ${item.name} ${
      item.hasBom ? "(BOM)" : "(Simple)"
    }`,
    value: item.id,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Production</DialogTitle>
        </DialogHeader>

        <AppForm form={form} onSubmit={onSubmit}>
          <div className="grid gap-4">
            <SelectField
              name="productId"
              label="Product"
              options={productOptions}
              required
            />

            {selectedProduct?.finishedGoodInventoryItemId && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                Linked finished good item:{" "}
                <span className="font-medium">
                  {linkedFinishedGoodItem
                    ? `${linkedFinishedGoodItem.itemCode} - ${linkedFinishedGoodItem.name}`
                    : selectedProduct.finishedGoodInventoryItemId}
                </span>
              </div>
            )}

            <SelectField
              name="finishedGoodInventoryItemId"
              label="Finished Good Inventory Item"
              options={finishedGoodOptions}
            />

            <NumberField
              name="quantityProduced"
              label="Quantity Produced"
              required
            />

            <TextField
              name="productionDate"
              label="Production Date"
              type="date"
              required
            />

            <TextField name="notes" label="Notes" />
          </div>

          <FormActions
            submitLabel="Record Production"
            cancelLabel="Cancel"
            onCancel={() => onOpenChange(false)}
            loading={recordState.isLoading}
          />
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}