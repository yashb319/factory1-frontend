"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { InventoryItem } from "../types/inventory.types";
import { useGetStockMovementsQuery } from "../api/inventoryApi";
import {
  formatCurrency,
  formatNumber,
  getInventoryInsight,
  itemTypeLabel,
  movementTypeLabel,
} from "../utils/inventoryHelpers";

type Props = {
  open: boolean;
  item?: InventoryItem | null;
  onClose: () => void;
};

export function InventoryDetailsDialog({ open, item, onClose }: Props) {
  const { data: movements = [], isLoading } = useGetStockMovementsQuery(
    item?.id ?? "",
    {
      skip: !item?.id || !open,
    }
  );

  if (!item) return null;

  const profit =
    item.sellingPrice && item.purchasePrice
      ? item.sellingPrice - item.purchasePrice
      : null;

  const margin =
    profit !== null && item.sellingPrice
      ? (profit / item.sellingPrice) * 100
      : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.itemCode} • {itemTypeLabel(item.itemType)}
                </p>
              </div>

              <div className="flex gap-2">
                {item.outOfStock && <Badge variant="destructive">Out</Badge>}
                {item.lowStock && !item.outOfStock && (
                  <Badge variant="secondary">Low Stock</Badge>
                )}
                <Badge>{item.status}</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
              <Info label="Current Stock" value={`${formatNumber(item.currentStock)} ${item.unit}`} />
              <Info label="Minimum Stock" value={`${formatNumber(item.minimumStock)} ${item.unit}`} />
              <Info label="Purchase Price" value={formatCurrency(item.purchasePrice)} />
              <Info label="Selling Price" value={item.sellingPrice ? formatCurrency(item.sellingPrice) : "-"} />
              <Info label="Inventory Value" value={formatCurrency(item.inventoryValue)} />
              <Info label="Supplier" value={item.supplierName || "-"} />
              <Info label="Category" value={item.category || "-"} />
              <Info label="Basic Profit" value={profit !== null ? formatCurrency(profit) : "-"} />
            </div>

            {margin !== null && (
              <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
                Estimated basic margin:{" "}
                <span className="font-semibold">{margin.toFixed(1)}%</span>
              </div>
            )}

            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-medium">Factory1 Insight</div>
              <div className="mt-1 text-muted-foreground">
                {getInventoryInsight(item)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 font-medium">
              Stock Movement History
            </div>

            <div className="overflow-x-auto">
              <table className="responsive-table w-full min-w-[700px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Qty</th>
                    <th className="px-4 py-3 text-left">Before</th>
                    <th className="px-4 py-3 text-left">After</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No movements found.
                      </td>
                    </tr>
                  ) : (
                    movements.map((movement) => (
                      <tr key={movement.id} className="border-t">
                        <td className="px-4 py-3" data-label="Date">{movement.movementDate}</td>
                        <td className="px-4 py-3" data-label="Type">
                          {movementTypeLabel(movement.movementType)}
                        </td>
                        <td className="px-4 py-3" data-label="Qty">
                          {formatNumber(movement.quantity)}
                        </td>
                        <td className="px-4 py-3" data-label="Before">
                          {formatNumber(movement.stockBefore)}
                        </td>
                        <td className="px-4 py-3" data-label="After">
                          {formatNumber(movement.stockAfter)}
                        </td>
                        <td className="px-4 py-3" data-label="Remarks">
                          {movement.remarks || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}