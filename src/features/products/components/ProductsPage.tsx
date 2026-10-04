"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  Calculator,
  Download,
  MoreHorizontal,
  PackageCheck,
  Plus,
} from "lucide-react";
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
import { useAppSelector } from "@/lib/hook";
import {
  canManageProductCosting,
  canManageProductOperations,
  isProductCostingEnabled,
} from "../utils/costingAccess";
import { getErrorMessage } from "@/lib/apiError";
import { useGetOrganizationFeaturesQuery } from "@/features/organization-features/api/organizationFeaturesApi";
import {
  useCreateCostingPolicyVersionMutation,
  useFreezeProductCostingMutation,
  useGetCostingPoliciesQuery,
  useLazyPreviewProductCostingQuery,
  usePublishCostingPolicyMutation,
  useSaveCostingPolicyMutation,
} from "../api/costingApi";
import { CostingPolicyDialog } from "./CostingPolicyDialog";
import { ProductCostingDialog } from "./ProductCostingDialog";
import { COSTING_POLICY_OPTIONS } from "../config/costingOptions";
import type { CostingPolicyDraft } from "../types/costing.types";
import { ProfitabilityWorkspace } from "./ProfitabilityWorkspace";

export function ProductsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const canManageOperations = canManageProductOperations(user);
  const canManageCosting = canManageProductCosting(user);
  const { data: featuresData } = useGetOrganizationFeaturesQuery(undefined, {
    skip: !user || Boolean(user.platformAdmin),
  });
  const costingEnabled = isProductCostingEnabled(
    featuresData?.data?.enabledFeatures
  );
  const showCosting = canManageCosting && costingEnabled;
  const profitabilityActive =
    showCosting && searchParams.get("view") === "profitability";
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetProductsQuery({
    page: 0,
    size: 50,
  });

  const { data: inventoryPage } = useGetInventoryItemsQuery(
    {
      page: 0,
      size: 300,
      itemType: "FINISHED_GOOD",
    },
    { skip: !canManageOperations }
  );
  const { data: costingInventoryPage } = useGetInventoryItemsQuery(
    { page: 0, size: 300 },
    { skip: !showCosting }
  );

  const [deleteProduct, deleteState] = useDeleteProductMutation();
  const logDataJob = useLogDataJob();

  const [formOpen, setFormOpen] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const [productionOpen, setProductionOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [costingOpen, setCostingOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [costingProduct, setCostingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const policyQuery = useGetCostingPoliciesQuery(
    { page: 0, size: 20 },
    {
      skip: !showCosting || (!policyOpen && !costingOpen),
      refetchOnMountOrArgChange: true,
    }
  );
  const policies = policyQuery.data?.content ?? [];
  const currentPolicy =
    policies.find((policy) => policy.status === "DRAFT") ??
    policies.find((policy) => policy.status === "PUBLISHED") ??
    policies[0] ??
    null;
  const publishedPolicy =
    policies.find((policy) => policy.status === "PUBLISHED") ?? null;
  const [savePolicy, savePolicyState] = useSaveCostingPolicyMutation();
  const [publishPolicy, publishPolicyState] = usePublishCostingPolicyMutation();
  const [createPolicyVersion, createVersionState] =
    useCreateCostingPolicyVersionMutation();
  const [previewCosting, previewState] = useLazyPreviewProductCostingQuery();
  const [freezeCosting, freezeState] = useFreezeProductCostingMutation();
  const resetPreview = previewState.reset;
  const resetFreeze = freezeState.reset;
  const freezeRequestKey = useRef<string | null>(null);

  const products = useMemo(() => data?.content ?? [], [data?.content]);
  const inventoryById = useMemo(
    () =>
      new Map((inventoryPage?.content ?? []).map((item) => [item.id, item])),
    [inventoryPage?.content]
  );
  const costingMaterialItems = useMemo(
    () =>
      (costingInventoryPage?.content ?? [])
        .filter((item) => item.itemType !== "FINISHED_GOOD")
        .map((item) => ({
          value: item.id,
          label: `${item.itemCode} - ${item.name} (${item.unit})`,
        })),
    [costingInventoryPage?.content]
  );

  const loadCosting = useCallback(async () => {
    if (!costingProduct || !publishedPolicy) return;

    await previewCosting({
      productId: costingProduct.id,
      policyId: publishedPolicy.id,
    }).unwrap();
  }, [costingProduct, previewCosting, publishedPolicy]);

  useEffect(() => {
    if (!costingOpen || !costingProduct) return;
    resetPreview();
    resetFreeze();
    void loadCosting().catch(() => undefined);
  }, [costingOpen, costingProduct, loadCosting, resetFreeze, resetPreview]);

  const handleSavePolicy = async (draft: CostingPolicyDraft) => {
    try {
      await savePolicy({
        policyId: currentPolicy?.status === "DRAFT" ? currentPolicy.id : undefined,
        draft,
      }).unwrap();
      toast.success("Costing policy draft saved");
    } catch {
      return;
    }
  };

  const handlePublishPolicy = async (draft: CostingPolicyDraft) => {
    const policyId = currentPolicy?.status === "DRAFT" ? currentPolicy.id : null;
    if (!policyId) {
      toast.error("Save the costing policy draft before publishing it");
      return;
    }

    try {
      await savePolicy({ policyId, draft }).unwrap();
      await publishPolicy(policyId).unwrap();
      toast.success("Costing policy published");
    } catch {
      return;
    }
  };

  const handleCreatePolicyVersion = async () => {
    if (!currentPolicy) return;
    try {
      await createPolicyVersion(currentPolicy.id).unwrap();
      toast.success("Editable costing policy version created");
    } catch {
      return;
    }
  };

  const handleFreezeCosting = async () => {
    if (!costingProduct || !publishedPolicy) return false;

    try {
      const requestKey =
        freezeRequestKey.current ??
        `costing-${costingProduct.id}-${Date.now()}`;
      freezeRequestKey.current = requestKey;
      await freezeCosting({
        productId: costingProduct.id,
        body: {
          requestKey,
          policyId: publishedPolicy.id,
          asOfDate: previewState.data?.asOf ?? undefined,
        },
      }).unwrap();
      freezeRequestKey.current = null;
      toast.success("Immutable costing snapshot published");
      return true;
    } catch {
      return false;
    }
  };

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

  const handleExport = useCallback(() => {
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
  }, [logDataJob, products]);

  const handledMode = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (!mode || handledMode.current[mode]) return;

    if (mode === "create") {
      handledMode.current[mode] = true;
      queueMicrotask(() => {
        setSelectedProduct(null);
        setFormOpen(true);
      });
    } else if (mode === "production") {
      handledMode.current[mode] = true;
      queueMicrotask(() => {
        setSelectedProduct(null);
        setProductionOpen(true);
      });
    } else if (mode === "export") {
      if (isLoading || !products.length) return;
      handledMode.current[mode] = true;
      handleExport();
    }
  }, [isLoading, products.length, handleExport]);

  const setProductsView = (view: "catalog" | "profitability") => {
    const next = new URLSearchParams(searchParams.toString());
    if (view === "profitability") next.set("view", "profitability");
    else {
      next.delete("view");
      next.delete("profitabilityProduct");
    }
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-2 text-[12px]">
      <Card className="border-[var(--factory1-border)]">
        <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {profitabilityActive ? (
                <BarChart3 className="h-5 w-5" />
              ) : (
                <PackageCheck className="h-5 w-5" />
              )}
              {profitabilityActive
                ? "Product Profitability"
                : canManageOperations
                ? "Products / BOM / Production"
                : "Products / Costing"}
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              {profitabilityActive
                ? "Review attributed sales, immutable cost evidence, gross profit, and historical trends."
                : canManageOperations
                ? "Manage finished goods, optional BOM and production entries."
                : "Review finished goods and their server-generated costing evidence."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {showCosting ? (
              <>
                <div
                  className="inline-flex rounded-lg border p-0.5"
                  aria-label="Product view"
                  role="group"
                >
                  <Button
                    size="sm"
                    variant={profitabilityActive ? "ghost" : "secondary"}
                    onClick={() => setProductsView("catalog")}
                  >
                    Products
                  </Button>
                  <Button
                    size="sm"
                    variant={profitabilityActive ? "secondary" : "ghost"}
                    onClick={() => setProductsView("profitability")}
                  >
                    Profitability
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setPolicyOpen(true)}>
                  <Calculator className="mr-2 h-4 w-4" />
                  Costing policy
                </Button>
              </>
            ) : null}

            {!profitabilityActive ? (
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!products.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            ) : null}

            {canManageOperations && !profitabilityActive ? (
              <>
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
              </>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          {profitabilityActive ? (
            <ProfitabilityWorkspace
              onConfigureCosting={() => setPolicyOpen(true)}
            />
          ) : isLoading || isFetching ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading products...
            </p>
          ) : isError ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-4"
            >
              <p className="font-medium text-red-900">Products could not be loaded</p>
              <p className="mt-1 text-sm text-red-800">
                {getErrorMessage(error, "The server could not load products.")}
              </p>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
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

                        <td className="p-3" data-label="Name">
                          {product.name}
                        </td>

                        <td className="p-3" data-label="Linked Item">
                          {inventoryItem
                            ? `${inventoryItem.itemCode} - ${inventoryItem.name}`
                            : "Finished-good item name unavailable"}
                        </td>

                        <td className="p-3" data-label="Unit">
                          {product.unit || "-"}
                        </td>

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
                            {canManageOperations || showCosting ? (
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
                                  {showCosting ? (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setCostingProduct(product);
                                        setCostingOpen(true);
                                      }}
                                    >
                                      View costing
                                    </DropdownMenuItem>
                                  ) : null}
                                  {canManageOperations ? (
                                    <>
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
                                      <DropdownMenuItem
                                        onClick={() => setDeleteTarget(product)}
                                      >
                                        Delete product
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                View only
                              </span>
                            )}
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

      {canManageOperations ? (
        <>
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
        </>
      ) : null}

      <CostingPolicyDialog
        open={policyOpen}
        onOpenChange={setPolicyOpen}
        policy={currentPolicy}
        options={COSTING_POLICY_OPTIONS}
        materialItems={costingMaterialItems}
        loading={policyQuery.isLoading}
        saving={savePolicyState.isLoading}
        publishing={publishPolicyState.isLoading}
        creatingVersion={createVersionState.isLoading}
        loadError={
          policyQuery.isError
            ? getErrorMessage(
                policyQuery.error,
                "The server could not load the costing policy."
              )
            : null
        }
        actionError={
          savePolicyState.isError
            ? getErrorMessage(
                savePolicyState.error,
                "The server could not save the costing policy."
              )
            : publishPolicyState.isError
              ? getErrorMessage(
                  publishPolicyState.error,
                  "The server could not publish the costing policy."
                )
              : createVersionState.isError
                ? getErrorMessage(
                    createVersionState.error,
                    "The server could not create a new policy version."
                  )
              : null
        }
        onRetry={() => void policyQuery.refetch()}
        onSave={handleSavePolicy}
        onPublish={handlePublishPolicy}
        onCreateVersion={handleCreatePolicyVersion}
      />

      <ProductCostingDialog
        open={costingOpen}
        onOpenChange={(open) => {
          setCostingOpen(open);
          if (!open) setCostingProduct(null);
        }}
        data={freezeState.data ?? previewState.data ?? null}
        loading={
          (policyQuery.isLoading || previewState.isLoading) &&
          !previewState.data
        }
        refreshing={previewState.isLoading && Boolean(previewState.data)}
        freezing={freezeState.isLoading}
        loadError={
          policyQuery.isError
            ? getErrorMessage(
                policyQuery.error,
                "The server could not load published costing policies."
              )
            : previewState.isError
            ? getErrorMessage(
                previewState.error,
                "The server could not calculate a costing preview."
              )
            : null
        }
        actionError={
          freezeState.isError
            ? getErrorMessage(
                freezeState.error,
                "The server could not publish the costing snapshot."
              )
            : null
        }
        onRetry={() => void loadCosting().catch(() => undefined)}
        onFreeze={handleFreezeCosting}
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
