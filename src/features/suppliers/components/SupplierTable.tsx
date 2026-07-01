"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Supplier } from "../types/supplier.types";

type Props = {
  suppliers: Supplier[];
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
};

export function SupplierTable({
  suppliers,
  page,
  totalPages,
  totalElements,
  onPageChange,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Supplier</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">GST</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Payment Terms</th>
              <th className="px-4 py-3 text-left">Data Score</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No suppliers found.
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {supplier.supplierCode}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div>{supplier.contactPerson || "-"}</div>
                    <div className="text-xs text-muted-foreground">
                      {supplier.phone || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3">{supplier.gstNumber || "-"}</td>

                  <td className="px-4 py-3">
                    {[supplier.city, supplier.state].filter(Boolean).join(", ") || "-"}
                  </td>

                  <td className="px-4 py-3">{supplier.paymentTerms || "-"}</td>

                  <td className="px-4 py-3">
                    <Badge variant={supplier.dataCompletenessScore >= 70 ? "default" : "secondary"}>
                      {supplier.dataCompletenessScore}%
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <Badge variant={supplier.status === "ACTIVE" ? "default" : "outline"}>
                      {supplier.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(supplier)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(supplier)}>
                        Disable
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Total {totalElements} supplier(s)
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span className="text-sm">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}