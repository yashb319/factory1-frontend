"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { playUiSound } from "@/lib/uiSounds";
import { useRouter } from "next/navigation";
import {
  useGetPayrollRunsQuery,
  useGeneratePayrollMutation,
  useApprovePayrollMutation,
  usePayPayrollMutation,
  useDeletePayrollMutation,
} from "../api/payrollApi";
import type { PayrollStatus } from "../types/payroll.types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

const STATUS_LABEL: Record<PayrollStatus, string> = {
  DRAFT: "Draft",
  GENERATED: "Generated",
  APPROVED: "Approved",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

type Screen = "list" | "generate";

export function PayrollTallyView({
  initialScreen = "list",
}: {
  initialScreen?: Screen;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(initialScreen);

  const { data, isFetching } = useGetPayrollRunsQuery({
    page: 0,
    size: 100,
  });
  const runs = data?.content ?? [];

  const [generate, generateState] = useGeneratePayrollMutation();
  const [approve] = useApprovePayrollMutation();
  const [pay] = usePayPayrollMutation();
  const [remove] = useDeletePayrollMutation();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [generateDraft, setGenerateDraft] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [editMode, setEditMode] = useState(false);
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndex = runs.length ? Math.min(selectedIndex, runs.length - 1) : 0;

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-pay-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (screen === "generate") fieldRefs.current[0]?.focus();
  }, [screen]);

  const doGenerate = async () => {
    try {
      await generate({
        month: Number(generateDraft.month),
        year: Number(generateDraft.year),
      }).unwrap();
      toast.success("Payroll generated");
      setScreen("list");
    } catch {
      toast.error("Could not generate payroll");
    }
  };

  const actOnSelected = async (
    label: string,
    fn: (id: string) => Promise<unknown>
  ) => {
    const run = runs[activeIndex];
    if (!run) return;
    try {
      await fn(run.id);
      toast.success(`${label} done`);
    } catch {
      toast.error(`Could not ${label.toLowerCase()}`);
    }
  };

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (screen === "generate") {
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
          if (initialScreen === "generate" && !runs.length) router.push("/gateway?menu=payroll");
          else setScreen("list");
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
          doGenerate();
          return;
        }
        if (event.key.toLowerCase() === "q") {
          event.preventDefault();
          event.stopImmediatePropagation();
          setScreen("list");
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
        return;
      }

      if (screen === "list") {
        if (event.key === "Escape") {
          event.preventDefault();
          router.push("/gateway?menu=payroll");
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((c) => Math.min(c + 1, runs.length - 1));
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((c) => Math.max(c - 1, 0));
          return;
        }
        if (event.key.toLowerCase() === "n") {
          event.preventDefault();
          setScreen("generate");
          return;
        }
        if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          event.stopImmediatePropagation();
          actOnSelected("Approved", (id) => approve(id).unwrap());
          return;
        }
        if (event.key.toLowerCase() === "p") {
          event.preventDefault();
          event.stopImmediatePropagation();
          actOnSelected("Paid", (id) => pay(id).unwrap());
          return;
        }
        if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          event.stopImmediatePropagation();
          actOnSelected("Deleted", (id) => remove(id).unwrap());
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const run = runs[activeIndex];
          if (run) toast.info(`${run.payrollMonth}/${run.payrollYear} run`);
          return;
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, runs, activeIndex, generateDraft, editMode, initialScreen]);

  if (screen === "generate") {
    const setField = (key: string, value: unknown) =>
      setGenerateDraft((c) => ({ ...c, [key]: value }));
    return (
      <div className="tally-entry-screen" data-tally-nav-scope>
        <div className="tally-entry-title">
          <span>Generate Payroll</span>
          <span>Factory1</span>
          <span>Ctrl + M</span>
        </div>

        <div className="grid h-[calc(100%-6rem)] overflow-auto p-6">
          <div className="mx-auto grid w-full max-w-lg gap-y-3">
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Month</span>
              <input
                ref={(el) => {
                  fieldRefs.current[0] = el;
                }}
                type="number"
                min={1}
                max={12}
                value={generateDraft.month}
                onChange={(e) => setField("month", Number(e.target.value))}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
            <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
              <span className="tally-company-label px-1 font-bold">Year</span>
              <input
                ref={(el) => {
                  fieldRefs.current[1] = el;
                }}
                type="number"
                value={generateDraft.year}
                onChange={(e) => setField("year", Number(e.target.value))}
                className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => setScreen("list")}
          >
            Q: Back
          </button>
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={generateState.isLoading}
            onClick={() => {
              playUiSound("post");
              doGenerate();
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
            onClick={() => setScreen("list")}
          >
            X: Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid grid-cols-3 border-b border-[#0F766E] bg-[#C8E6C9] text-xs">
        <div className="px-3 py-1 font-bold">Payroll Runs</div>
        <div className="px-3 py-1 text-center text-[11px] text-slate-700">
          Factory1
        </div>
        <div className="px-3 py-1 text-right text-[11px] text-slate-700">
          Ctrl + M
        </div>
      </div>

      <div className="h-[calc(100%-7rem)] overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[#C8E6C9]">
            <tr className="border-b border-[#0F766E] text-left">
              <th className="w-12 px-2 py-1">S.No.</th>
              <th className="px-2 py-1">Period</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1 text-right">Employees</th>
              <th className="px-2 py-1 text-right">Gross</th>
              <th className="px-2 py-1 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => {
              const selected = index === activeIndex;
              return (
                <tr
                  key={run.id}
                  data-pay-index={index}
                  onClick={() => setSelectedIndex(index)}
                  className={[
                    "cursor-pointer border-b border-[#94A3B8]/40",
                    selected ? "bg-[#0F172A] text-white" : "hover:bg-[#6366F1]/10",
                  ].join(" ")}
                >
                  <td className="px-2 py-0.5 text-center">{index + 1}</td>
                  <td className="px-2 py-0.5">
                    {run.payrollMonth}/{run.payrollYear}
                  </td>
                  <td className="px-2 py-0.5">{STATUS_LABEL[run.status]}</td>
                  <td className="px-2 py-0.5 text-right">{run.totalEmployees}</td>
                  <td className="px-2 py-0.5 text-right">
                    {formatCurrency(run.grossAmount)}
                  </td>
                  <td className="px-2 py-0.5 text-right font-bold">
                    {formatCurrency(run.netAmount)}
                  </td>
                </tr>
              );
            })}
            {runs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-8 text-center text-slate-500"
                >
                  {isFetching
                    ? "Loading..."
                    : "No payroll runs. Press N to generate."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-5 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => setScreen("generate")}
        >
          N: Generate
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => actOnSelected("Approved", (id) => approve(id).unwrap())}
        >
          A: Approve
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => actOnSelected("Paid", (id) => pay(id).unwrap())}
        >
          P: Pay
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => actOnSelected("Deleted", (id) => remove(id).unwrap())}
        >
          D: Delete
        </button>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={() => router.push("/gateway?menu=payroll")}
        >
          O: Close
        </button>
      </div>
    </div>
  );
}
