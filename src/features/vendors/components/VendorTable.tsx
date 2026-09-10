"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Vendor } from "../types/vendor.types";

type Props = {
  vendors: Vendor[];
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
};

export function VendorTable({
  vendors,
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
        <table className="responsive-table w-full min-w-[800px] text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Vendor</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Service Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No vendors found.
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="border-b">
                  <td className="px-4 py-3" data-label="Vendor">
                    <div className="font-medium">{vendor.name}</div>
                  </td>

                  <td className="px-4 py-3" data-label="Contact">
                    <div>{vendor.contactEmail || "-"}</div>
                    <div className="text-xs text-muted-foreground">
                      {vendor.contactPhone || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3" data-label="Service Type">
                    {vendor.serviceType || "-"}
                  </td>

                  <td className="px-4 py-3" data-label="Status">
                    <Badge variant={vendor.active ? "default" : "outline"}>
                      {vendor.active ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </td>

                  <td className="px-4 py-3" data-label="Actions">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(vendor)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!vendor.active}
                        onClick={() => onDelete(vendor)}
                      >
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

      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Total {totalElements} vendor(s)
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
