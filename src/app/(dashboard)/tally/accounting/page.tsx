import { Suspense } from "react";
import { TallyAccountingView } from "@/features/accounting/components/TallyAccountingView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TallyAccountingView />
    </Suspense>
  );
}
