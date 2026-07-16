"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";

export type TallyMasterColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
};

export type TallyMasterField = {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "select" | "checkbox" | "date" | "textarea";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
};

export type TallyMasterListProps<T extends { id: string }> = {
  title: string;
  subtitle?: string;
  items: T[];
  columns: TallyMasterColumn<T>[];
  fields: TallyMasterField[];
  isFetching: boolean;
  onSelectItem: (item: T) => void;
  onCreateItem: (data: Record<string, unknown>) => Promise<unknown>;
  onUpdateItem: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  onDeleteItem: (id: string) => Promise<unknown>;
  isCreating: boolean;
  isUpdating: boolean;
  onBack: () => void;
  getItemName?: (item: T) => string;
  initialScreen?: "list" | "create" | "alter";
};

export function TallyMasterList<T extends { id: string }>({
  title,
  subtitle,
  items,
  columns,
  fields,
  isFetching,
  onSelectItem,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  isCreating,
  isUpdating,
  onBack,
  getItemName,
  initialScreen = "list",
}: TallyMasterListProps<T>) {
  const [screen, setScreen] = useState<"list" | "create" | "alter">(initialScreen);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [showQuitPrompt, setShowQuitPrompt] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [formDraft, setFormDraft] = useState<Record<string, unknown>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => items, [items]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-item-index="${selectedIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const openCreate = () => {
    setEditingItem(null);
    const draft: Record<string, unknown> = {};
    fields.forEach((f) => {
      draft[f.key] = f.type === "checkbox" ? false : "";
    });
    setFormDraft(draft);
    setScreen("create");
  };

  const openAlter = (item: T) => {
    setEditingItem(item);
    const draft: Record<string, unknown> = {};
    fields.forEach((f) => {
      const value = (item as Record<string, unknown>)[f.key];
      draft[f.key] = value ?? (f.type === "checkbox" ? false : "");
    });
    setFormDraft(draft);
    setScreen("alter");
  };

  const submitCreate = async () => {
    for (const f of fields) {
      if (f.required && !formDraft[f.key] && formDraft[f.key] !== false) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    try {
      await onCreateItem(formDraft);
      toast.success(`${title.replace(/s$/, "")} created`);
      setScreen("list");
    } catch {
      toast.error(`Could not create ${title.toLowerCase().replace(/s$/, "")}`);
    }
  };

  const submitAlter = async () => {
    if (!editingItem) return;
    for (const f of fields) {
      if (f.required && !formDraft[f.key] && formDraft[f.key] !== false) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    try {
      await onUpdateItem(editingItem.id, formDraft);
      toast.success(`${title.replace(/s$/, "")} altered`);
      setScreen("list");
    } catch {
      toast.error(`Could not alter ${title.toLowerCase().replace(/s$/, "")}`);
    }
  };

  const confirmDelete = async () => {
    if (!editingItem) return;
    try {
      await onDeleteItem(editingItem.id);
      toast.success(`${title.replace(/s$/, "")} deleted`);
      setShowDeletePrompt(false);
      setScreen("list");
    } catch {
      toast.error(`Could not delete ${title.toLowerCase().replace(/s$/, "")}`);
    }
  };

  const getName = getItemName ?? ((item: T) => (item as Record<string, unknown>).name as string ?? "---");

  const topActions = [
    { key: "Ctrl+L", label: "Licence", enabled: false },
    { key: "Alt+E", label: "Export", enabled: false },
    { key: "Alt+G", label: "Go To", enabled: false },
    { key: "F4", label: "Contra", enabled: false },
    { key: "F5", label: "Payment", enabled: false },
    { key: "F6", label: "Receipt", enabled: false },
    { key: "F7", label: "Journal", enabled: false },
    { key: "F8", label: "Sales", enabled: false },
    { key: "F9", label: "Purchase", enabled: false },
    { key: "F12", label: "Configure", enabled: false },
  ];

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("role") === "combobox"
      ) {
        if (event.key === "Escape" && screen !== "list") {
          event.preventDefault();
          setScreen("list");
          return;
        }
        return;
      }

      if (showQuitPrompt) {
        if (event.key === "Escape" || event.key.toLowerCase() === "n") {
          event.preventDefault();
          setShowQuitPrompt(false);
          return;
        }
        if (event.key === "Enter" || event.key.toLowerCase() === "y") {
          event.preventDefault();
          onBack();
          return;
        }
        return;
      }

      if (showDeletePrompt) {
        if (event.key === "Escape" || event.key.toLowerCase() === "n") {
          event.preventDefault();
          setShowDeletePrompt(false);
          return;
        }
        if (event.key === "Enter" || event.key.toLowerCase() === "y") {
          event.preventDefault();
          confirmDelete();
          return;
        }
        return;
      }

      if (screen === "create" || screen === "alter") {
        if (event.key === "Escape") {
          event.preventDefault();
          setScreen("list");
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
          event.preventDefault();
          if (screen === "create") submitCreate();
          else submitAlter();
          return;
        }
        return;
      }

      if (screen === "list") {
        if (event.key === "Escape") {
          event.preventDefault();
          setShowQuitPrompt(true);
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((c) => Math.min(c + 1, sorted.length - 1));
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
          setSelectedIndex(Math.max(sorted.length - 1, 0));
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          const item = sorted[selectedIndex];
          if (item) openAlter(item);
          return;
        }

        if (event.key.toLowerCase() === "n") {
          event.preventDefault();
          openCreate();
          return;
        }

        if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          const item = sorted[selectedIndex];
          if (item) {
            setEditingItem(item);
            setShowDeletePrompt(true);
          }
          return;
        }

        if (event.key.toLowerCase() === "o") {
          event.preventDefault();
          onBack();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    screen,
    selectedIndex,
    sorted,
    onBack,
    editingItem,
    formDraft,
    showQuitPrompt,
    showDeletePrompt,
  ]);

  if (screen === "create" || screen === "alter") {
    return (
      <div className="tally-entry-screen" data-tally-nav-scope>
        <div className="tally-entry-title">
          <span>
            {screen === "create"
              ? `${title.replace(/s$/, "")} Creation`
              : `${title.replace(/s$/, "")} Alteration`}
          </span>
          <span>Factory1</span>
          <span>Ctrl + M</span>
        </div>

        <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
          <div className="mx-auto grid w-full max-w-lg gap-y-3">
            {fields.map((field) => (
              <label
                key={field.key}
                className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3"
              >
                <span className="tally-company-label px-1 font-bold">
                  {field.label}
                </span>
                {field.type === "select" ? (
                  <select
                    value={(formDraft[field.key] as string) ?? ""}
                    onChange={(e) =>
                      setFormDraft((c) => ({ ...c, [field.key]: e.target.value }))
                    }
                    className="tally-select h-6 w-full"
                  >
                    <option value="">---</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(formDraft[field.key])}
                    onChange={(e) =>
                      setFormDraft((c) => ({ ...c, [field.key]: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                ) : field.type === "textarea" ? (
                  <textarea
                    value={(formDraft[field.key] as string) ?? ""}
                    onChange={(e) =>
                      setFormDraft((c) => ({ ...c, [field.key]: e.target.value }))
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-20 w-full border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    autoFocus={field.autoFocus}
                    type={field.type ?? "text"}
                    value={(formDraft[field.key] as string) ?? ""}
                    onChange={(e) =>
                      setFormDraft((c) => ({ ...c, [field.key]: e.target.value }))
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
                    placeholder={field.placeholder}
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
            onClick={() => setScreen("list")}
          >
            Q: Back
          </button>
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating || isUpdating}
            onClick={() => {
              playUiSound("post");
              if (screen === "create") submitCreate();
              else submitAlter();
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
      <div className="grid min-h-7 grid-cols-2 border-b border-[#0F766E] bg-[#C8E6C9] text-xs sm:grid-cols-4 lg:grid-cols-8">
        {topActions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={!action.enabled}
            className={[
              "border-r border-[#0F766E] px-2 py-1 text-left",
              action.enabled
                ? "hover:bg-[#6366F1] hover:text-white"
                : "cursor-not-allowed text-slate-500 opacity-60",
            ].join(" ")}
            title={action.label}
          >
            <span
              className={[
                "font-bold",
                action.enabled ? "text-[#EF4444]" : "text-slate-500",
              ].join(" ")}
            >
              {action.key}
            </span>
            <span>: {action.label}</span>
          </button>
        ))}
      </div>

      <div className="flex h-[calc(100%-7rem)] min-h-0 flex-col overflow-hidden">
        <div className="border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2">
          <div className="text-center text-sm font-bold">{title}</div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-normal text-slate-600">{subtitle}</span>
            <span className="text-slate-600">
              {sorted.length} item{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#C8E6C9]">
              <tr className="border-b border-[#0F766E] text-left">
                <th className="w-12 px-2 py-1">S.No.</th>
                {columns.map((col) => (
                  <th key={col.key} className={`px-2 py-1 ${col.className ?? ""}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <tr
                    key={item.id}
                    data-item-index={index}
                    onClick={() => {
                      setSelectedIndex(index);
                      openAlter(item);
                    }}
                    className={[
                      "cursor-pointer border-b border-[#94A3B8]/40",
                      isSelected
                        ? "bg-[#0F172A] text-white"
                        : "hover:bg-[#6366F1]/10",
                    ].join(" ")}
                  >
                    <td className="px-2 py-0.5 text-center">{index + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key} className={`px-2 py-0.5 ${col.className ?? ""}`}>
                        {col.render
                          ? col.render(item, index)
                          : String((item as Record<string, unknown>)[col.key] ?? "---")}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-2 py-8 text-center text-slate-500"
                  >
                    {isFetching
                      ? "Loading..."
                      : `No items found. Press N to create one.`}
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
          onClick={openCreate}
        >
          N: Create
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => {
            const item = sorted[selectedIndex];
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
          onClick={onBack}
        >
          O: Close
        </button>
      </div>

      {showQuitPrompt && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <div className="w-72 border-2 border-[#0F766E] bg-[#FEFCE8] shadow-lg">
            <div className="bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
              Quit?
            </div>
            <div className="space-y-3 px-5 py-4 text-center">
              <div className="font-bold">Yes or No</div>
              <div className="text-[11px] text-slate-600">
                Press Enter or &apos;Y&apos; to confirm, Escape or &apos;N&apos; to cancel.
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <button
                  type="button"
                  autoFocus
                  className="border border-[#0F766E] bg-[#0F172A] px-3 py-1 font-bold text-white"
                  onClick={onBack}
                >
                  Y: Yes
                </button>
                <button
                  type="button"
                  className="border border-[#0F766E] px-3 py-1 hover:bg-[#6366F1] hover:text-white"
                  onClick={() => setShowQuitPrompt(false)}
                >
                  N: No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeletePrompt && editingItem && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <div className="w-72 border-2 border-[#0F766E] bg-[#FEFCE8] shadow-lg">
            <div className="bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
              Delete?
            </div>
            <div className="space-y-3 px-5 py-4 text-center">
              <div className="font-bold">Yes or No</div>
              <div className="text-[11px] text-slate-600">
                Delete &quot;{getName(editingItem)}&quot;?
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
                  onClick={() => setShowDeletePrompt(false)}
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
