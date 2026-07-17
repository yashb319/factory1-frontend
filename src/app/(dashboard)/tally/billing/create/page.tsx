import { Suspense } from "react";
import { BillingTallyView } from "@/features/billing/tally/BillingTallyView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BillingTallyView initialScreen="create" />
    </Suspense>
  );
}
