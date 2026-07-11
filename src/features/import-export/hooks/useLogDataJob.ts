"use client";

import { useCreateImportExportJobMutation } from "../api/importExportApi";
import type { DataJobRequest } from "../types/importExport.types";

export function useLogDataJob() {
  const [createJob] = useCreateImportExportJobMutation();

  return async (request: DataJobRequest) => {
    try {
      await createJob({
        ...request,
        parameters: request.parameters
          ? JSON.stringify(request.parameters)
          : undefined,
      } as DataJobRequest).unwrap();
    } catch {
      // Export/import should not fail only because history logging failed.
    }
  };
}
