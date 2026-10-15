import { z } from "zod";

export const inventoryRecordSchema = z.object({
  id: z.uuid(), itemCode: z.string(), name: z.string(),
  category: z.string().nullable().optional(),
  itemType: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "PACKAGING", "CONSUMABLE", "SEMI_FINISHED", "OTHER"]),
  unit: z.string(), currentStock: z.number(), minimumStock: z.number(),
  purchasePrice: z.number().nullable().optional(), sellingPrice: z.number().nullable().optional(),
  hsnCode: z.string().nullable().optional(), gstRate: z.number().nullable().optional(),
  supplierId: z.string().nullable().optional(), supplierName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(), status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type InventoryRecord = z.infer<typeof inventoryRecordSchema>;

export const employeeRecordSchema = z.object({
  id: z.uuid(), employeeCode: z.string(), name: z.string(),
  email: z.string().nullable().optional(), phone: z.string().nullable().optional(),
  department: z.string().nullable().optional(), designation: z.string().nullable().optional(),
  salaryType: z.enum(["HOURLY", "DAILY", "MONTHLY"]), salaryRate: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
}).passthrough();
export type EmployeeRecord = z.infer<typeof employeeRecordSchema>;

export function recordsPageSchema<T extends z.ZodType>(record: T) {
  return z.object({
    content: z.array(record), page: z.number().int().nonnegative(), size: z.number().int().positive(),
    totalElements: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
  });
}

export const recordInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  code: z.string().trim().max(50),
  minimumStock: z.coerce.number().min(0),
  openingStock: z.coerce.number().min(0),
  salaryRate: z.coerce.number().min(0),
  unit: z.string().trim().min(1).max(30),
});
