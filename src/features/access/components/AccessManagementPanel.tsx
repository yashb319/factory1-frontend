"use client";

import { useMemo, useState } from "react";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetEmployeesQuery } from "@/features/employees/api/employeeApi";
import type { Employee } from "@/features/employees/types/employee.types";
import type { UserRole } from "@/features/auth/types";
import {
  useCreateUserAccountMutation,
  useDeactivateUserAccountMutation,
  useGetUserAccountsQuery,
} from "../api/accessApi";

const roles: Array<{
  value: UserRole;
  label: string;
  description: string;
}> = [
  {
    value: "ADMIN",
    label: "Admin",
    description: "Manage people and most organization operations.",
  },
  {
    value: "MANAGEMENT",
    label: "Management",
    description: "Review operations, employees, attendance and production.",
  },
  {
    value: "FINANCE",
    label: "Finance",
    description: "Work with payroll, billing and financial records.",
  },
];

export function AccessManagementPanel() {
  const { data: users = [], isFetching } = useGetUserAccountsQuery();
  const { data: employeesPage } = useGetEmployeesQuery({
    page: 0,
    size: 500,
    status: "ACTIVE",
    sortBy: "name",
    sortDirection: "asc",
  });

  const [createUser, createState] = useCreateUserAccountMutation();
  const [deactivateUser, deactivateState] = useDeactivateUserAccountMutation();

  const employees = useMemo(
    () => employeesPage?.content?.filter((employee) => employee.email) ?? [],
    [employeesPage]
  );

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("MANAGEMENT");

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedEmployeeId
  );

  function applyEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);

    const employee = employees.find((entry) => entry.id === employeeId);

    if (!employee) return;

    setName(employee.name);
    setEmail(employee.email ?? "");
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || password.length < 8) {
      toast.error("Enter name, email and an 8 character password");
      return;
    }

    try {
      await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      }).unwrap();

      toast.success("Login access created");
      setSelectedEmployeeId("");
      setName("");
      setEmail("");
      setPassword("");
      setRole("MANAGEMENT");
    } catch {
      toast.error("Could not create login access");
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateUser(id).unwrap();
      toast.success("User access deactivated");
    } catch {
      toast.error("Could not deactivate this user");
    }
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Access Management</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Create employee login accounts and assign Factory1 roles.
        </p>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" />
            New login access
          </div>

          <Field label="Employee">
            <select
              value={selectedEmployeeId}
              onChange={(event) => applyEmployee(event.target.value)}
              className="h-9 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Select employee with email</option>
              {employees.map((employee: Employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} - {employee.name}
                </option>
              ))}
            </select>
          </Field>

          {selectedEmployee && (
            <div className="rounded-md border bg-white p-3 text-xs text-slate-600">
              <p>{selectedEmployee.department || "No department"}</p>
              <p>{selectedEmployee.designation || selectedEmployee.employeeType}</p>
            </div>
          )}

          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Temporary Password">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
            />
          </Field>

          <Field label="Role">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="h-9 w-full rounded-lg border bg-white px-3 text-sm"
            >
              {roles.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
          </Field>

          <p className="text-xs text-slate-500">
            {roles.find((roleOption) => roleOption.value === role)?.description}
          </p>

          <Button
            type="button"
            onClick={handleCreate}
            disabled={createState.isLoading}
            className="w-full"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {createState.isLoading ? "Creating..." : "Create Login"}
          </Button>
        </div>

        <div className="min-w-0">
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell data-label="User">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell data-label="Role">
                    <Badge variant={user.role === "OWNER" ? "default" : "outline"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell data-label="Status">
                    <Badge
                      variant={user.status === "ACTIVE" ? "secondary" : "destructive"}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" data-label="Action">
                    {user.role !== "OWNER" && user.status === "ACTIVE" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deactivateState.isLoading}
                        onClick={() => handleDeactivate(user.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {!users.length && (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-slate-500">
                    {isFetching ? "Loading access..." : "No users found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
