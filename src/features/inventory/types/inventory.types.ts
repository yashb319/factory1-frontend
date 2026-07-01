export type InventoryItemType =
  | "RAW_MATERIAL"
  | "FINISHED_GOOD"
  | "PACKAGING"
  | "CONSUMABLE"
  | "SEMI_FINISHED"
  | "OTHER";

export type InventoryItemStatus = "ACTIVE" | "INACTIVE";

export type StockMovementType =
  | "OPENING_STOCK"
  | "STOCK_IN"
  | "STOCK_OUT"
  | "PRODUCTION_IN"
  | "PRODUCTION_USAGE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "DAMAGE"
  | "RETURN_IN"
  | "RETURN_OUT";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type InventoryItem = {
  id: string;
  itemCode: string;
  name: string;
  category?: string | null;
  itemType: InventoryItemType;
  unit: string;
  currentStock: number;
  minimumStock: number;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  inventoryValue: number;
  supplierName?: string | null;
  status: InventoryItemStatus;
  notes?: string | null;
  lowStock: boolean;
  outOfStock: boolean;
};

export type InventoryItemRequest = {
  itemCode: string;
  name: string;
  category?: string;
  itemType: InventoryItemType;
  unit: string;
  openingStock: number;
  minimumStock: number;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  supplierName?: string;
  notes?: string;
};

export type InventoryItemUpdateRequest = {
  name: string;
  category?: string;
  itemType: InventoryItemType;
  unit: string;
  minimumStock: number;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  supplierName?: string;
  status: InventoryItemStatus;
  notes?: string;
};

export type InventorySearchParams = {
  search?: string;
  category?: string;
  itemType?: InventoryItemType | "";
  status?: InventoryItemStatus | "";
  lowStockOnly?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
};

export type StockMovementRequest = {
  movementType: StockMovementType;
  quantity: number;
  movementDate?: string;
  referenceNumber?: string;
  remarks?: string;
};

export type StockMovement = {
  id: string;
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  movementType: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  movementDate: string;
  referenceNumber?: string | null;
  remarks?: string | null;
};

export type InventoryDashboard = {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  rawMaterialValue: number;
  finishedGoodsValue: number;
};

export type BulkInventoryItemRequest = {
  items: InventoryItemRequest[];
};

export type BulkInventoryImportResponse = {
  successCount: number;
  failedCount: number;
  errors: string[];
};