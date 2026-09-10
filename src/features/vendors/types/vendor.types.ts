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

export type VendorServiceType =
  | "OUTSOURCED_MANUFACTURING"
  | "QUALITY_INSPECTION"
  | "LOGISTICS"
  | "PACKAGING"
  | "OTHER";

export type Vendor = {
  id: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  serviceType?: VendorServiceType | string | null;
  active: boolean;
};

export type VendorRequest = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  serviceType?: string;
  active: boolean;
};

export type VendorSearchParams = {
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
};

export type VendorDashboard = {
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  vendorsMissingContact: number;
};

export type VendorAiInsight = {
  type: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | string;
};
