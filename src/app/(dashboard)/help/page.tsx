import { Suspense } from "react";
import { HelpCenterPage } from "@/features/help-center/components/HelpCenterPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HelpCenterPage />
    </Suspense>
  );
}
