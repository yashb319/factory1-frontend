"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from "../api/employeeApi";
import { TallyMasterList } from "@/components/layout/TallyMasterList";
import type {
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "../types/employee.types";

export function EmployeesTallyView({
  initialScreen = "list",
}: {
  initialScreen?: "list" | "create" | "alter";
}) {
  const router = useRouter();
  const { data, isLoading, isFetching } = useGetEmployeesQuery({
    page: 0,
    size: 300,
    sortBy: "name",
    sortDirection: "asc",
  });

  const [createEmployee, createEmployeeState] = useCreateEmployeeMutation();
  const [updateEmployee, updateEmployeeState] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const items = useMemo(() => data?.content ?? [], [data]);

  return (
    <TallyMasterList
      title="Employees"
      initialScreen={initialScreen}
      subtitle="Manage workers, staff, salary structure and employee records."
      items={items}
      columns={[
        { key: "employeeCode", label: "Code" },
        { key: "name", label: "Name" },
        { key: "department", label: "Department" },
        { key: "designation", label: "Designation" },
        { key: "employeeType", label: "Type" },
        {
          key: "salaryRate",
          label: "Salary",
          className: "text-right",
          render: (item) =>
            new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(item.salaryRate),
        },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true, autoFocus: true },
        { key: "phone", label: "Phone", type: "text" },
        { key: "email", label: "Email", type: "email" },
        {
          key: "employeeType",
          label: "Employee Type",
          type: "select",
          required: true,
          options: [
            { value: "BLUE_COLLAR", label: "Blue Collar" },
            { value: "STAFF", label: "Staff" },
            { value: "SUPERVISOR", label: "Supervisor" },
            { value: "MANAGER", label: "Manager" },
          ],
        },
        { key: "department", label: "Department", type: "text" },
        { key: "designation", label: "Designation", type: "text" },
        { key: "salaryRate", label: "Salary Rate", type: "number", required: true },
        {
          key: "salaryType",
          label: "Salary Type",
          type: "select",
          required: true,
          options: [
            { value: "HOURLY", label: "Hourly" },
            { value: "DAILY", label: "Daily" },
            { value: "MONTHLY", label: "Monthly" },
          ],
        },
        { key: "joiningDate", label: "Joining Date", type: "date" },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ],
        },
      ]}
      isFetching={isFetching}
      onSelectItem={() => {}}
      onCreateItem={(data) => createEmployee(data as unknown as CreateEmployeeRequest).unwrap()}
      onUpdateItem={(id, data) => updateEmployee({ id, body: data as unknown as UpdateEmployeeRequest }).unwrap()}
      onDeleteItem={(id) => deleteEmployee(id).unwrap()}
      isCreating={createEmployeeState.isLoading}
      isUpdating={updateEmployeeState.isLoading}
      onBack={() => router.push("/gateway?menu=employees")}
    />
  );
}
