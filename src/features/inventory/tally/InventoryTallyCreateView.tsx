"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter } from "next/navigation";
import { useCreateInventoryItemMutation } from "../api/inventoryApi";
import type { InventoryItemRequest } from "../types/inventory.types";
import { inventoryFields } from "./InventoryTallyListView";

export function InventoryTallyCreateView() {
  const router = useRouter();
  const [createItem, createItemState] = useCreateInventoryItemMutation();

  const [formDraft, setFormDraft] = useState<Record<string, unknown>>(() => {
    const draft: Record<string, unknown> = {};
    inventoryFields.forEach((f) => {
      draft[f.key as string] = f.key === "status" ? "ACTIVE" : "";
    });
    return draft;
  });
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fieldRefs.current[0]?.focus();
  }, []);

  const handleChange = (key: string, value: unknown) => {
    setFormDraft((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    for (const f of inventoryFields) {
      const value = formDraft[f.key as string];
      if (f.required && !value && value !== 0) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    try {
      await createItem(formDraft as unknown as InventoryItemRequest).unwrap();
      toast.success("Inventory item created");
      router.push("/tally/inventory");
    } catch {
      toast.error("Could not create inventory item");
    }
  };

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (editMode) {
          setEditMode(false);
          return;
        }
        router.push("/tally/inventory");
        return;
      }

      const fields = fieldRefs.current.filter(Boolean) as HTMLElement[];
      const currentIndex = fields.findIndex((el) => el === document.activeElement);

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
        router.push("/tally/inventory");
        return;
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        event.stopImmediatePropagation();
        router.push("/gateway?menu=inventory");
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
  }, [router, submit, editMode]);

  return (
    <div className="tally-entry-screen" data-tally-nav-scope>
      <div className="tally-entry-title">
        <span>Inventory Item Creation</span>
        <span>Factory1</span>
        <span>Ctrl + M</span>
      </div>

      <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
        <div className="mx-auto grid w-full max-w-lg gap-y-3">
          {inventoryFields.map((field, index) => (
            <label
              key={field.key as string}
              className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3"
            >
              <span className="tally-company-label px-1 font-bold">
                {field.label}
              </span>
              {field.type === "select" ? (
                <select
                  ref={(el) => {
                    fieldRefs.current[index] = el;
                  }}
                  value={(formDraft[field.key as string] as string) ?? ""}
                  onChange={(e) => handleChange(field.key as string, e.target.value)}
                  className="tally-select h-6 w-full"
                >
                  <option value="">---</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  ref={(el) => {
                    fieldRefs.current[index] = el;
                  }}
                  value={(formDraft[field.key as string] as string) ?? ""}
                  onChange={(e) => handleChange(field.key as string, e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-20 w-full border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
                />
              ) : (
                <input
                  ref={(el) => {
                    fieldRefs.current[index] = el;
                  }}
                  type={field.type === "number" ? "number" : "text"}
                  value={(formDraft[field.key as string] as string) ?? ""}
                  onChange={(e) => handleChange(field.key as string, e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
                />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/tally/inventory")}
        >
          Q: Back
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={createItemState.isLoading}
          onClick={() => {
            playUiSound("post");
            submit();
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
          onClick={() => router.push("/gateway")}
        >
          O: Close
        </button>
      </div>
    </div>
  );
}
