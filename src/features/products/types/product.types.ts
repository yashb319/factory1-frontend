export type Product = {
  id: string;
  productCode: string;
  name: string;
  description?: string;
  finishedGoodInventoryItemId: string;
  unit?: string;
  active: boolean;
  hasBom: boolean;
};

export type ProductRequest = {
  code?: string;
  name: string;
  description?: string;
  finishedGoodInventoryItemId: string;
  unit?: string;
  active?: boolean;
};

export type BomComponent = {
  id?: string;
  inventoryItemId: string;
  itemCode?: string;
  itemName?: string;
  quantityRequired: number;
  unit?: string;
};

export type Bom = {
  id: string;
  productId: string;
  productCode?: string;
  productName?: string;
  name: string;
  active: boolean;
  components: BomComponent[];
};

export type BomRequest = {
  name: string;
  active?: boolean;
  components: BomComponent[];
};

export type ProductionRequest = {
  productId: string;
  quantityProduced: number;
  productionDate: string;
  notes?: string;
};

export type ProductionResponse = {
  id: string;
  productId: string;
  productCode?: string;
  productName?: string;
  finishedGoodInventoryItemId: string;
  finishedGoodInventoryItemCode?: string;
  finishedGoodInventoryItemName?: string;
  quantityProduced: number;
  productionDate: string;
  notes?: string;
  usedBom: boolean;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};
