"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceListParams } from "../types/attendance.types";

interface Props {
  filters: AttendanceListParams;
  onChange: (filters: Partial<AttendanceListParams>) => void;
}

export function AttendanceFilters({ filters, onChange }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Input
  type="date"
  value={filters.fromDate ?? ""}
  onChange={(e) => onChange({ fromDate: e.target.value })}
/>

<Input
  type="date"
  value={filters.toDate ?? ""}
  onChange={(e) => onChange({ toDate: e.target.value })}
/>

        <Select
          value={filters.status ?? "ALL"}
          onValueChange={(value) => onChange({ status: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
            <SelectItem value="HALF_DAY">Half Day</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
            <SelectItem value="PAID_LEAVE">Paid Leave</SelectItem>
            <SelectItem value="UNPAID_LEAVE">Unpaid Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}