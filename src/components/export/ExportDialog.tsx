"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type {
  ExportColumn,
  ExportFormat,
  ExportScope,
} from "./export.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  moduleName: string;
  columns: ExportColumn[];
  loading?: boolean;
  onStartExport: (payload: {
    format: ExportFormat;
    scope: ExportScope;
    columns: string[];
  }) => void;
}

export function ExportDialog({
  open,
  onOpenChange,
  title,
  moduleName,
  columns,
  loading = false,
  onStartExport,
}: Props) {
  const [format, setFormat] = useState<ExportFormat>("XLSX");
  const [scope, setScope] = useState<ExportScope>("FILTERED");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.filter((column) => column.defaultSelected !== false).map((c) => c.value)
  );

  function toggleColumn(column: string) {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((item) => item !== column)
        : [...prev, column]
    );
  }

  function handleSubmit() {
    if (selectedColumns.length === 0) return;

    onStartExport({
      format,
      scope,
      columns: selectedColumns,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[900px] max-w-[95vw] min-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Export Format</h3>
              <p className="text-sm text-muted-foreground">
                Choose the file format for this export.
              </p>
            </div>

            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                <RadioGroupItem value="XLSX" />
                Excel (.xlsx)
              </Label>

              <Label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                <RadioGroupItem value="CSV" />
                CSV (.csv)
              </Label>
            </RadioGroup>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Export Scope</h3>
              <p className="text-sm text-muted-foreground">
                Choose which {moduleName.toLowerCase()} records to export.
              </p>
            </div>

            <RadioGroup
              value={scope}
              onValueChange={(value) => setScope(value as ExportScope)}
              className="grid gap-3 sm:grid-cols-3"
            >
              <Label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                <RadioGroupItem value="FILTERED" />
                Current Filters
              </Label>

              <Label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                <RadioGroupItem value="CURRENT_PAGE" />
                Current Page
              </Label>

              <Label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                <RadioGroupItem value="ALL" />
                All Records
              </Label>
            </RadioGroup>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Columns</h3>
              <p className="text-sm text-muted-foreground">
                Select columns to include in the export file.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {columns.map((column) => (
                <Label
                  key={column.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <Checkbox
                    checked={selectedColumns.includes(column.value)}
                    onCheckedChange={() => toggleColumn(column.value)}
                  />
                  {column.label}
                </Label>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t pt-5">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={loading || selectedColumns.length === 0}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Start Export
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}