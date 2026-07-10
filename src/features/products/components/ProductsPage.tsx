"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, MoreHorizontal, PackageCheck, Plus } from "lucide-react";
import {
  useDeleteProductMutation,
  useGetProductsQuery,
} from "../api/productsApi";
import type { Product } from "../types/product.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { exportProductsCsv } from "../utils/productExport";

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
  const logDataJob = useLogDataJob();

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

  const handleExport = () => {
    if (!products.length) {
      toast.info("No products to export");
      return;
    }

    const exported = exportProductsCsv(products);

    void logDataJob({
      operation: "EXPORT",
      module: "PRODUCT",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: products.length,
      successRows: products.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
    });

    toast.success("Products CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Products / BOM / Production
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage finished goods, optional BOM and production entries.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!products.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

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
              <table className="responsive-table w-full text-sm">
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
                        <td className="p-3 font-medium" data-label="Code">
                          {product.productCode}
                        </td>

                        <td className="p-3" data-label="Name">{product.name}</td>

                        <td className="p-3" data-label="Linked Item">
                          {inventoryItem
                            ? `${inventoryItem.itemCode} - ${inventoryItem.name}`
                            : product.finishedGoodInventoryItemId}
                        </td>

                        <td className="p-3" data-label="Unit">{product.unit || "-"}</td>

                        <td className="p-3" data-label="BOM">
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            {product.hasBom ? "Configured" : "Optional"}
                          </span>
                        </td>

                        <td className="p-3" data-label="Status">
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            {product.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="p-3" data-label="Actions">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Product actions for ${product.name}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setProductionOpen(true);
                                  }}
                                >
                                  Record production
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setBomOpen(true);
                                  }}
                                >
                                  Configure BOM
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setFormOpen(true);
                                  }}
                                >
                                  Edit product
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteTarget(product)}>
                                  Delete product
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
