import { Suspense } from "react";
import { TallyAccountingView } from "@/features/accounting/tally/TallyAccountingView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TallyAccountingView />
    </Suspense>
  );
}
