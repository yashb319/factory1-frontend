"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter } from "next/navigation";
import { useGetProductsQuery } from "../api/productsApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import { exportProductsCsv } from "../utils/productExport";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import type { Product } from "../types/product.types";

export function ProductTallyExportView() {
  const router = useRouter();
  const { data } = useGetProductsQuery({ page: 0, size: 300 });
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
    itemType: "FINISHED_GOOD",
    status: "ACTIVE",
  });
  const logDataJob = useLogDataJob();

  const items = useMemo(() => data?.content ?? [], [data]);
  const inventoryById = useMemo(
    () => new Map((inventoryPage?.content ?? []).map((i) => [i.id, i])),
    [inventoryPage]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [doingAll, setDoingAll] = useState(true);

  const isSelected = (id: string) =>
    doingAll || selected.has(id);

  const toggle = (id: string) => {
    if (doingAll) {
      setDoingAll(false);
      setSelected(new Set(items.filter((i) => i.id !== id).map((i) => i.id)));
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAll = (value: boolean) => {
    setDoingAll(value);
    if (!value) setSelected(new Set());
  };
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndex = items.length ? Math.min(selectedIndex, items.length - 1) : 0;

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-inv-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const doExport = () => {
    const chosen = items.filter((i) => isSelected(i.id));
    if (!chosen.length) {
      toast.error("Select at least one product");
      return;
    }
    const exported = exportProductsCsv(chosen);
    void logDataJob({
      operation: "EXPORT",
      module: "PRODUCT",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: chosen.length,
      successRows: chosen.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
    });
    toast.success("Products CSV exported");
  };

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/gateway?menu=product");
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((c) => Math.min(c + 1, items.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((c) => Math.max(c - 1, 0));
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        const item = items[activeIndex];
        if (item) toggle(item.id);
        return;
      }
      if (event.key.toLowerCase() === "a" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setAll(!doingAll);
        return;
      }
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        event.stopImmediatePropagation();
        playUiSound("post");
        doExport();
        return;
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        router.push("/gateway?menu=product");
        return;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [items, selected, activeIndex]);

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold text-[#0F172A]">Product Export</div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">
          Factory1 · Products
        </div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">
          Ctrl + M
        </div>
      </div>

      <div className="flex h-[calc(100%-7rem)] min-h-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2 text-sm">
          <span className="font-bold">
            List of Products ({items.length} found)
          </span>
          <button
            type="button"
            onClick={() => setAll(!doingAll)}
            className="tally-checkbox"
          >
            {doingAll ? "[X]" : "[ ]"} All Items
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#C8E6C9]">
              <tr className="border-b border-[#0F766E] text-left">
                <th className="w-12 px-2 py-1">Select</th>
                <th className="w-12 px-2 py-1">S.No.</th>
                <th className="px-2 py-1">Code</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Finished Good</th>
                <th className="px-2 py-1">Unit</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: Product, index) => {
                const isSel = isSelected(item.id);
                const rowActive = index === activeIndex;
                return (
                  <tr
                    key={item.id}
                    data-inv-index={index}
                    onClick={() => {
                      setSelectedIndex(index);
                      toggle(item.id);
                    }}
                    className={[
                      "cursor-pointer border-b border-[#94A3B8]/40",
                      rowActive && !isSel ? "bg-[#6366F1]/15" : "",
                      isSel ? "bg-[#0F172A] text-white" : "",
                    ].join(" ")}
                  >
                    <td className="px-2 py-0.5 text-center">
                      <span className="tally-checkbox">{isSel ? "[X]" : "[ ]"}</span>
                    </td>
                    <td className="px-2 py-0.5 text-center">{index + 1}</td>
                    <td className="px-2 py-0.5">{item.productCode}</td>
                    <td className="px-2 py-0.5">{item.name}</td>
                    <td className="px-2 py-0.5">
                      {inventoryById.get(item.finishedGoodInventoryItemId)
                        ? `${
                            inventoryById.get(item.finishedGoodInventoryItemId)!.itemCode
                          } - ${inventoryById.get(item.finishedGoodInventoryItemId)!.name}`
                        : item.finishedGoodInventoryItemId}
                    </td>
                    <td className="px-2 py-0.5">{item.unit}</td>
                    <td className="px-2 py-0.5">
                      {item.active ? "Active" : "Inactive"}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-8 text-center text-slate-500"
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => setAll(!doingAll)}
        >
          A: All
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white"
          onClick={() => {
            playUiSound("post");
            doExport();
          }}
        >
          E: Export
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          Space: Select
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/gateway?menu=product")}
        >
          O: Close
        </button>
      </div>
    </div>
  );
}
