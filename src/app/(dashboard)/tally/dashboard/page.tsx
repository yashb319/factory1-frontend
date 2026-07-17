import { Suspense } from "react";
import { TallyDashboardView } from "@/features/dashboard/tally/TallyDashboardView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TallyDashboardView />
    </Suspense>
  );
}
