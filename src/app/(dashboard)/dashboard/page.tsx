import { Users, CalendarCheck, Wallet, Package } from "lucide-react";
import { AppPage } from "@/components/common/AppPage";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSection } from "@/components/common/PageSection";
import { StatCard } from "@/components/cards/StatCard";
import { AIInsightCard } from "@/components/cards/AIInsightCard";

export default function DashboardPage() {
  return (
    <AppPage>
      <PageHeader
        title="Dashboard"
        description="Welcome to your Factory1 workspace."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Employees"
          value="154"
          description="12 departments"
          icon={Users}
        />

        <StatCard
          title="Today Attendance"
          value="92%"
          description="142 present today"
          icon={CalendarCheck}
        />

        <StatCard
          title="Monthly Payroll"
          value="₹4.8L"
          description="Estimated this month"
          icon={Wallet}
        />

        <StatCard
          title="Inventory Items"
          value="328"
          description="24 low stock"
          icon={Package}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection
          title="Recent Activity"
          description="Latest updates from your factory"
        >
          <div className="space-y-3 text-sm text-slate-600">
            <p>Rahul Kumar marked present at 09:12 AM</p>
            <p>Payroll draft generated for June</p>
            <p>24 inventory items are below minimum stock</p>
          </div>
        </PageSection>

        <AIInsightCard
          insights={[
            "Attendance is 8% higher than last week.",
            "Overtime is increasing in the stitching department.",
            "24 inventory items may need reorder soon.",
          ]}
        />
      </div>
    </AppPage>
  );
}