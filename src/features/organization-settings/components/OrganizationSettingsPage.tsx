import { OrganizationSettingsForm } from "@/features/organization-settings/components/OrganizationSettingsForm";
import { TerminateOrganizationPanel } from "@/features/organization-settings/components/TerminateOrganizationPanel";
import { AccessManagementPanel } from "@/features/access/components/AccessManagementPanel";
import { GstIntegrationPanel } from "@/features/gst-integration/components/GstIntegrationPanel";

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">
          Organization Settings
        </h1>
        <p className="text-xs text-[var(--factory1-text-muted)]">
          Configure payroll, attendance, working hours, currency and financial year settings.
        </p>
      </div>

      <OrganizationSettingsForm />
      <GstIntegrationPanel />
      <AccessManagementPanel />
      <TerminateOrganizationPanel />
    </div>
  );
}
