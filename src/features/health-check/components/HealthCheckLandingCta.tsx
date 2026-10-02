import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HealthCheckLandingCta() {
  return (
    <Button size="lg" asChild>
      <Link href="/health-check">
        Start health check
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
}
