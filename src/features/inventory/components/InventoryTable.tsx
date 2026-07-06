"use client";

import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InventoryItem } from "../types/inventory.types";
import {
  formatCurrency,
  formatNumber,
  itemTypeLabel,
} from "../utils/inventoryHelpers";

type Props = {
  items: InventoryItem[];
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onView: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onStockMovement: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
};

export function InventoryTable({
  items,
  page,
  totalPages,
  totalElements,
  onPageChange,
  onView,
  onEdit,
  onStockMovement,
  onDelete,
}: Props) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Stock</th>
              <th className="px-4 py-3 text-left font-medium">Min Stock</th>
              <th className="px-4 py-3 text-left font-medium">Purchase</th>
              <th className="px-4 py-3 text-left font-medium">Selling</th>
              <th className="px-4 py-3 text-left font-medium">Value</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No inventory items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => onView(item)}
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.itemCode}
                        {item.category ? ` • ${item.category}` : ""}
                      </div>
                    </button>
                  </td>

                  <td className="px-4 py-3">{itemTypeLabel(item.itemType)}</td>

                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {formatNumber(item.currentStock)} {item.unit}
                    </div>
                    {item.outOfStock ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : item.lowStock ? (
                      <Badge variant="secondary">Low stock</Badge>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    {formatNumber(item.minimumStock)} {item.unit}
                  </td>

                  <td className="px-4 py-3">
                    {formatCurrency(item.purchasePrice)}
                  </td>

                  <td className="px-4 py-3">
                    {item.sellingPrice
                      ? formatCurrency(item.sellingPrice)
                      : "-"}
                  </td>

                  <td className="px-4 py-3">
                    {formatCurrency(item.inventoryValue)}
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      variant={item.status === "ACTIVE" ? "default" : "outline"}
                    >
                      {item.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Inventory actions for ${item.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(item)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStockMovement(item)}>
                            Stock movement
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            Edit item
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(item)}>
                            Disable item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          Total {totalElements} item(s)
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
