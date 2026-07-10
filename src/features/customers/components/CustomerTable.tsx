"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Customer } from "../types/customer.types";

type Props = {
  customers: Customer[];
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
};

export function CustomerTable({
  customers,
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
              <th className="px-4 py-3 text-left">Customer</th>
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
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {customer.customerCode}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div>{customer.contactPerson || "-"}</div>
                    <div className="text-xs text-muted-foreground">
                      {customer.phone || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3">{customer.gstNumber || "-"}</td>

                  <td className="px-4 py-3">
                    {[customer.city, customer.state, customer.pincode]
                      .filter(Boolean)
                      .join(", ") ||
                      "-"}
                  </td>

                  <td className="px-4 py-3">
                    {customer.paymentTerms || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        customer.dataCompletenessScore >= 70
                          ? "default"
                          : "secondary"
                      }
                    >
                      {customer.dataCompletenessScore}%
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        customer.status === "ACTIVE" ? "default" : "outline"
                      }
                    >
                      {customer.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(customer)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(customer)}
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

      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Total {totalElements} customer(s)
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>

          <span className="text-sm">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>

          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
