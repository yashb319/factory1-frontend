"use client";

import {
  CalendarDays,
  Mail,
  Phone,
  BadgeIndianRupee,
  BriefcaseBusiness,
  UserRound,
  Building2,
  IdCard,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Employee } from "../types/employee.types";

interface Props {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="mt-0.5 rounded-md bg-background p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value || "-"}</p>
      </div>
    </div>
  );
}

export function EmployeeDetailsDrawer({
  employee,
  open,
  onOpenChange,
}: Props) {
  if (!employee) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-2xl lg:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Employee Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-6">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <UserRound className="h-7 w-7 text-primary" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold">{employee.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {employee.designation || "No designation"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{employee.employeeCode}</Badge>
                    <Badge>
                      {employee.status}
                    </Badge>
                    <Badge variant="secondary">
                      {employee.employeeType.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Contact Information</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem icon={Phone} label="Phone" value={employee.phone} />
              <DetailItem icon={Mail} label="Email" value={employee.email} />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Employment Information</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem
                icon={IdCard}
                label="Employee Code"
                value={employee.employeeCode}
              />

              <DetailItem
                icon={Building2}
                label="Department"
                value={employee.department}
              />

              <DetailItem
                icon={BriefcaseBusiness}
                label="Designation"
                value={employee.designation}
              />

              <DetailItem
                icon={CalendarDays}
                label="Joining Date"
                value={employee.joiningDate}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Salary Information</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem
                icon={BadgeIndianRupee}
                label="Salary Rate"
                value={`₹${employee.salaryRate}`}
              />

              <DetailItem
                icon={BadgeIndianRupee}
                label="Salary Type"
                value={employee.salaryType}
              />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}