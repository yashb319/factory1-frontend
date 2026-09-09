export type AllocationPeriod = "MONTHLY" | "YEARLY";
export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface LeaveTypeResponse {
  id: string;
  code: string;
  name: string;
  allocationPeriod: AllocationPeriod;
  allocationDays: number;
  paid: boolean;
  active: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
  expiryMonths: number;
}

export interface LeaveTypeRequest {
  code: string;
  name: string;
  allocationPeriod: AllocationPeriod;
  allocationDays: number;
  paid: boolean;
  active: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
  expiryMonths: number;
}

export interface LeaveBalanceResponse {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  balanceYear: number;
  allocatedDays: number;
  carryForwardDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
}

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  approverId?: string | null;
  decisionAt?: string | null;
  decisionComment?: string | null;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveListParams {
  page?: number;
  size?: number;
}
