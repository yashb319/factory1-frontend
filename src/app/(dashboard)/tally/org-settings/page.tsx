import { Suspense } from "react";
import { TallyOrgSettingsView } from "@/features/organization-settings/components/TallyOrgSettingsView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TallyOrgSettingsView />
    </Suspense>
  );
}
