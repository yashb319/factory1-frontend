import { OrganizationSettingsForm } from "@/features/organization-settings/components/OrganizationSettingsForm";
import { TerminateOrganizationPanel } from "@/features/organization-settings/components/TerminateOrganizationPanel";
import { AccessManagementPanel } from "@/features/access/components/AccessManagementPanel";

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-sm text-slate-500">
          Configure payroll, attendance, working hours, currency and financial year settings.
        </p>
      </div>

      <OrganizationSettingsForm />
      <AccessManagementPanel />
      <TerminateOrganizationPanel />
    </div>
  );
}
