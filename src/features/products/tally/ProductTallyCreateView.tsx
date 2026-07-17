"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter } from "next/navigation";
import { useCreateProductMutation } from "../api/productsApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import { productFields } from "./ProductTallyListView";

export function ProductTallyCreateView() {
  const router = useRouter();
  const [createProduct, createState] = useCreateProductMutation();
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
    itemType: "FINISHED_GOOD",
    status: "ACTIVE",
  });

  const finishedGoodOptions = useMemo(
    () =>
      (inventoryPage?.content ?? []).map((item) => ({
        value: item.id,
        label: `${item.itemCode} - ${item.name}`,
      })),
    [inventoryPage]
  );

  const [formDraft, setFormDraft] = useState<Record<string, unknown>>({
    name: "",
    description: "",
    finishedGoodInventoryItemId: "",
    unit: "PCS",
    active: "true",
  });
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fieldRefs.current[0]?.focus();
  }, []);

  const submitCreate = async () => {
    for (const f of productFields) {
      if (f.required && !formDraft[f.key as string] && formDraft[f.key as string] !== 0) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    try {
      await createProduct({
        name: String(formDraft.name ?? ""),
        description: formDraft.description ? String(formDraft.description) : undefined,
        finishedGoodInventoryItemId: String(formDraft.finishedGoodInventoryItemId ?? ""),
        unit: formDraft.unit ? String(formDraft.unit) : undefined,
        active: formDraft.active === "true" || formDraft.active === true,
      }).unwrap();
      toast.success("Product created");
      router.push("/tally/product");
    } catch {
      toast.error("Could not create product");
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
        submitCreate();
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
  }, [formDraft, editMode]);

  const renderField = (field: (typeof productFields)[number], index: number) => {
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
          onChange={(e) => {
            const next = { ...formDraft, [field.key as string]: e.target.value };
            if (field.key === "finishedGoodInventoryItemId") {
              const selected = inventoryPage?.content.find(
                (i) => i.id === e.target.value
              );
              if (selected && !formDraft.name) {
                next.name = selected.name;
                if (selected.unit && !formDraft.unit) {
                  next.unit = selected.unit;
                }
              }
            }
            setFormDraft(next);
          }}
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

  return (
    <div className="tally-entry-screen" data-tally-nav-scope>
      <div className="tally-entry-title">
        <span>Product Creation</span>
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
          onClick={() => router.push("/tally/product")}
        >
          Q: Back
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={createState.isLoading}
          onClick={() => {
            playUiSound("post");
            submitCreate();
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
