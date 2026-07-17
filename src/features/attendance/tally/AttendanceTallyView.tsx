"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGetAttendanceQuery,
  useMarkAttendanceMutation,
  useGetMonthlyAttendanceReportQuery,
} from "../api/attendanceApi";
import { useGetEmployeesQuery } from "@/features/employees/api/employeeApi";
import type { AttendanceStatus } from "../types/attendance.types";

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "LATE", label: "Late" },
  { value: "PAID_LEAVE", label: "Paid Leave" },
  { value: "UNPAID_LEAVE", label: "Unpaid Leave" },
];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "text-emerald-700",
  ABSENT: "text-red-700",
  HALF_DAY: "text-amber-700",
  LATE: "text-orange-700",
  PAID_LEAVE: "text-sky-700",
  UNPAID_LEAVE: "text-slate-500",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type Screen = "mark" | "register" | "report";

export function AttendanceTallyView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const [screen, setScreen] = useState<Screen>(
    viewParam === "register" || viewParam === "report" ? viewParam : "mark"
  );

  const [markDraft, setMarkDraft] = useState<Record<string, unknown>>({
    employeeId: "",
    attendanceDate: todayIso(),
    status: "PRESENT",
    checkInTime: "",
    checkOutTime: "",
    remarks: "",
  });
  const [editMode, setEditMode] = useState(false);
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);

  const [registerDate, setRegisterDate] = useState(todayIso());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const { data: employeesPage } = useGetEmployeesQuery({
    page: 0,
    size: 300,
    status: "ACTIVE",
  });
  const employees = useMemo(
    () => employeesPage?.content ?? [],
    [employeesPage]
  );
  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.employeeCode} - ${e.name}`,
      })),
    [employees]
  );

  const { data: registerData, isFetching: registerFetching } =
    useGetAttendanceQuery({
      fromDate: registerDate,
      toDate: registerDate,
      size: 500,
    });
  const registerRows = useMemo(
    () => registerData?.content ?? [],
    [registerData]
  );

  const { data: reportData } = useGetMonthlyAttendanceReportQuery({
    month: reportMonth,
    year: reportYear,
  });
  const reportRows = useMemo(() => reportData ?? [], [reportData]);

  const [markAttendance, markState] = useMarkAttendanceMutation();

  useEffect(() => {
    if (screen === "mark") fieldRefs.current[0]?.focus();
  }, [screen]);

  const submitMark = async () => {
    if (!markDraft.employeeId) {
      toast.error("Select an employee");
      return;
    }
    if (!markDraft.attendanceDate) {
      toast.error("Select a date");
      return;
    }
    try {
      await markAttendance({
        employeeId: String(markDraft.employeeId),
        attendanceDate: String(markDraft.attendanceDate),
        status: markDraft.status as AttendanceStatus,
        checkInTime: markDraft.checkInTime
          ? String(markDraft.checkInTime)
          : undefined,
        checkOutTime: markDraft.checkOutTime
          ? String(markDraft.checkOutTime)
          : undefined,
        remarks: markDraft.remarks ? String(markDraft.remarks) : undefined,
      }).unwrap();
      toast.success("Attendance marked");
      setScreen("register");
      setRegisterDate(String(markDraft.attendanceDate));
    } catch {
      toast.error("Could not mark attendance");
    }
  };

  const openMarkFor = (employeeId: string) => {
    setMarkDraft((c) => ({
      ...c,
      employeeId,
      attendanceDate: registerDate,
    }));
    setScreen("mark");
  };

  const [listIndex, setListIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const activeListIndex = registerRows.length
    ? Math.min(listIndex, registerRows.length - 1)
    : 0;

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-att-index="${activeListIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeListIndex, screen]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (screen === "mark") {
        const fields = fieldRefs.current.filter(Boolean) as HTMLElement[];
        const currentIndex = fields.findIndex(
          (el) => el === document.activeElement
        );
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (editMode) {
            setEditMode(false);
            return;
          }
          if (viewParam) router.push("/gateway?menu=attendance");
          else setScreen("register");
          return;
        }
        if (editMode) {
          if (event.key === "Enter") {
            event.preventDefault();
            setEditMode(false);
          }
          return;
        }
        if (event.key.toLowerCase() === "a" && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
          playUiSound("post");
          submitMark();
          return;
        }
        if (event.key.toLowerCase() === "q") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (viewParam) router.push("/gateway?menu=attendance");
          else setScreen("register");
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          setEditMode(true);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          const next = Math.min(currentIndex + 1, fields.length - 1);
          fields[next >= 0 ? next : 0]?.focus();
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          const prev = Math.max(currentIndex - 1, 0);
          fields[prev]?.focus();
          return;
        }
        if (
          (event.key.length === 1 ||
            event.key === "Backspace" ||
            event.key === "Delete") &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();
        }
        return;
      }

      if (screen === "register") {
        if (event.key === "Escape") {
          event.preventDefault();
          router.push("/gateway?menu=attendance");
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setListIndex((c) => Math.min(c + 1, registerRows.length - 1));
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setListIndex((c) => Math.max(c - 1, 0));
          return;
        }
        if (event.key.toLowerCase() === "n") {
          event.preventDefault();
          setScreen("mark");
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const row = registerRows[activeListIndex];
          if (row) openMarkFor(row.employeeId);
          return;
        }
        return;
      }

      if (screen === "report") {
        if (event.key === "Escape") {
          event.preventDefault();
          router.push("/gateway?menu=attendance");
          return;
        }
        return;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, markDraft, editMode, registerRows, activeListIndex, viewParam]);

  if (screen === "mark") {
    const setField = (key: string, value: unknown) =>
      setMarkDraft((c) => ({ ...c, [key]: value }));

    return (
      <div className="tally-entry-screen" data-tally-nav-scope>
        <div className="tally-entry-title">
          <span>Attendance Voucher</span>
          <span>Factory1</span>
          <span>Ctrl + M</span>
        </div>

        <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
          <div className="mx-auto grid w-full max-w-lg gap-y-3">
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Employee</span>
              <select
                ref={(el) => {
                  fieldRefs.current[0] = el;
                }}
                value={markDraft.employeeId as string}
                onChange={(e) => setField("employeeId", e.target.value)}
                className="tally-select h-6 w-full"
              >
                <option value="">---</option>
                {employeeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Date</span>
              <input
                ref={(el) => {
                  fieldRefs.current[1] = el;
                }}
                type="date"
                value={markDraft.attendanceDate as string}
                onChange={(e) => setField("attendanceDate", e.target.value)}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Status</span>
              <select
                ref={(el) => {
                  fieldRefs.current[2] = el;
                }}
                value={markDraft.status as string}
                onChange={(e) =>
                  setField("status", e.target.value as AttendanceStatus)
                }
                className="tally-select h-6 w-full"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">
                Check In
              </span>
              <input
                ref={(el) => {
                  fieldRefs.current[3] = el;
                }}
                type="time"
                value={(markDraft.checkInTime as string) ?? ""}
                onChange={(e) => setField("checkInTime", e.target.value)}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">
                Check Out
              </span>
              <input
                ref={(el) => {
                  fieldRefs.current[4] = el;
                }}
                type="time"
                value={(markDraft.checkOutTime as string) ?? ""}
                onChange={(e) => setField("checkOutTime", e.target.value)}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>

            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Remarks</span>
              <input
                ref={(el) => {
                  fieldRefs.current[5] = el;
                }}
                type="text"
                value={(markDraft.remarks as string) ?? ""}
                onChange={(e) => setField("remarks", e.target.value)}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => (viewParam ? router.push("/gateway?menu=attendance") : setScreen("register"))}
          >
            Q: Back
          </button>
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={markState.isLoading}
            onClick={() => {
              playUiSound("post");
              submitMark();
            }}
          >
            A: Accept
          </button>
          <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
            O: Close
          </span>
          <button
            type="button"
            className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => (viewParam ? router.push("/gateway?menu=attendance") : setScreen("register"))}
          >
            X: Cancel
          </button>
        </div>
      </div>
    );
  }

  if (screen === "report") {
    return (
      <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
        <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
          <div className="px-3 py-1 font-bold">Monthly Attendance</div>
          <div className="px-3 py-1 text-center text-[11px] text-slate-700">
            Factory1
          </div>
          <div className="px-3 py-1 text-right text-[11px] text-slate-700">
            Ctrl + M
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2 text-sm">
          <label className="flex items-center gap-1">
            Month
            <input
              type="number"
              min={1}
              max={12}
              value={reportMonth}
              onChange={(e) => setReportMonth(Number(e.target.value))}
              className="h-6 w-14 border border-[#0F766E] bg-transparent px-1"
            />
          </label>
          <label className="flex items-center gap-1">
            Year
            <input
              type="number"
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="h-6 w-20 border border-[#0F766E] bg-transparent px-1"
            />
          </label>
        </div>

        <div className="h-[calc(100%-10rem)] overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#C8E6C9]">
              <tr className="border-b border-[#0F766E] text-left">
                <th className="px-2 py-1">Code</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1 text-right">Present</th>
                <th className="px-2 py-1 text-right">Absent</th>
                <th className="px-2 py-1 text-right">Half</th>
                <th className="px-2 py-1 text-right">Late</th>
                <th className="px-2 py-1 text-right">Payable</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.employeeId} className="border-b border-[#94A3B8]/40">
                  <td className="px-2 py-0.5">{row.employeeCode}</td>
                  <td className="px-2 py-0.5">{row.employeeName}</td>
                  <td className="px-2 py-0.5 text-right">{row.presentDays}</td>
                  <td className="px-2 py-0.5 text-right">{row.absentDays}</td>
                  <td className="px-2 py-0.5 text-right">{row.halfDays}</td>
                  <td className="px-2 py-0.5 text-right">{row.lateDays}</td>
                  <td className="px-2 py-0.5 text-right font-bold">
                    {row.payableDays}
                  </td>
                </tr>
              ))}
              {reportRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-8 text-center text-slate-500"
                  >
                    No report data for selected month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("register")}
          >
            D: Register
          </button>
          <button
            type="button"
            className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => router.push("/gateway?menu=attendance")}
          >
            O: Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold">Attendance Register</div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">
          Factory1
        </div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">
          Ctrl + M
        </div>
      </div>

      <div className="flex items-center justify-center border-b border-[#0F766E] bg-[#D9F99D]/40 px-4 py-2 text-sm">
        <label className="flex items-center gap-2">
          Date
          <input
            type="date"
            value={registerDate}
            onChange={(e) => {
              setRegisterDate(e.target.value);
              setListIndex(0);
            }}
            className="h-6 border border-[#0F766E] bg-transparent px-1"
          />
        </label>
      </div>

      <div ref={listRef} className="h-[calc(100%-12rem)] overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[#C8E6C9]">
            <tr className="border-b border-[#0F766E] text-left">
              <th className="w-12 px-2 py-1">S.No.</th>
              <th className="px-2 py-1">Code</th>
              <th className="px-2 py-1">Name</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">In</th>
              <th className="px-2 py-1">Out</th>
              <th className="px-2 py-1 text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            {registerRows.map((row, index) => {
              const selected = index === activeListIndex;
              return (
                <tr
                  key={row.id}
                  data-att-index={index}
                  onClick={() => {
                    setListIndex(index);
                    if (row.employeeId) openMarkFor(row.employeeId);
                  }}
                  className={[
                    "cursor-pointer border-b border-[#94A3B8]/40",
                    selected ? "bg-[#0F172A] text-white" : "hover:bg-[#6366F1]/10",
                  ].join(" ")}
                >
                  <td className="px-2 py-0.5 text-center">{index + 1}</td>
                  <td className="px-2 py-0.5">{row.employeeCode}</td>
                  <td className="px-2 py-0.5">{row.employeeName}</td>
                  <td className={`px-2 py-0.5 ${STATUS_COLORS[row.status]}`}>
                    {row.status.replace("_", " ")}
                  </td>
                  <td className="px-2 py-0.5">{row.checkInTime ?? "-"}</td>
                  <td className="px-2 py-0.5">{row.checkOutTime ?? "-"}</td>
                  <td className="px-2 py-0.5 text-right">
                    {row.totalHours ?? "-"}
                  </td>
                </tr>
              );
            })}
            {registerRows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-8 text-center text-slate-500"
                >
                  {registerFetching
                    ? "Loading..."
                    : "No attendance marked for this date. Press N to mark."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => setScreen("mark")}
        >
          N: Mark
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => setScreen("report")}
        >
          R: Report
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          Enter: Alter
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/gateway?menu=attendance")}
        >
          O: Close
        </button>
      </div>
    </div>
  );
}
