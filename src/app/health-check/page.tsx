import type { Metadata } from "next";
import { HealthCheckPage } from "@/features/health-check/components/HealthCheckPage";

export const metadata: Metadata = {
  title: "Factory Operations Health Check | Factory1",
  description: "A five-minute health check for factory operations, people, inventory, finance, and reporting.",
};

export default function Page() {
  return <HealthCheckPage />;
}
