"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TargetField {
  label: string;
  value: string;
  required?: boolean;
}

export type ColumnMappingValue = Record<string, string>;

interface Props {
  sourceColumns: string[];
  targetFields: TargetField[];
  value: ColumnMappingValue;
  onChange: (value: ColumnMappingValue) => void;
}

export function ColumnMapping({
  sourceColumns,
  targetFields,
  value,
  onChange,
}: Props) {
  function updateMapping(sourceColumn: string, targetField: string) {
    onChange({
      ...value,
      [sourceColumn]: targetField,
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Column Mapping</h3>
        <p className="text-sm text-muted-foreground">
          Match your file columns with Factory1 employee fields.
        </p>
      </div>

      <div className="divide-y">
        {sourceColumns.map((column) => (
          <div
            key={column}
            className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_280px]"
          >
            <div>
              <p className="text-sm font-medium">{column}</p>
              <p className="text-xs text-muted-foreground">File column</p>
            </div>

            <Select
              value={value[column] || "IGNORE"}
              onValueChange={(target) => updateMapping(column, target)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Factory1 field" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="IGNORE">Ignore this column</SelectItem>

                {targetFields.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}