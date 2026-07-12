export type CustomerStatus = "ACTIVE" | "INACTIVE";

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

export type Customer = {
  id: string;
  customerCode: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  contactPerson?: string | null;
  paymentTerms?: string | null;
  status: CustomerStatus;
  notes?: string | null;
  dataCompletenessScore: number;
};

export type CustomerRequest = {
  name: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  contactPerson?: string;
  paymentTerms?: string;
  status?: CustomerStatus;
  notes?: string;
};

export type CustomerSearchParams = {
  search?: string;
  city?: string;
  state?: string;
  status?: CustomerStatus | "";
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
};

export type CustomerDashboard = {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  customersMissingGst: number;
  customersMissingPhone: number;
  customersMissingPaymentTerms: number;
};

export type CustomerAiInsight = {
  type: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | string;
};

export type BulkCustomerRequest = {
  customers: CustomerRequest[];
};

export type BulkCustomerImportResponse = {
  successCount: number;
  failedCount: number;
  errors: string[];
};
