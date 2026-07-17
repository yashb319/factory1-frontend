import { Suspense } from "react";
import { TallyOrgSettingsView } from "@/features/organization-settings/tally/TallyOrgSettingsView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TallyOrgSettingsView />
    </Suspense>
  );
}
