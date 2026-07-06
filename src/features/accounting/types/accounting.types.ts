import type { BillType, GstReport } from "@/features/billing/types/billing.types";

export type LedgerPartySummary = {
  partyName: string;
  partyGstNumber?: string | null;
  type: BillType;
  billCount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
};

export type LedgerReport = {
  fromDate: string;
  toDate: string;
  totalReceivables: number;
  totalPayables: number;
  netReceivable: number;
  parties: LedgerPartySummary[];
};

export type AccountingRange = {
  fromDate: string;
  toDate: string;
};

export type { GstReport };
