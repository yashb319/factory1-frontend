export type DataJobOperation = "IMPORT" | "EXPORT";

export type DataJobModule =
  | "EMPLOYEE"
  | "ATTENDANCE"
  | "PAYROLL"
  | "INVENTORY"
  | "SUPPLIER"
  | "CUSTOMER"
  | "BILLING";

export type DataJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export interface DataJob {
  id: string;
  operation: DataJobOperation;
  module: DataJobModule;
  fileName: string;
  status: DataJobStatus;
  progress: number;
  totalRows?: number;
  successRows?: number;
  failedRows?: number;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  errorFileUrl?: string;
  outputFileUrl?: string;
}