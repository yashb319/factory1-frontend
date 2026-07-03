"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck, Plus } from "lucide-react";
import {
  useDeleteProductMutation,
  useGetProductsQuery,
} from "../api/productsApi";
import type { Product } from "../types/product.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormDialog } from "./ProductFormDialog";
import { BomDialog } from "./BomDialog";
import { ProductionDialog } from "./ProductionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";

export function ProductsPage() {
  const { data, isLoading, isFetching } = useGetProductsQuery({
    page: 0,
    size: 50,
  });

  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
    itemType: "FINISHED_GOOD",
  });

  const [deleteProduct, deleteState] = useDeleteProductMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const [productionOpen, setProductionOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const products = data?.content ?? [];
  const inventoryById = new Map(
    (inventoryPage?.content ?? []).map((item) => [item.id, item])
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProduct(deleteTarget.id).unwrap();
      toast.success("Product deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete product");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Products / BOM / Production
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage finished goods, optional BOM and production entries.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProduct(null);
                setProductionOpen(true);
              }}
            >
              Record Production
            </Button>

            <Button
              onClick={() => {
                setSelectedProduct(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading || isFetching ? (
            <p className="text-sm text-muted-foreground">Loading products...</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Linked Inventory Item</th>
                    <th className="p-3 text-left">Unit</th>
                    <th className="p-3 text-left">BOM</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => {
                    const inventoryItem = inventoryById.get(
                      product.finishedGoodInventoryItemId
                    );

                    return (
                      <tr key={product.id} className="border-t">
                        <td className="p-3 font-medium">
                          {product.productCode}
                        </td>

                        <td className="p-3">{product.name}</td>

                        <td className="p-3">
                          {inventoryItem
                            ? `${inventoryItem.itemCode} - ${inventoryItem.name}`
                            : product.finishedGoodInventoryItemId}
                        </td>

                        <td className="p-3">{product.unit || "-"}</td>

                        <td className="p-3">
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            {product.hasBom ? "Configured" : "Optional"}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            {product.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(product);
                                setProductionOpen(true);
                              }}
                            >
                              Produce
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(product);
                                setBomOpen(true);
                              }}
                            >
                              BOM
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(product);
                                setFormOpen(true);
                              }}
                            >
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteTarget(product)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!products.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-muted-foreground"
                      >
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={selectedProduct}
      />

      <BomDialog
        open={bomOpen}
        onOpenChange={setBomOpen}
        product={selectedProduct}
      />

      <ProductionDialog
        open={productionOpen}
        onOpenChange={setProductionOpen}
        product={selectedProduct}
        products={products}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
          </AlertDialogHeader>

          <p className="text-sm text-muted-foreground">
            This will deactivate the product. Existing production history will
            remain safe.
          </p>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteState.isLoading}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteState.isLoading}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
