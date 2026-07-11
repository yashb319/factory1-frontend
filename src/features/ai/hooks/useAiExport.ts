"use client";

import { toast } from "sonner";

import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";

import { employeeApi } from "@/features/employees/api/employeeApi";
import { customerApi } from "@/features/customers/api/customerApi";
import { supplierApi } from "@/features/suppliers/api/supplierApi";
import { inventoryApi } from "@/features/inventory/api/inventoryApi";
import { productsApi } from "@/features/products/api/productsApi";
import { billingApi } from "@/features/billing/api/billingApi";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import { payrollApi } from "@/features/payroll/api/payrollApi";

import { exportEmployeesCsv } from "@/features/employees/utils/employeeExport";
import { exportCustomersCsv } from "@/features/customers/utils/customerExport";
import { exportSuppliersCsv } from "@/features/suppliers/utils/supplierExport";
import { exportInventoryCsv } from "@/features/inventory/utils/inventoryExport";
import { exportProductsCsv } from "@/features/products/utils/productExport";
import { exportBillsCsv } from "@/features/billing/utils/billingExport";
import { exportAttendanceCsv } from "@/features/attendance/utils/attendanceExport";

import type { DataJobModule } from "@/features/import-export/types/importExport.types";

const FETCH_SIZE = 2000;

export function useAiExport() {
  const logDataJob = useLogDataJob();

  const [fetchEmployees] = employeeApi.endpoints.getEmployees.useLazyQuery();
  const [fetchCustomers] = customerApi.endpoints.getCustomers.useLazyQuery();
  const [fetchSuppliers] = supplierApi.endpoints.getSuppliers.useLazyQuery();
  const [fetchInventory] = inventoryApi.endpoints.getInventoryItems.useLazyQuery();
  const [fetchProducts] = productsApi.endpoints.getProducts.useLazyQuery();
  const [fetchBills] = billingApi.endpoints.getBills.useLazyQuery();
  const [fetchAttendance] = attendanceApi.endpoints.getAttendance.useLazyQuery();
  const [fetchPayrollRuns] = payrollApi.endpoints.getPayrollRuns.useLazyQuery();

  async function exportModule(module: string): Promise<boolean> {
    const target = (module || "").toUpperCase();
    let fileName = "";
    let outputFileUrl = "";
    let totalRows = 0;

    try {
      switch (target) {
        case "EMPLOYEE": {
          const res = await fetchEmployees({ size: FETCH_SIZE }).unwrap();
          const data = res.content ?? [];
          const saved = exportEmployeesCsv(data);
          fileName = saved.fileName;
          outputFileUrl = saved.outputFileUrl;
          totalRows = data.length;
          break;
        }
        case "CUSTOMER": {
          const res = await fetchCustomers({ size: FETCH_SIZE }).unwrap();
          const data = res.content ?? [];
          const saved = exportCustomersCsv(data);
          fileName = saved.fileName;
          outputFileUrl = saved.outputFileUrl;
          totalRows = data.length;
          break;
        }
        case "SUPPLIER": {
          const res = await fetchSuppliers({ size: FETCH_SIZE }).unwrap();
          const data = res.content ?? [];
          const saved = exportSuppliersCsv(data);
          fileName = saved.fileName;
          outputFileUrl = saved.outputFileUrl;
          totalRows = data.length;
          break;
        }
        case "INVENTORY": {
          const res = await fetchInventory({ size: FETCH_SIZE }).unwrap();
          const data = res.content ?? [];
          const saved = exportInventoryCsv(data);
          fileName = saved.fileName;
          outputFileUrl = saved.outputFileUrl;
          totalRows = data.length;
          break;
        }
        case "PRODUCT":
        case "PRODUCTION": {
          const res = await fetchProducts({ size: FETCH_SIZE }).unwrap();
          const data = res.content ?? [];
          const saved = exportProductsCsv(data);
          fileName = saved.fileName;
          outputFileUrl = saved.outputFileUrl;
          totalRows = data.length;
          break;
        }
        case "BILLING":
        case "SALES":
        case "PURCHASE": {
          const res = await fetchBills({ size: FETCH_SIZE }).unwrap();
          const data = res.content ?? [];
          const saved = exportBillsCsv(data);
          fileName = saved.fileName;
          outputFileUrl = saved.outputFileUrl;
          totalRows = data.length;
          break;
        }
        case "ATTENDANCE": {
          const res = await fetchAttendance({ size: FETCH_SIZE }).unwrap();
          const data = res.content ?? [];
          const saved = exportAttendanceCsv(data);
          fileName = saved.fileName;
          outputFileUrl = saved.outputFileUrl;
          totalRows = data.length;
          break;
        }
        case "PAYROLL": {
          const res = await fetchPayrollRuns({ size: 200 }).unwrap();
          const runs = res.content ?? [];
          const stamp = new Date().toISOString().slice(0, 10);
          const csvName = `payroll-runs-${stamp}.csv`;
          const rows = runs.map((run) => [
            run.payrollMonth,
            run.payrollYear,
            run.status,
            run.totalEmployees,
            run.grossAmount,
            run.overtimeAmount,
            run.deductionAmount,
            run.netAmount,
          ]);
          const csv = toCsv([
            [
              "Month",
              "Year",
              "Status",
              "Employees",
              "Gross",
              "Overtime",
              "Deductions",
              "Net",
            ],
            ...rows,
          ]);
          const saved = saveLocalExportFile({
            fileName: csvName,
            content: csv,
          });
          downloadCsv({ fileName: csvName, content: csv });
          fileName = csvName;
          outputFileUrl = saved.url;
          totalRows = runs.length;
          break;
        }
        default:
          return false;
      }
    } catch {
      toast.error("Could not generate the export file.");
      return false;
    }

    if (!outputFileUrl) {
      return false;
    }

    await logDataJob({
      operation: "EXPORT",
      module: target as DataJobModule,
      fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows,
      successRows: totalRows,
      failedRows: 0,
      outputFileUrl,
    });

    toast.success(`${target} data exported. Open Import / Export to download it.`);
    return true;
  }

  return exportModule;
}
