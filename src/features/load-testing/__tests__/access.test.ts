import { describe, expect, it } from "vitest";
import {
  canAccessNavigationItem,
  navigationItems,
} from "@/config/navigation";
import { isPlatformAdminPath } from "@/features/auth/components/AuthGuard";
import type { AuthUser } from "@/features/auth/types";

describe("load-testing platform-admin access", () => {
  const item = navigationItems.find(
    (candidate) => candidate.href === "/admin/load-testing"
  );

  it("adds the route to platform-admin navigation only", () => {
    expect(item).toBeDefined();
    expect(
      canAccessNavigationItem(item!, {
        platformAdmin: true,
        role: "SAAS_OWNER",
      } as AuthUser)
    ).toBe(true);
    expect(
      canAccessNavigationItem(item!, {
        platformAdmin: false,
        role: "OWNER",
      } as AuthUser)
    ).toBe(false);
  });

  it("allows the load-testing route through the platform-admin guard", () => {
    expect(isPlatformAdminPath("/admin/load-testing")).toBe(true);
    expect(isPlatformAdminPath("/admin/load-testing/run")).toBe(true);
    expect(isPlatformAdminPath("/dashboard")).toBe(false);
  });
});
