"use client";

import {
  Eye,
  MoreHorizontal,
  Pencil,
  QrCode,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Employee } from "../types/employee.types";

interface Props {
  employees: Employee[];
  loading: boolean;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onSort: (field: string) => void;
}

export function EmployeeTable({
  employees,
  loading,
  onView,
  onEdit,
  onDelete,
  onSort,
}: Props) {
  const [qrEmployee, setQrEmployee] = useState<Employee | null>(null);
  const qrPayload = useMemo(() => {
    if (!qrEmployee) return "";
    return JSON.stringify({
      employeeCode: qrEmployee.employeeCode,
      name: qrEmployee.name,
    });
  }, [qrEmployee]);
  const qrUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrPayload)}`
    : "";

  return (
    <>
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
        <Table className="responsive-table">
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => onSort("employeeCode")}>
                  Code <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>

              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => onSort("name")}>
                  Name <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>

              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={8}>
                    <div className="h-8 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium" data-label="Code">
                    {employee.employeeCode}
                  </TableCell>

                  <TableCell data-label="Name">
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.phone || employee.email || "No contact"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell data-label="Department">{employee.department || "-"}</TableCell>
                  <TableCell data-label="Designation">{employee.designation || "-"}</TableCell>

                  <TableCell data-label="Type">
                    <Badge variant="outline">
                      {employee.employeeType.replace("_", " ")}
                    </Badge>
                  </TableCell>

                  <TableCell data-label="Salary">
                    ₹{employee.salaryRate}{" "}
                    <span className="text-xs text-muted-foreground">
                      / {employee.salaryType.toLowerCase()}
                    </span>
                  </TableCell>

                  <TableCell data-label="Status">
                    <Badge
                      variant={
                        employee.status === "ACTIVE" ? "default" : "secondary"
                      }
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right" data-label="Action">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(employee)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onEdit(employee)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => setQrEmployee(employee)}>
                          <QrCode className="mr-2 h-4 w-4" />
                          Attendance QR
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => onDelete(employee)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={Boolean(qrEmployee)} onOpenChange={(open) => !open && setQrEmployee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attendance QR</DialogTitle>
            <DialogDescription>
              Scan this from the Factory1 capture station to mark attendance.
            </DialogDescription>
          </DialogHeader>

          {qrEmployee ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4 text-center">
                <img
                  src={qrUrl}
                  alt={`${qrEmployee.employeeCode} attendance QR`}
                  className="mx-auto h-auto w-full max-w-[240px]"
                />
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-950">
                  {qrEmployee.employeeCode} · {qrEmployee.name}
                </p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {qrPayload}
                </p>
              </div>
              <Button type="button" className="w-full" onClick={() => window.print()}>
                Print QR
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
