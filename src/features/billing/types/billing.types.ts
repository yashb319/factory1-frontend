export type BillType = "SALES" | "PURCHASE";
export type BillStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type EwayBillApplicability =
  | "REQUIRED"
  | "NOT_REQUIRED"
  | "OPTIONAL"
  | "REVIEW_REQUIRED";

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

export type BillItemRequest = {
  inventoryItemId?: string;
  productId?: string;
  itemName?: string;
  hsnCode?: string;
  unit?: string;
  quantity: number;
  rate: number;
  discountAmount?: number;
  gstRate?: number;
};

export type BillRequest = {
  type: BillType;
  status?: BillStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  supplierId?: string;
  billNumber?: string;
  billDate: string;
  dueDate?: string;
  placeOfSupply?: string;
  intraState: boolean;
  notes?: string;
  ewayBillNumber?: string;
  ewayBillDate?: string;
  ewayBillValidUntil?: string;
  transporterName?: string;
  vehicleNumber?: string;
  dispatchFrom?: string;
  shipTo?: string;
  movementOfGoods?: boolean;
  ewayBillApplicability?: EwayBillApplicability;
  ewayBillApplicabilityReason?: string;
  ewayBillRequested?: boolean;
  items: BillItemRequest[];
};

export type BillItem = Required<
  Omit<BillItemRequest, "productId" | "inventoryItemId">
> & {
  id: string;
  inventoryItemId: string;
  productId?: string | null;
  itemCode?: string | null;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
};

export type Bill = {
  id: string;
  billNumber: string;
  type: BillType;
  status: BillStatus;
  paymentStatus: PaymentStatus;
  customerId?: string | null;
  supplierId?: string | null;
  partyName: string;
  partyGstNumber?: string | null;
  billingAddress?: string | null;
  billDate: string;
  dueDate?: string | null;
  placeOfSupply?: string | null;
  intraState: boolean;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  notes?: string | null;
  ewayBillNumber?: string | null;
  ewayBillDate?: string | null;
  ewayBillValidUntil?: string | null;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  dispatchFrom?: string | null;
  shipTo?: string | null;
  movementOfGoods?: boolean | null;
  ewayBillApplicability?: EwayBillApplicability | null;
  ewayBillApplicabilityReason?: string | null;
  ewayBillRequested?: boolean | null;
  ewayStatus?: string | null;
  ewayAlert?: string | null;
  ewayLastResponse?: string | null;
  ewayGeneratedAt?: string | null;
  ewayCancelledAt?: string | null;
  items: BillItem[];
};

export type BillNumberSuggestion = {
  billNumber: string;
};

export type BillNumberAvailability = {
  billNumber: string;
  available: boolean;
  message: string;
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

export type EwayPartBRequest = {
  transMode?: string;
  transDocNo?: string;
  transDocDate?: string;
  vehicleNo?: string;
  vehicleType?: string;
  fromPlace?: string;
  fromState?: number;
  reasonCode?: string;
  reasonRemark?: string;
};

export type GstRateSuggestion = {
  hsnCode: string;
  description: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  source: string;
  sourceUrl: string;
};

export type GstReportRow = {
  billNumber: string;
  type: BillType;
  billDate: string;
  partyName: string;
  partyGstNumber?: string | null;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
};

export type GstReport = {
  fromDate: string;
  toDate: string;
  salesTaxableAmount: number;
  salesCgstAmount: number;
  salesSgstAmount: number;
  salesIgstAmount: number;
  purchaseTaxableAmount: number;
  purchaseCgstAmount: number;
  purchaseSgstAmount: number;
  purchaseIgstAmount: number;
  netGstPayable: number;
  rows: GstReportRow[];
};
