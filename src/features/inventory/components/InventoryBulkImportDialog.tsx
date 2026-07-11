"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBulkCreateInventoryItemsMutation } from "../api/inventoryApi";
import { saveFile } from "@/features/import-export/utils/localExportFiles";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { toImportReportParams } from "@/features/import-export/utils/importReportParams";
import type {
    InventoryItemRequest,
    InventoryItemType,
} from "../types/inventory.types";
import { toast } from "sonner";

type Props = {
    open: boolean;
    onClose: () => void;
};

type ParsedRow = InventoryItemRequest & {
    rowNumber: number;
    error?: string;
};

const validTypes: InventoryItemType[] = [
    "RAW_MATERIAL",
    "FINISHED_GOOD",
    "PACKAGING",
    "CONSUMABLE",
    "SEMI_FINISHED",
    "OTHER",
];

export function InventoryBulkImportDialog({ open, onClose }: Props) {
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [message, setMessage] = useState<string>("");

    const [bulkCreate, state] = useBulkCreateInventoryItemsMutation();
    const logDataJob = useLogDataJob();

    const validRows = useMemo(
        () => rows.filter((row) => !row.error),
        [rows]
    );

    const invalidRows = useMemo(
        () => rows.filter((row) => row.error),
        [rows]
    );

    const handleFile = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const text = await file.text();
        const parsed = parseCsv(text);

        setRows(parsed);
        setMessage("");
    };

    const handleImport = async () => {
        try {
            const response = await bulkCreate({
                items: validRows.map(({ rowNumber, error, ...item }) => item),
            }).unwrap();

            const msg = `Imported ${response.data.successCount} item(s). Failed ${response.data.failedCount}.`;

            setMessage(msg);

            if (response.data.failedCount > 0) {
                toast.warning(msg);
            } else {
                toast.success("Inventory items imported successfully");
            }

            const report = toImportReportParams(rows as Array<Record<string, unknown>>);

            logDataJob({
                operation: "IMPORT",
                module: "INVENTORY",
                fileName: "inventory-import.csv",
                status:
                    response.data.failedCount > 0
                        ? "PARTIAL_SUCCESS"
                        : "COMPLETED",
                progress: 100,
                totalRows: validRows.length,
                successRows: response.data.successCount,
                failedRows: response.data.failedCount,
                parameters: {
                    reportType: "IMPORT_TEMPLATE",
                    module: "INVENTORY",
                    headers: report.headers,
                    validRows: report.validRows,
                    errorRows: report.errorRows,
                },
                notes: msg,
            });
        } catch {
            toast.error("Failed to import inventory items");
        }
    };

    const downloadTemplate = async () => {
        const csv = [
            [
                "itemCode",
                "name",
                "category",
                "itemType",
                "unit",
                "openingStock",
                "minimumStock",
                "purchasePrice",
                "sellingPrice",
                "hsnCode",
                "gstRate",
                "supplierName",
                "notes",
            ].join(","),
            [
                "FAB-001",
                "Blue Fabric",
                "Fabric",
                "RAW_MATERIAL",
                "meter",
                "500",
                "100",
                "85",
                "",
                "5208",
                "5",
                "ABC Textiles",
                "Used for bags",
            ].join(","),
        ].join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });

        await saveFile({ fileName: "inventory-import-template.csv", content: blob });

        toast.success("Inventory import template downloaded");
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-5xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Import Inventory</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                        Upload CSV with columns:
                        <div className="mt-2 font-mono text-xs">
                            itemCode, name, category, itemType, unit, openingStock,
                            minimumStock, purchasePrice, sellingPrice, hsnCode, gstRate,
                            supplierName, notes
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={downloadTemplate}>
                            Download Template
                        </Button>

                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFile}
                            className="rounded-md border p-2 text-sm"
                        />
                    </div>

                    {rows.length > 0 && (
                        <div className="flex gap-3 text-sm">
                            <div>Valid: {validRows.length}</div>
                            <div>Invalid: {invalidRows.length}</div>
                        </div>
                    )}

                    {message && (
                        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                            {message}
                        </div>
                    )}

                    {rows.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="responsive-table w-full min-w-[1000px] text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Row</th>
                                        <th className="px-3 py-2 text-left">Item Code</th>
                                        <th className="px-3 py-2 text-left">Name</th>
                                        <th className="px-3 py-2 text-left">Type</th>
                                        <th className="px-3 py-2 text-left">Unit</th>
                                        <th className="px-3 py-2 text-left">Opening</th>
                                        <th className="px-3 py-2 text-left">Minimum</th>
                                        <th className="px-3 py-2 text-left">Error</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.rowNumber} className="border-t">
                                            <td className="px-3 py-2" data-label="Row">{row.rowNumber}</td>
                                            <td className="px-3 py-2" data-label="Item Code">{row.itemCode}</td>
                                            <td className="px-3 py-2" data-label="Name">{row.name}</td>
                                            <td className="px-3 py-2" data-label="Type">{row.itemType}</td>
                                            <td className="px-3 py-2" data-label="Unit">{row.unit}</td>
                                            <td className="px-3 py-2" data-label="Opening">{row.openingStock}</td>
                                            <td className="px-3 py-2" data-label="Minimum">{row.minimumStock}</td>
                                            <td className="px-3 py-2 text-red-600" data-label="Error">
                                                {row.error || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>

                        <Button
                            disabled={validRows.length === 0 || state.isLoading}
                            onClick={handleImport}
                        >
                            {state.isLoading ? "Importing..." : "Import Valid Rows"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function parseCsv(text: string): ParsedRow[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const [, ...dataLines] = lines;

    return dataLines.map((line, index) => {
        const cols = splitCsvLine(line);

        const row: ParsedRow = {
            rowNumber: index + 2,
            itemCode: cols[0] ?? "",
            name: cols[1] ?? "",
            category: cols[2] ?? "",
            itemType: (cols[3] ?? "OTHER") as InventoryItemType,
            unit: cols[4] ?? "pcs",
            openingStock: Number(cols[5] ?? 0),
            minimumStock: Number(cols[6] ?? 0),
            purchasePrice: cols[7] ? Number(cols[7]) : null,
            sellingPrice: cols[8] ? Number(cols[8]) : null,
            hsnCode: cols[9] ?? "",
            gstRate: cols[10] ? Number(cols[10]) : null,
            supplierName: cols[11] ?? "",
            notes: cols[12] ?? "",
        };

        row.error = validateRow(row);

        return row;
    });
}

function validateRow(row: ParsedRow) {
    if (!row.itemCode) return "Item code is required";
    if (!row.name) return "Name is required";
    if (!row.unit) return "Unit is required";
    if (!validTypes.includes(row.itemType)) return "Invalid item type";
    if (Number.isNaN(row.openingStock) || row.openingStock < 0) {
        return "Opening stock must be 0 or more";
    }
    if (Number.isNaN(row.minimumStock) || row.minimumStock < 0) {
        return "Minimum stock must be 0 or more";
    }
    if (row.gstRate !== null && row.gstRate !== undefined
        && (Number.isNaN(row.gstRate) || row.gstRate < 0 || row.gstRate > 28)) {
        return "GST rate must be between 0 and 28";
    }

    return undefined;
}

function splitCsvLine(line: string) {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (const char of line) {
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());

    return result.map((value) => value.replace(/^"|"$/g, ""));
}
