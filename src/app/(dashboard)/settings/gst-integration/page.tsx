import { GstIntegrationPanel } from "@/features/gst-integration/components/GstIntegrationPanel";

export default function GstIntegrationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          GST & E-way Bill Integration
        </h1>
        <p className="text-sm text-slate-500">
          Connect the factory GSTIN to a GSP provider for outward and inward e-way bills.
        </p>
      </div>
      <GstIntegrationPanel />
    </div>
  );
}
