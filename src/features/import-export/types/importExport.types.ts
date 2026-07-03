export type DataJobOperation = "IMPORT" | "EXPORT";

export type DataJobModule =
  | "EMPLOYEE"
  | "ATTENDANCE"
  | "PAYROLL"
  | "INVENTORY"
  | "SUPPLIER"
  | "CUSTOMER"
  | "PRODUCT"
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
  notes?: string;
}

export type DataJobRequest = {
  operation: DataJobOperation;
  module: DataJobModule;
  fileName: string;
  status?: DataJobStatus;
  progress?: number;
  totalRows?: number;
  successRows?: number;
  failedRows?: number;
  errorFileUrl?: string;
  outputFileUrl?: string;
  notes?: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};
