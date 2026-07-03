"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import {
  useGetBomQuery,
  useSaveBomMutation,
} from "../api/productsApi";
import type { BomComponent, Product } from "../types/product.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
};

export function BomDialog({ open, onOpenChange, product }: Props) {
  const { data: bom } = useGetBomQuery(product?.id || "", {
    skip: !product?.id || !open,
  });

  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
  });

  const inventoryItems = inventoryPage?.content ?? [];

  const componentOptions = inventoryItems.filter((item) =>
    ["RAW_MATERIAL", "PACKAGING", "SEMI_FINISHED", "CONSUMABLE", "OTHER"].includes(
      item.itemType
    )
  );

  const [saveBom, saveState] = useSaveBomMutation();

  const [name, setName] = useState("Default BOM");
  const [components, setComponents] = useState<BomComponent[]>([]);

  useEffect(() => {
    if (!open) return;

    const nextName = bom?.name ?? "Default BOM";
    const nextComponents = bom?.components ?? [];

    queueMicrotask(() => {
      setName(nextName);
      setComponents(nextComponents);
    });
  }, [bom, open, product?.id]);

  const addComponent = () => {
    setComponents((prev) => [
      ...prev,
      {
        inventoryItemId: "",
        quantityRequired: 1,
        unit: "PCS",
      },
    ]);
  };

  const updateComponent = (
    index: number,
    field: keyof BomComponent,
    value: string | number
  ) => {
    setComponents((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleItemChange = (index: number, inventoryItemId: string) => {
    const selectedItem = inventoryItems.find((item) => item.id === inventoryItemId);

    setComponents((prev) =>
      prev.map((component, i) =>
        i === index
          ? {
              ...component,
              inventoryItemId,
              unit: selectedItem?.unit ?? component.unit,
            }
          : component
      )
    );
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!product) return;

    const invalid = components.some(
      (component) => !component.inventoryItemId || Number(component.quantityRequired) <= 0
    );

    if (invalid) {
      toast.error("Please select item and quantity for all BOM components");
      return;
    }

    try {
      await saveBom({
        productId: product.id,
        body: {
          name,
          active: true,
          components: components.map((component) => ({
            inventoryItemId: component.inventoryItemId,
            quantityRequired: Number(component.quantityRequired),
            unit: component.unit,
          })),
        },
      }).unwrap();

      toast.success("BOM saved successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save BOM");
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>BOM for {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">BOM Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Component Item</th>
                  <th className="p-3 text-left">Available Stock</th>
                  <th className="p-3 text-left">Qty Required / 1 Product</th>
                  <th className="p-3 text-left">Unit</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {components.map((component, index) => {
                  const selectedItem = inventoryItems.find(
                    (item) => item.id === component.inventoryItemId
                  );

                  return (
                    <tr key={index} className="border-t">
                      <td className="p-3">
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={component.inventoryItemId}
                          onChange={(e) => handleItemChange(index, e.target.value)}
                        >
                          <option value="">Select inventory item</option>
                          {componentOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.itemCode} - {item.name} ({item.itemType})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3">
                        {selectedItem
                          ? `${selectedItem.currentStock} ${selectedItem.unit}`
                          : "-"}
                      </td>

                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={component.quantityRequired}
                          onChange={(e) =>
                            updateComponent(
                              index,
                              "quantityRequired",
                              Number(e.target.value)
                            )
                          }
                        />
                      </td>

                      <td className="p-3">
                        <Input
                          value={component.unit || ""}
                          onChange={(e) =>
                            updateComponent(index, "unit", e.target.value)
                          }
                        />
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeComponent(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {!components.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No BOM components added. BOM is optional.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={addComponent}>
              Add Component
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type="button" onClick={handleSave} disabled={saveState.isLoading}>
                {saveState.isLoading ? "Saving..." : "Save BOM"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
