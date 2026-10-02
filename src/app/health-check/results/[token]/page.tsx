import type { Metadata } from "next";
import { HealthCheckResultPage } from "@/features/health-check/components/HealthCheckResultPage";

export const metadata: Metadata = {
  title: "Your Factory Health Check | Factory1",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <HealthCheckResultPage token={token} />;
}
