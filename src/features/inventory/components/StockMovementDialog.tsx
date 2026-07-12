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
import { toast } from "sonner";
import { useGetOrganizationSettingsQuery } from "@/features/organization-settings/api/organizationSettingsApi";

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
    const { data: orgSettingsResponse } = useGetOrganizationSettingsQuery();
    const orgSettings = orgSettingsResponse?.data;
    const defaultMovementDate = activePeriodDefaultDate(
        orgSettings?.activeAccountingPeriodStart,
        orgSettings?.activeAccountingPeriodEnd
    );
    const form = useForm<FormValues>({
        defaultValues: {
            movementType: "STOCK_IN",
            quantity: 1,
            movementDate: defaultMovementDate,
            referenceNumber: "",
            remarks: "",
        },
    });

    const outMovementTypes = [
        "STOCK_OUT",
        "PRODUCTION_USAGE",
        "ADJUSTMENT_OUT",
        "DAMAGE",
        "RETURN_OUT",
    ];

    const [addStockMovement, state] = useAddStockMovementMutation();

    useEffect(() => {
        if (open) {
            form.reset({
                movementType: "STOCK_IN",
                quantity: 1,
                movementDate: defaultMovementDate,
                referenceNumber: "",
                remarks: "",
            });
        }
    }, [open, form, defaultMovementDate]);

    const onSubmit = async (values: FormValues) => {
        if (!item) return;

        const quantity = Number(values.quantity);

        if (
            outMovementTypes.includes(values.movementType) &&
            quantity > item.currentStock
        ) {
            toast.warning(
                `Cannot remove ${quantity} ${item.unit}. Current stock is only ${item.currentStock} ${item.unit}.`
            );
            return;
        }

        try {
            const body: StockMovementRequest = {
                movementType: values.movementType as StockMovementRequest["movementType"],
                quantity,
                movementDate: values.movementDate,
                referenceNumber: values.referenceNumber,
                remarks: values.remarks,
            };

            await addStockMovement({
                itemId: item.id,
                body,
            }).unwrap();

            toast.success("Stock movement saved successfully");
            onClose();
        } catch {
            toast.error("Failed to save stock movement");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl">
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

                {item &&
                    outMovementTypes.includes(form.watch("movementType")) &&
                    Number(form.watch("quantity")) > item.currentStock && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            Quantity is greater than available stock. Current stock is{" "}
                            {item.currentStock} {item.unit}.
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

function activePeriodDefaultDate(
    fromDate?: string,
    toDate?: string
) {
    const today = new Date().toISOString().slice(0, 10);

    if (!fromDate || !toDate) {
        return today;
    }

    return today >= fromDate && today <= toDate ? today : toDate;
}
