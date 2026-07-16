"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useGetInventoryItemsQuery } from "../api/inventoryApi";
import { exportInventoryCsv } from "../utils/inventoryExport";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { InventoryBulkImportDialog } from "./InventoryBulkImportDialog";

export function InventoryTallyImportExportView() {
  const router = useRouter();
  const { data } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
    sortBy: "name",
    sortDirection: "ASC",
  });
  const logDataJob = useLogDataJob();
  const [importOpen, setImportOpen] = useState(false);

  const items = useMemo(() => data?.content ?? [], [data]);

  const handleExport = () => {
    if (!items.length) {
      toast.info("No inventory items to export");
      return;
    }
    try {
      const exported = exportInventoryCsv(items);
      void logDataJob({
        operation: "EXPORT",
        module: "INVENTORY",
        fileName: exported.fileName,
        status: "COMPLETED",
        progress: 100,
        totalRows: items.length,
        successRows: items.length,
        failedRows: 0,
        outputFileUrl: exported.outputFileUrl,
      });
      toast.success("Inventory CSV exported successfully");
    } catch {
      toast.error("Failed to export inventory CSV");
    }
  };

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("role") === "combobox"
      ) {
        return;
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        setImportOpen(true);
        return;
      }
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        handleExport();
        return;
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        router.push("/gateway");
        return;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router, handleExport]);

  const actions = [
    { key: "I", label: "Import Inventory", onClick: () => setImportOpen(true) },
    { key: "E", label: "Export Inventory", onClick: handleExport },
  ];

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold text-[#0F172A]">Inventory</div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">
          Import / Export
        </div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">
          Ctrl + M
        </div>
      </div>

      <div className="flex h-[calc(100%-7rem)] min-h-0 items-start justify-center overflow-hidden p-4">
        <div className="w-full max-w-2xl border border-[#0F766E] bg-[#D9F99D]/40">
          <div className="border-b border-[#0F766E] bg-[#0F172A] px-3 py-1 text-center font-bold text-white">
            Inventory Import / Export
          </div>
          <div className="grid gap-y-1 p-4">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className="grid w-full grid-cols-[48px_1fr] gap-2 px-3 py-1 text-left outline-none hover:bg-[#6366F1] hover:text-white"
              >
                <span className="font-bold text-[#EF4444]">{action.key}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/tally/inventory")}
        >
          Q: Back
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          I: Import
        </span>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          E: Export
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/gateway")}
        >
          O: Close
        </button>
      </div>

      <InventoryBulkImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
