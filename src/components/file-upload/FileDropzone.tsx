"use client";

import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface Props {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  loading?: boolean;
}

export function FileDropzone({
  onFileSelect,
  loading = false,
  accept = {
    "text/csv": [".csv"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
  },
}: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept,
    disabled: loading,
    onDrop: (files) => {
      if (files.length) {
        onFileSelect(files[0]);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/30 hover:border-primary"
      )}
    >
      <input {...getInputProps()} />

      <div className="rounded-full bg-primary/10 p-4">
        <UploadCloud className="h-8 w-8 text-primary" />
      </div>

      <h3 className="mt-4 text-lg font-semibold">
        Drag & Drop CSV or Excel
      </h3>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        or click to browse
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
        <FileSpreadsheet className="h-4 w-4" />
        CSV • XLS • XLSX
      </div>
    </div>
  );
}