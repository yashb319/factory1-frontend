import { ProductionPage } from "@/features/production/components/ProductionPage";
import { Suspense } from "react";

export default function Page() {
  return <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading production...</p>}><ProductionPage /></Suspense>;
}
