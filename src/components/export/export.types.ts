export type ExportFormat = "XLSX" | "CSV";
export type ExportScope = "CURRENT_PAGE" | "FILTERED" | "ALL";

export interface ExportColumn {
  label: string;
  value: string;
  defaultSelected?: boolean;
}