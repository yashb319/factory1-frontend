"use client";

import {
  AlertTriangle,
  Boxes,
  CircleOff,
  Factory,
  Package,
  PackageCheck,
} from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import type { InventoryDashboard } from "../types/inventory.types";
import { formatCurrency } from "../utils/inventoryHelpers";

type Props = {
  data?: InventoryDashboard;
  isLoading?: boolean;
};

export function InventoryDashboardCards({ data, isLoading }: Props) {
  const cards = [
    {
      title: "Total Items",
      value: data?.totalItems ?? 0,
      description: `${data?.activeItems ?? 0} active masters`,
      icon: Package,
    },
    {
      title: "Low Stock",
      value: data?.lowStockItems ?? 0,
      description: "Below minimum stock",
      icon: AlertTriangle,
    },
    {
      title: "Out of Stock",
      value: data?.outOfStockItems ?? 0,
      description: "Needs purchase or production",
      icon: CircleOff,
    },
    {
      title: "Inventory Value",
      value: formatCurrency(data?.totalInventoryValue ?? 0),
      description: "Current stock valuation",
      icon: Boxes,
    },
    {
      title: "Raw Material Value",
      value: formatCurrency(data?.rawMaterialValue ?? 0),
      description: "Purchase-side stock",
      icon: Factory,
    },
    {
      title: "Finished Goods Value",
      value: formatCurrency(data?.finishedGoodsValue ?? 0),
      description: "Sales-ready stock",
      icon: PackageCheck,
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
