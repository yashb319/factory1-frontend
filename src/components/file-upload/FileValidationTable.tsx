"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ValidationRow {
  rowNumber: number;
  data: Record<string, unknown>;
  status: "VALID" | "WARNING" | "ERROR";
  messages: string[];
}

interface Props {
  rows: ValidationRow[];
}

export function FileValidationTable({ rows }: Props) {
  if (!rows.length) return null;

  const columns = Object.keys(rows[0].data);

  return (
    <div className="rounded-xl border">
      <div className="max-h-[420px] overflow-auto">
        <Table className="responsive-table">
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Status</TableHead>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.slice(0, 50).map((row) => (
              <TableRow key={row.rowNumber}>
                <TableCell data-label="Row">{row.rowNumber}</TableCell>

                <TableCell data-label="Status">
                  <Badge
                    variant={
                      row.status === "ERROR"
                        ? "destructive"
                        : row.status === "WARNING"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {row.status}
                  </Badge>
                </TableCell>

                {columns.map((column) => (
                  <TableCell key={column} data-label={column}>
                    {String(row.data[column] ?? "")}
                  </TableCell>
                ))}

                <TableCell className="min-w-[260px] text-sm text-muted-foreground" data-label="Message">
                  {row.messages.join(", ") || "Ready"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}