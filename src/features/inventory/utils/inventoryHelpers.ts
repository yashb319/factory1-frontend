import type {
  InventoryItem,
  InventoryItemType,
  StockMovementType,
} from "../types/inventory.types";

export const formatCurrency = (value?: number | null) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
};

export const formatNumber = (value?: number | null) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(value ?? 0);
};

export const itemTypeLabel = (type: InventoryItemType) => {
  const labels: Record<InventoryItemType, string> = {
    RAW_MATERIAL: "Raw Material",
    FINISHED_GOOD: "Finished Good",
    PACKAGING: "Packaging",
    CONSUMABLE: "Consumable",
    SEMI_FINISHED: "Semi Finished",
    OTHER: "Other",
  };

  return labels[type];
};

export const movementTypeLabel = (type: StockMovementType) => {
  const labels: Record<StockMovementType, string> = {
    OPENING_STOCK: "Opening Stock",
    STOCK_IN: "Stock In",
    STOCK_OUT: "Stock Out",
    PRODUCTION_IN: "Production In",
    PRODUCTION_USAGE: "Production Usage",
    ADJUSTMENT_IN: "Adjustment In",
    ADJUSTMENT_OUT: "Adjustment Out",
    DAMAGE: "Damage",
    RETURN_IN: "Return In",
    RETURN_OUT: "Return Out",
  };

  return labels[type];
};

export const getInventoryInsight = (item: InventoryItem) => {
  if (item.outOfStock) {
    return "This item is out of stock. Production or sales may be blocked.";
  }

  if (item.lowStock) {
    return "This item is below minimum stock. Consider reordering soon.";
  }

  if (!item.supplierName && item.itemType === "RAW_MATERIAL") {
    return "Supplier is missing for this raw material. Add supplier details for better purchase planning.";
  }

  if (
    item.itemType === "FINISHED_GOOD" &&
    item.sellingPrice &&
    item.purchasePrice
  ) {
    const profit = item.sellingPrice - item.purchasePrice;
    const margin = item.sellingPrice > 0 ? (profit / item.sellingPrice) * 100 : 0;

    if (margin < 15) {
      return "Margin looks low for this product. Review costing before selling at this price.";
    }

    return "This finished product has healthy basic margin based on current cost and selling price.";
  }

  return "Inventory looks stable for this item.";
};