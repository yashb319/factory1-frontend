"use client";

import { UserRound, Mail, Phone, Building2, IdCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetMyEmployeeQuery } from "@/features/employees/api/employeeApi";

export default function ProfilePage() {
  const { data: employee, isLoading, error } = useGetMyEmployeeQuery();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>;
  if (error || !employee) return <div className="p-6 text-sm text-destructive">Unable to load your employee profile.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Your linked Factory1 employee record.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-4 w-4" /> {employee.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Info icon={IdCard} label="Employee code" value={employee.employeeCode} />
          <Info icon={Mail} label="Email" value={employee.email} />
          <Info icon={Phone} label="Phone" value={employee.phone} />
          <Info icon={Building2} label="Department" value={employee.department} />
          <Info icon={UserRound} label="Designation" value={employee.designation} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return <div className="rounded-lg border bg-muted/30 p-3"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1 text-sm font-medium">{value || "-"}</p></div>;
}
