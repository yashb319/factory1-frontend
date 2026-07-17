"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter } from "next/navigation";
import {
  useDeleteProductMutation,
  useGetProductsQuery,
  useUpdateProductMutation,
} from "../api/productsApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import type { Product, ProductRequest } from "../types/product.types";

type Screen = "list" | "alter" | "delete";

const UNIT_OPTIONS = [
  { value: "PCS", label: "PCS" },
  { value: "KG", label: "KG" },
  { value: "METER", label: "Meter" },
  { value: "BOX", label: "Box" },
];

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

type FieldDef = {
  key: keyof Product | string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  dynamic?: "finishedGood";
};

export const productFields: FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea" },
  {
    key: "finishedGoodInventoryItemId",
    label: "Finished Good Item",
    type: "select",
    required: true,
    dynamic: "finishedGood",
  },
  { key: "unit", label: "Unit", type: "select", required: true, options: UNIT_OPTIONS },
  { key: "active", label: "Status", type: "select", options: STATUS_OPTIONS },
];

export function ProductTallyListView() {
  const router = useRouter();
  const { data, isLoading } = useGetProductsQuery({ page: 0, size: 300 });
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
    itemType: "FINISHED_GOOD",
    status: "ACTIVE",
  });

  const [updateProduct, updateProductState] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const items = useMemo(() => data?.content ?? [], [data]);
  const finishedGoodOptions = useMemo(
    () =>
      (inventoryPage?.content ?? []).map((item) => ({
        value: item.id,
        label: `${item.itemCode} - ${item.name}`,
      })),
    [inventoryPage]
  );

  const [screen, setScreen] = useState<Screen>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [formDraft, setFormDraft] = useState<Record<string, unknown>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);
  const [editMode, setEditMode] = useState(false);
  const activeIndex = items.length ? Math.min(selectedIndex, items.length - 1) : 0;

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-inv-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (screen === "alter") {
      fieldRefs.current[0]?.focus();
    }
  }, [screen]);

  const openAlter = (item: Product) => {
    const draft: Record<string, unknown> = {};
    productFields.forEach((f) => {
      const value = (item as Record<string, unknown>)[f.key as string];
      draft[f.key as string] = value ?? (f.type === "select" ? "true" : "");
    });
    setEditingItem(item);
    setFormDraft(draft);
    setEditMode(false);
    setScreen("alter");
  };

  const submitAlter = async () => {
    if (!editingItem) return;
    for (const f of productFields) {
      if (f.required && !formDraft[f.key as string] && formDraft[f.key as string] !== 0) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    try {
      const body: ProductRequest = {
        name: String(formDraft.name ?? ""),
        description: formDraft.description ? String(formDraft.description) : undefined,
        finishedGoodInventoryItemId: String(formDraft.finishedGoodInventoryItemId ?? ""),
        unit: formDraft.unit ? String(formDraft.unit) : undefined,
        active: formDraft.active === "true" || formDraft.active === true,
      };
      await updateProduct({ id: editingItem.id, body }).unwrap();
      toast.success("Product altered");
      setScreen("list");
    } catch {
      toast.error("Could not alter product");
    }
  };

  const confirmDelete = async () => {
    if (!editingItem) return;
    try {
      await deleteProduct(editingItem.id).unwrap();
      toast.success("Product deleted");
      setShowDelete(false);
      setScreen("list");
    } catch {
      toast.error("Could not delete product");
    }
  };

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (showDelete) {
        if (event.key === "Escape" || event.key.toLowerCase() === "n") {
          event.preventDefault();
          setShowDelete(false);
          return;
        }
        if (event.key === "Enter" || event.key.toLowerCase() === "y") {
          event.preventDefault();
          confirmDelete();
          return;
        }
        return;
      }

      if (screen === "alter") {
        const fields = fieldRefs.current.filter(Boolean) as HTMLElement[];
        const currentIndex = fields.findIndex((el) => el === document.activeElement);

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (editMode) {
            setEditMode(false);
            return;
          }
          setScreen("list");
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
          submitAlter();
          return;
        }
        if (event.key.toLowerCase() === "q") {
          event.preventDefault();
          event.stopImmediatePropagation();
          setScreen("list");
          return;
        }
        if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (editingItem) setShowDelete(true);
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
        return;
      }

      if (screen === "list") {
        if (event.key === "Escape") {
          event.preventDefault();
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
        if (event.key === "Home") {
          event.preventDefault();
          setSelectedIndex(0);
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          setSelectedIndex(Math.max(items.length - 1, 0));
          return;
        }
        if (event.key.toLowerCase() === "n") {
          event.preventDefault();
          router.push("/tally/product/create");
          return;
        }
        if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          const item = items[activeIndex];
          if (item) {
            setEditingItem(item);
            setShowDelete(true);
          }
          return;
        }
        if (event.key.toLowerCase() === "o") {
          event.preventDefault();
          router.push("/gateway");
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const item = items[activeIndex];
          if (item) openAlter(item);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, selectedIndex, items, showDelete, editingItem, formDraft, editMode]);

  const renderField = (field: FieldDef, index: number) => {
    const value = (formDraft[field.key as string] as string) ?? "";
    const options = field.dynamic === "finishedGood" ? finishedGoodOptions : field.options;
    const commonRef = (el: HTMLElement | null) => {
      fieldRefs.current[index] = el;
    };

    if (field.type === "select") {
      return (
        <select
          ref={commonRef}
          value={value}
          onChange={(e) =>
            setFormDraft((c) => ({ ...c, [field.key as string]: e.target.value }))
          }
          className="tally-select h-6 w-full"
        >
          <option value="">---</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          ref={commonRef}
          value={value}
          onChange={(e) =>
            setFormDraft((c) => ({ ...c, [field.key as string]: e.target.value }))
          }
          onFocus={(e) => e.currentTarget.select()}
          className="h-20 w-full border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
        />
      );
    }

    return (
      <input
        ref={commonRef}
        type={field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) =>
          setFormDraft((c) => ({ ...c, [field.key as string]: e.target.value }))
        }
        onFocus={(e) => e.currentTarget.select()}
        className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
      />
    );
  };

  if (screen === "alter") {
    return (
      <div className="tally-entry-screen" data-tally-nav-scope>
        <div className="tally-entry-title">
          <span>Product Alteration</span>
          <span>Factory1</span>
          <span>Ctrl + M</span>
        </div>

        <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
          <div className="mx-auto grid w-full max-w-lg gap-y-3">
            {productFields.map((field, index) => (
              <label
                key={field.key as string}
                className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3"
              >
                <span className="tally-company-label px-1 font-bold">
                  {field.label}
                </span>
                {renderField(field, index)}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("list")}
          >
            Q: Back
          </button>
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={updateProductState.isLoading}
            onClick={() => {
              playUiSound("post");
              submitAlter();
            }}
          >
            A: Accept
          </button>
          <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
            D: Delete
          </span>
          <button
            type="button"
            className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("list")}
          >
            X: Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold text-[#0F172A]">Product List</div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">
          Factory1 · Products
        </div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">
          Ctrl + M
        </div>
      </div>

      <div className="flex h-[calc(100%-7rem)] min-h-0 flex-col overflow-hidden">
        <div className="border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2 text-center text-sm font-bold">
          List of All Products
        </div>

        <div ref={listRef} className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#C8E6C9]">
              <tr className="border-b border-[#0F766E] text-left">
                <th className="w-12 px-2 py-1">S.No.</th>
                <th className="px-2 py-1">Code</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Finished Good</th>
                <th className="px-2 py-1">Unit</th>
                <th className="px-2 py-1">BOM</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const selected = index === activeIndex;
                return (
                  <tr
                    key={item.id}
                    data-inv-index={index}
                    onClick={() => {
                      setSelectedIndex(index);
                      openAlter(item);
                    }}
                    className={[
                      "cursor-pointer border-b border-[#94A3B8]/40",
                      selected
                        ? "bg-[#0F172A] text-white"
                        : "hover:bg-[#6366F1]/10",
                    ].join(" ")}
                  >
                    <td className="px-2 py-0.5 text-center">{index + 1}</td>
                    <td className="px-2 py-0.5">{item.productCode}</td>
                    <td className="px-2 py-0.5">{item.name}</td>
                    <td className="px-2 py-0.5">
                      {item.finishedGoodInventoryItemId}
                    </td>
                    <td className="px-2 py-0.5">{item.unit}</td>
                    <td className="px-2 py-0.5">
                      {item.hasBom ? "Yes" : "No"}
                    </td>
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
                    {isLoading
                      ? "Loading..."
                      : "No products found. Press N to create one."}
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
          onClick={() => router.push("/tally/product/create")}
        >
          N: Create
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => {
            const item = items[activeIndex];
            if (item) openAlter(item);
          }}
        >
          Enter: Alter
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          D: Delete
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/gateway")}
        >
          O: Close
        </button>
      </div>

      {showDelete && editingItem && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <div className="w-72 border-2 border-[#0F766E] bg-[#FEFCE8] shadow-lg">
            <div className="bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
              Delete?
            </div>
            <div className="space-y-3 px-5 py-4 text-center">
              <div className="font-bold">Yes or No</div>
              <div className="text-[11px] text-slate-600">
                Delete &quot;{editingItem.name}&quot;?
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <button
                  type="button"
                  autoFocus
                  className="border border-[#0F766E] bg-[#0F172A] px-3 py-1 font-bold text-white"
                  onClick={confirmDelete}
                >
                  Y: Yes
                </button>
                <button
                  type="button"
                  className="border border-[#0F766E] px-3 py-1 hover:bg-[#6366F1] hover:text-white"
                  onClick={() => setShowDelete(false)}
                >
                  N: No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
