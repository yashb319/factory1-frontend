import { store } from "@/lib/store";
import { accountingApi } from "@/features/accounting/api/accountingApi";
import { exportLedgerCsv } from "@/features/accounting/utils/ledgerExport";
import { saveFile } from "./localExportFiles";
import { getImportTemplateCsv, templateBaseName } from "./importTemplates";
import { toCsv } from "./csv";
import type { DataJob } from "../types/importExport.types";

type Regenerator = (params: Record<string, unknown>) => Promise<void>;

type StoredErrorRow = {
  rowNumber: number;
  data: Record<string, unknown>;
  messages: string[];
};

// Regenerators are keyed by a `reportType`. Exports that share a module (e.g.
// several accounting reports under BILLING) stay distinct. Imports use
// IMPORT_TEMPLATE / IMPORT_ERROR_REPORT / IMPORT_DATA, all driven by the
// `parameters` stored on the job so no actual file content is kept server-side.
const registry: Record<string, Regenerator> = {
  LEDGER_REPORT: async (params) => {
    const range = {
      fromDate: String(params.fromDate),
      toDate: String(params.toDate),
    };

    const result = await store.dispatch(
      accountingApi.endpoints.getLedgerReport.initiate(range)
    );

    if ("data" in result && result.data) {
      exportLedgerCsv(result.data);
    } else {
      throw new Error("Could not fetch ledger report");
    }
  },
  IMPORT_TEMPLATE: async (params) => {
    const moduleName = String(params.module ?? "");
    const template = getImportTemplateCsv(moduleName);

    if (!template) {
      throw new Error(`No template available for module ${moduleName}`);
    }

    await saveFile({
      fileName: template.fileName,
      content: template.content,
    });
  },
  IMPORT_ERROR_REPORT: async (params) => {
    const moduleName = String(params.module ?? "");
    const headers = (params.headers as string[]) ?? [];
    const errorRows = (params.errorRows as StoredErrorRow[]) ?? [];

    if (!headers.length || !errorRows.length) {
      throw new Error("No error rows to download");
    }

    const content = toCsv([
      ["Row", ...headers, "Errors"],
      ...errorRows.map((row) => [
        row.rowNumber,
        ...headers.map((h) => (row.data?.[h] ?? "") as string | number),
        row.messages.join("; "),
      ]),
    ]);

    await saveFile({
      fileName: `${templateBaseName(moduleName)}-import-errors.csv`,
      content,
    });
  },
  IMPORT_DATA: async (params) => {
    const moduleName = String(params.module ?? "");
    const headers = (params.headers as string[]) ?? [];
    const validRows = (params.validRows as Array<Record<string, unknown>>) ?? [];

    if (!headers.length || !validRows.length) {
      throw new Error("No imported data to download");
    }

    const content = toCsv([
      headers,
      ...validRows.map((row) =>
        headers.map((h) => (row[h] ?? "") as string | number)
      ),
    ]);

    await saveFile({
      fileName: `${templateBaseName(moduleName)}-imported-data.csv`,
      content,
    });
  },
};

export async function regenerateJob(
  job: DataJob,
  reportType: string
): Promise<boolean> {
  if (!job.parameters) return false;

  const regenerator = registry[reportType];
  if (!regenerator) return false;

  await regenerator(job.parameters);
  return true;
}
