"use client";

import { useState } from "react";
import { CalendarDays, Search } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetAttendanceLeaveStatusQuery, useGetMonthlyAttendanceReportQuery } from "../api/attendanceApi";

export function MonthlyReportPanel() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employeeId, setEmployeeId] = useState("");
  const [statusLookup, setStatusLookup] = useState<{ employeeId: string; date: string } | null>(null);
  const [statusDate, setStatusDate] = useState(now.toISOString().slice(0, 10));
  const { data = [], isLoading, isFetching, isError } = useGetMonthlyAttendanceReportQuery({ month, year });
  const { data: leaveStatus, isFetching: statusLoading } = useGetAttendanceLeaveStatusQuery(
    statusLookup ?? { employeeId: "", date: "" },
    { skip: !statusLookup },
  );

  return (
    <section className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Monthly attendance and leave report</h2>
          <p className="text-xs text-slate-500">Paid and unpaid leave are included in the attendance summary used by payroll.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Input aria-label="Report month" type="number" min={1} max={12} value={month} onChange={(event) => setMonth(Number(event.target.value))} className="w-full sm:w-24" />
          <Input aria-label="Report year" type="number" min={2000} value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-full sm:w-28" />
        </div>
      </div>
      {isError ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Unable to load the monthly attendance report.</p> : null}
      {!isError && isLoading ? <p className="p-6 text-center text-sm text-slate-500">Loading report...</p> : null}
      {!isError && !isLoading && !data.length ? <EmptyState icon={CalendarDays} title="No monthly records" description="There are no attendance records for this month." /> : null}
      {!isError && data.length ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Present</TableHead><TableHead>Paid leave</TableHead><TableHead>Unpaid leave</TableHead><TableHead>Holidays</TableHead><TableHead>Total hours</TableHead><TableHead>Overtime</TableHead></TableRow></TableHeader>
            <TableBody>{data.map((row) => <TableRow key={row.employeeId}><TableCell><p className="font-medium">{row.employeeName}</p><p className="text-xs text-slate-500">{row.employeeCode}</p></TableCell><TableCell>{row.presentDays}</TableCell><TableCell><Badge variant="default">{row.paidLeaves}</Badge></TableCell><TableCell><Badge variant="outline">{row.unpaidLeaves}</Badge></TableCell><TableCell>{row.holidays}</TableCell><TableCell>{row.totalHours ?? 0}</TableCell><TableCell>{row.overtimeHours ?? 0}</TableCell></TableRow>)}</TableBody>
          </Table>
        </div>
      ) : null}
      {isFetching && !isLoading ? <p className="text-xs text-slate-500">Refreshing report...</p> : null}
      <div className="border-t pt-3">
        <h3 className="text-sm font-semibold text-slate-950">Check leave status for a day</h3>
        <p className="mb-2 text-xs text-slate-500">Use an employee ID to resolve the status applied to attendance and payroll.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="Employee ID" />
          <Input type="date" value={statusDate} onChange={(event) => setStatusDate(event.target.value)} />
          <Button className="shrink-0" disabled={!employeeId.trim() || !statusDate || statusLoading} onClick={() => setStatusLookup({ employeeId: employeeId.trim(), date: statusDate })}><Search className="mr-2 h-4 w-4" />Check</Button>
        </div>
        {leaveStatus ? <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm"><span className="font-medium">{leaveStatus.status.replaceAll("_", " ")}</span> · {leaveStatus.paid ? "Paid" : "Unpaid"} · {leaveStatus.reason || "No reason recorded"}</p> : null}
      </div>
    </section>
  );
}