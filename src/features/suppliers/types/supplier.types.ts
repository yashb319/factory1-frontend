export type SupplierStatus = "ACTIVE" | "INACTIVE";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type Supplier = {
  id: string;
  supplierCode: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  contactPerson?: string | null;
  paymentTerms?: string | null;
  status: SupplierStatus;
  notes?: string | null;
  dataCompletenessScore: number;
};

export type SupplierRequest = {
  supplierCode: string;
  name: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  contactPerson?: string;
  paymentTerms?: string;
  status?: SupplierStatus;
  notes?: string;
};

export type SupplierSearchParams = {
  search?: string;
  city?: string;
  state?: string;
  status?: SupplierStatus | "";
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
};

export type SupplierDashboard = {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  suppliersMissingGst: number;
  suppliersMissingPhone: number;
  suppliersMissingPaymentTerms: number;
};

export type SupplierAiInsight = {
  type: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | string;
};

export type BulkSupplierRequest = {
  suppliers: SupplierRequest[];
};

export type BulkSupplierImportResponse = {
  successCount: number;
  failedCount: number;
  errors: string[];
};
