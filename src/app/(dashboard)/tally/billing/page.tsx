import { Suspense } from "react";
import { BillingTallyView } from "@/features/billing/components/BillingTallyView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BillingTallyView />
    </Suspense>
  );
}
