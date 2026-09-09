import { Suspense } from "react";
import { EmployeeActivation } from "@/features/auth/components/EmployeeActivation";

export default function ActivateEmployeePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <EmployeeActivation />
    </Suspense>
  );
}
