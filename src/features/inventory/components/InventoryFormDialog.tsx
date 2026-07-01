"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    AppForm,
    FormActions,
    NumberField,
    SelectField,
    TextField,
} from "@/components/forms";
import type {
    InventoryItem,
    InventoryItemRequest,
    InventoryItemUpdateRequest,
} from "../types/inventory.types";
import {
    useCreateInventoryItemMutation,
    useUpdateInventoryItemMutation,
} from "../api/inventoryApi";
import { toast } from "sonner";

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
    supplierName: string;
    status: string;
    notes: string;
};

export function InventoryFormDialog({ open, item, onClose }: Props) {
    const isEdit = Boolean(item);

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
            supplierName: "",
            status: "ACTIVE",
            notes: "",
        },
    });

    const [createItem, createState] = useCreateInventoryItemMutation();
    const [updateItem, updateState] = useUpdateInventoryItemMutation();

    useEffect(() => {
        if (!open) return;

        if (item) {
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
                supplierName: item.supplierName ?? "",
                status: item.status,
                notes: item.notes ?? "",
            });
        } else {
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
                supplierName: "",
                status: "ACTIVE",
                notes: "",
            });
        }
    }, [open, item, form]);

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
                    supplierName: values.supplierName,
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
                supplierName: values.supplierName,
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

    const isLoading = createState.isLoading || updateState.isLoading;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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

                        <TextField name="supplierName" label="Supplier Name" />

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
    );
}