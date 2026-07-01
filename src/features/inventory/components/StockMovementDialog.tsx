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
    StockMovementRequest,
} from "../types/inventory.types";
import { useAddStockMovementMutation } from "../api/inventoryApi";

type Props = {
    open: boolean;
    item?: InventoryItem | null;
    onClose: () => void;
};

type FormValues = {
    movementType: string;
    quantity: number;
    movementDate: string;
    referenceNumber: string;
    remarks: string;
};

export function StockMovementDialog({ open, item, onClose }: Props) {
    const form = useForm<FormValues>({
        defaultValues: {
            movementType: "STOCK_IN",
            quantity: 1,
            movementDate: new Date().toISOString().slice(0, 10),
            referenceNumber: "",
            remarks: "",
        },
    });

    const [addStockMovement, state] = useAddStockMovementMutation();

    useEffect(() => {
        if (open) {
            form.reset({
                movementType: "STOCK_IN",
                quantity: 1,
                movementDate: new Date().toISOString().slice(0, 10),
                referenceNumber: "",
                remarks: "",
            });
        }
    }, [open, form]);

    const onSubmit = async (values: FormValues) => {
        if (!item) return;

        const body: StockMovementRequest = {
            movementType: values.movementType as StockMovementRequest["movementType"],
            quantity: Number(values.quantity),
            movementDate: values.movementDate,
            referenceNumber: values.referenceNumber,
            remarks: values.remarks,
        };

        await addStockMovement({
            itemId: item.id,
            body,
        }).unwrap();

        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Update Stock</DialogTitle>
                </DialogHeader>

                {item && (
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-muted-foreground">
                            Current Stock: {item.currentStock} {item.unit}
                        </div>
                    </div>
                )}

                <AppForm form={form} onSubmit={onSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <SelectField
                            name="movementType"
                            label="Movement Type"
                            options={[
                                { label: "Stock In", value: "STOCK_IN" },
                                { label: "Stock Out", value: "STOCK_OUT" },
                                { label: "Production In", value: "PRODUCTION_IN" },
                                { label: "Production Usage", value: "PRODUCTION_USAGE" },
                                { label: "Adjustment In", value: "ADJUSTMENT_IN" },
                                { label: "Adjustment Out", value: "ADJUSTMENT_OUT" },
                                { label: "Damage", value: "DAMAGE" },
                                { label: "Return In", value: "RETURN_IN" },
                                { label: "Return Out", value: "RETURN_OUT" },
                            ]}
                            required
                        />

                        <NumberField name="quantity" label="Quantity" required />

                        <TextField name="movementDate" label="Date" type="date" />

                        <TextField name="referenceNumber" label="Reference Number" />

                        <div className="md:col-span-2">
                            <TextField name="remarks" label="Remarks" />
                        </div>
                    </div>

                    <FormActions
                        submitLabel="Save Movement"
                        cancelLabel="Cancel"
                        onCancel={onClose}
                        loading={state.isLoading}
                    />
                </AppForm>
            </DialogContent>
        </Dialog>
    );
}