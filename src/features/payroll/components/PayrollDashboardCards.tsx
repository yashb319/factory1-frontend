"use client";

import {
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  ReceiptText,
} from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { PayrollDashboardResponse } from "../types/payroll.types";
import { formatCurrency } from "../utils/payroll.utils";

interface Props {
  data?: PayrollDashboardResponse;
  isLoading?: boolean;
}

export function PayrollDashboardCards({ data, isLoading }: Props) {
const cards = [
  {
    title: "Total Payrolls",
    value: data?.totalPayrolls ?? 0,
    description: "Generated salary runs",
    icon: ReceiptText,
  },
  {
    title: "Generated",
    value: data?.generated ?? 0,
    description: "Waiting for approval",
    icon: Clock3,
  },
  {
    title: "Approved",
    value: data?.approved ?? 0,
    description: "Ready for payout",
    icon: BadgeCheck,
  },
  {
    title: "Paid",
    value: data?.paid ?? 0,
    description: "Completed payrolls",
    icon: FileCheck2,
  },
  {
    title: "This Month Payroll",
    value: formatCurrency(data?.thisMonthPayroll),
    description: "Current month net outflow",
    icon: Banknote,
  },
  {
    title: "This Year Payroll",
    value: formatCurrency(data?.thisYearPayroll),
    description: "Year-to-date salary cost",
    icon: CircleDollarSign,
  },
];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={isLoading ? "..." : String(card.value)}
          description={card.description}
          icon={card.icon}
        />
      ))}
    </div>
  );
}
