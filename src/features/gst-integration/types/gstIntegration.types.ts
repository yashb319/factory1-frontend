export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type EwayProvider = "NIC_DIRECT" | "GSP_SANDBOX" | "GSP_PRODUCTION";
export type EwayEnvironment = "SANDBOX" | "PRODUCTION";
export type GstIntegrationStatus = "NOT_CONFIGURED" | "ACTIVE" | "FAILED" | "DISABLED";

export type GstIntegrationCredential = {
  id: string;
  gstin: string;
  legalName?: string | null;
  tradeName?: string | null;
  registeredAddress?: string | null;
  stateCode?: number | null;
  provider: EwayProvider;
  environment: EwayEnvironment;
  maskedApiUsername: string;
  connectionStatus: GstIntegrationStatus;
  lastVerifiedAt?: string | null;
  lastErrorMessage?: string | null;
  active: boolean;
};

export type GstIntegrationCredentialRequest = {
  gstin: string;
  legalName?: string;
  tradeName?: string;
  registeredAddress?: string;
  stateCode?: number;
  provider: EwayProvider;
  environment: EwayEnvironment;
  apiUsername: string;
  apiPassword: string;
  active: boolean;
};

export type InwardEwayBill = {
  id: string;
  ewayBillNumber: string;
  generatedDate?: string | null;
  validUntil?: string | null;
  supplierName?: string | null;
  supplierGstin?: string | null;
  documentNumber?: string | null;
  documentDate?: string | null;
  invoiceValue?: number | null;
  vehicleNumber?: string | null;
  status?: string | null;
  acknowledgementStatus?: string | null;
  lastSyncedAt?: string | null;
};

export type EwayBillApiResponse = {
  configured: boolean;
  success: boolean;
  action: string;
  message: string;
  data?: unknown;
  errorCodes?: string | null;
  alert?: string | null;
};
