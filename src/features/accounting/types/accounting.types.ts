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

export type TrialBalanceRow = {
  ledgerId: string;
  ledgerName: string;
  groupName?: string | null;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
};

export type TrialBalance = {
  fromDate: string;
  toDate: string;
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  rows: TrialBalanceRow[];
};

export type ProfitLossRow = {
  ledgerId: string;
  ledgerName: string;
  groupName?: string | null;
  section: string;
  amount: number;
};

export type ProfitLoss = {
  fromDate: string;
  toDate: string;
  tradingIncome: number;
  tradingExpense: number;
  grossProfit: number;
  indirectIncome: number;
  indirectExpense: number;
  netProfit: number;
  rows: ProfitLossRow[];
};

export type BalanceSheetRow = {
  ledgerId?: string | null;
  ledgerName: string;
  groupName?: string | null;
  amount: number;
};

export type BalanceSheet = {
  fromDate: string;
  toDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netProfit: number;
  difference: number;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
};

export type AgingReportType = "SALES" | "PURCHASE";

export type AgingRow = {
  billId: string;
  billNumber: string;
  partyName: string;
  partyGstNumber?: string | null;
  billDate: string;
  dueDate?: string | null;
  daysOverdue: number;
  bucket: string;
  outstandingAmount: number;
};

export type AgingReport = {
  asOfDate: string;
  type: AgingReportType;
  currentAmount: number;
  days1To30Amount: number;
  days31To60Amount: number;
  days61To90Amount: number;
  over90Amount: number;
  totalOutstanding: number;
  rows: AgingRow[];
};

export type AgingReportRequest = {
  type: AgingReportType;
  asOfDate: string;
};

export type AccountingRange = {
  fromDate: string;
  toDate: string;
};

export type AccountGroupType = "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";

export type BalanceType = "DR" | "CR";

export type VoucherType =
  | "PAYMENT"
  | "RECEIPT"
  | "CONTRA"
  | "JOURNAL"
  | "DEBIT_NOTE"
  | "CREDIT_NOTE";

export type AccountGroup = {
  id: string;
  name: string;
  parentGroupId?: string | null;
  groupType: AccountGroupType;
  systemGroup: boolean;
  affectsGrossProfit: boolean;
  sortOrder: number;
  ledgerCount: number;
};

export type AccountGroupMutationRequest = CreateAccountGroupRequest & {
  id: string;
};

export type AccountLedger = {
  id: string;
  accountGroupId: string;
  groupName?: string | null;
  name: string;
  openingBalance: number;
  balanceType: BalanceType;
  gstNumber?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  systemLedger: boolean;
  active: boolean;
};

export type AccountMasters = {
  groups: AccountGroup[];
  ledgers: AccountLedger[];
};

export type CreateAccountGroupRequest = {
  name: string;
  parentGroupId?: string | null;
  groupType: AccountGroupType;
  affectsGrossProfit: boolean;
};

export type CreateAccountLedgerRequest = {
  name: string;
  accountGroupId: string;
  openingBalance: number;
  balanceType: BalanceType;
  gstNumber?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  billingAddress?: string | null;
};

export type AccountLedgerMutationRequest = CreateAccountLedgerRequest & {
  id: string;
};

export type AccountingVoucherLine = {
  id: string;
  ledgerId: string;
  ledgerName?: string | null;
  entryType: BalanceType;
  amount: number;
  description?: string | null;
};

export type AccountingVoucher = {
  id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  voucherDate: string;
  narration?: string | null;
  totalDebit: number;
  totalCredit: number;
  posted: boolean;
  sourceBillId?: string | null;
  sourceType?: string | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  lines: AccountingVoucherLine[];
};

export type CreateAccountingVoucherRequest = {
  voucherType: VoucherType;
  voucherDate: string;
  narration?: string | null;
  voucherNumber?: string;
  lines: Array<{
    ledgerId: string;
    entryType: BalanceType;
    amount: number;
    description?: string | null;
  }>;
};

export type AccountingVoucherMutationRequest = CreateAccountingVoucherRequest & {
  id: string;
};

export type CancelAccountingVoucherRequest = {
  id: string;
  reason?: string | null;
};

export type AccountingTaxSection = {
  id?: string | null;
  taxType: string;
  sectionCode: string;
  name: string;
  rate: number;
  applicableFor?: string | null;
  active: boolean;
  systemDefault: boolean;
};

export type AccountingTaxSectionRequest = {
  taxType: string;
  sectionCode: string;
  name: string;
  rate: number;
  applicableFor?: string | null;
  active: boolean;
};

export type AccountingTaxSectionMutationRequest =
  AccountingTaxSectionRequest & {
    id: string;
  };

export type { GstReport };
