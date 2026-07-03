import { OrganizationSettingsForm } from "@/features/organization-settings/components/OrganizationSettingsForm";
import { AccessManagementPanel } from "@/features/access/components/AccessManagementPanel";

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6 p-6">
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
    </div>
  );
}
