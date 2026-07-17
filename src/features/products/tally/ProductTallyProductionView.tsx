"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter } from "next/navigation";
import { useGetProductsQuery, useRecordProductionMutation } from "../api/productsApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import type { ProductionRequest } from "../types/product.types";

type ProductionDraft = {
  productId: string;
  quantityProduced: string;
  productionDate: string;
  notes: string;
};

export function ProductTallyProductionView() {
  const router = useRouter();
  const { data } = useGetProductsQuery({ page: 0, size: 300 });
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
    itemType: "FINISHED_GOOD",
    status: "ACTIVE",
  });
  const [recordProduction, recordState] = useRecordProductionMutation();

  const items = useMemo(() => data?.content ?? [], [data]);
  const inventoryById = useMemo(
    () => new Map((inventoryPage?.content ?? []).map((i) => [i.id, i])),
    [inventoryPage]
  );

  const productOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.productCode} - ${item.name} ${item.hasBom ? "(BOM)" : "(Simple)"}`,
      })),
    [items]
  );

  const [draft, setDraft] = useState<ProductionDraft>({
    productId: "",
    quantityProduced: "1",
    productionDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [editMode, setEditMode] = useState(false);
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    fieldRefs.current[0]?.focus();
  }, []);

  const selectedProduct = items.find((i) => i.id === draft.productId);
  const linkedItem = selectedProduct
    ? inventoryById.get(selectedProduct.finishedGoodInventoryItemId)
    : undefined;

  const submit = async () => {
    if (!draft.productId) {
      toast.error("Select a product");
      return;
    }
    try {
      const body: ProductionRequest = {
        productId: draft.productId,
        quantityProduced: Number(draft.quantityProduced),
        productionDate: draft.productionDate,
        notes: draft.notes,
      };
      await recordProduction(body).unwrap();
      toast.success("Production recorded");
      router.push("/tally/product");
    } catch {
      toast.error("Could not record production. Check raw material stock.");
    }
  };

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const fields = fieldRefs.current.filter(Boolean) as HTMLElement[];
      const currentIndex = fields.findIndex((el) => el === document.activeElement);

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (editMode) {
          setEditMode(false);
          return;
        }
        router.push("/tally/product");
        return;
      }

      if (editMode) {
        if (event.key === "Enter") {
          event.preventDefault();
          setEditMode(false);
        }
        return;
      }

      if (event.key.toLowerCase() === "a" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        playUiSound("post");
        submit();
        return;
      }
      if (event.key.toLowerCase() === "q") {
        event.preventDefault();
        event.stopImmediatePropagation();
        router.push("/tally/product");
        return;
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        event.stopImmediatePropagation();
        router.push("/gateway?menu=product");
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        setEditMode(true);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = Math.min(currentIndex + 1, fields.length - 1);
        fields[next >= 0 ? next : 0]?.focus();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = Math.max(currentIndex - 1, 0);
        fields[prev]?.focus();
        return;
      }
      if (
        (event.key.length === 1 ||
          event.key === "Backspace" ||
          event.key === "Delete") &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [draft, editMode]);

  return (
    <div className="tally-entry-screen" data-tally-nav-scope>
      <div className="tally-entry-title">
        <span>Production Voucher</span>
        <span>Factory1</span>
        <span>Ctrl + M</span>
      </div>

      <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
        <div className="mx-auto grid w-full max-w-lg gap-y-3">
          <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
            <span className="tally-company-label px-1 font-bold">Product</span>
            <select
              ref={(el) => {
                fieldRefs.current[0] = el;
              }}
              value={draft.productId}
              onChange={(e) =>
                setDraft((c) => ({ ...c, productId: e.target.value }))
              }
              className="tally-select h-6 w-full"
            >
              <option value="">---</option>
              {productOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {linkedItem && (
            <div className="rounded border border-[#0F766E] bg-[#D9F99D]/40 px-3 py-2 text-[12px]">
              <span className="text-slate-600">Linked finished good: </span>
              <span className="font-bold">
                {linkedItem.itemCode} - {linkedItem.name} ({linkedItem.currentStock}{" "}
                {linkedItem.unit})
              </span>
            </div>
          )}

          <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
            <span className="tally-company-label px-1 font-bold">
              Quantity Produced
            </span>
            <input
              ref={(el) => {
                fieldRefs.current[1] = el;
              }}
              type="number"
              value={draft.quantityProduced}
              onChange={(e) =>
                setDraft((c) => ({ ...c, quantityProduced: e.target.value }))
              }
              className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
            />
          </label>

          <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
            <span className="tally-company-label px-1 font-bold">
              Production Date
            </span>
            <input
              ref={(el) => {
                fieldRefs.current[2] = el;
              }}
              type="date"
              value={draft.productionDate}
              onChange={(e) =>
                setDraft((c) => ({ ...c, productionDate: e.target.value }))
              }
              className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
            />
          </label>

          <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
            <span className="tally-company-label px-1 font-bold">Notes</span>
            <input
              ref={(el) => {
                fieldRefs.current[3] = el;
              }}
              type="text"
              value={draft.notes}
              onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
              className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/tally/product")}
        >
          Q: Back
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={recordState.isLoading}
          onClick={() => {
            playUiSound("post");
            submit();
          }}
        >
          A: Accept
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          O: Close
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/tally/product")}
        >
          X: Cancel
        </button>
      </div>
    </div>
  );
}
