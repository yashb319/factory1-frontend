"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetEmployeesQuery, useDeleteEmployeeMutation } from "../api/employeeApi";
import { useEmployeeFilters } from "../hooks/useEmployeeFilters";
import { Employee, EmployeeType, SalaryType, EmployeeStatus } from "../types/employee.types";
import { EmployeeFilters } from "./EmployeeFilters";
import { EmployeeExportMenu } from "./EmployeeExportMenu";
import { EmployeeTable } from "./EmployeeTable";
import { EmployeePagination } from "./EmployeePagination";
import { AddEmployeeDrawer } from "./AddEmployeeDrawer";
import { EmployeeImportDialog } from "./EmployeeImportDialog";
import { EmployeeDetailsDrawer } from "./EmployeeDetailsDrawer";
import { EditEmployeeDrawer } from "./EditEmployeeDrawer";
import { DeleteEmployeeDialog } from "./DeleteEmployeeDialog";
export function EmployeesPage() {
  const { filters, updateFilters } = useEmployeeFilters();

  const { data, isLoading, isFetching } = useGetEmployeesQuery(filters);
  const [deleteEmployee, deleteEmployeeState] = useDeleteEmployeeMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Manage workers, staff, salary structure and employee records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <EmployeeExportMenu employees={data?.content ?? []} />

          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>

          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <EmployeeFilters filters={filters} onChange={updateFilters} />

      <EmployeeTable
        employees={data?.content ?? []}
        loading={isLoading || isFetching}
        onView={setDetailsEmployee}
        onEdit={setEditEmployee}
        onDelete={setDeleteTarget}
        onSort={(sortBy) =>
          updateFilters({
            sortBy,
            sortDirection:
              filters.sortBy === sortBy && filters.sortDirection === "asc"
                ? "desc"
                : "asc",
          })
        }
      />

      {data && (
        <EmployeePagination
          page={data.page}
          size={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={(page) => updateFilters({ page })}
          onSizeChange={(size) => updateFilters({ size, page: 0 })}
        />
      )}

      <AddEmployeeDrawer open={addOpen} onOpenChange={setAddOpen} />

      <EmployeeImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <EmployeeDetailsDrawer
        employee={detailsEmployee}
        open={!!detailsEmployee}
        onOpenChange={(open) => !open && setDetailsEmployee(null)}
      />

      <EditEmployeeDrawer
        employee={editEmployee}
        open={!!editEmployee}
        onOpenChange={(open) => !open && setEditEmployee(null)}
      />

      <DeleteEmployeeDialog
        employee={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
