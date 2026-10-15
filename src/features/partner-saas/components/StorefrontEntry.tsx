"use client";

import { usePathname } from "next/navigation";
import { ProductActivation } from "../onboarding/ProductActivation";
import { PartnerSessionGate } from "./PartnerSessionGate";

export function StorefrontEntry({ operationalEnabled }: { operationalEnabled: boolean }) {
  const pathname = usePathname();
  return pathname === "/activate"
    ? <ProductActivation />
    : <PartnerSessionGate operationalEnabled={operationalEnabled} />;
}
