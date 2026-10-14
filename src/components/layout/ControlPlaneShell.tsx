"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { canAccessNavigationItem, navigationItems } from "@/config/navigation";
import { logout } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { useBranding } from "@/features/whitelabel/components/BrandingProvider";

export function ControlPlaneShell({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { displayName } = useBranding();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a href="#control-plane-content" className="sr-only focus:not-sr-only">Skip to content</a>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white p-4">
        <p className="font-semibold">{displayName} · {user?.platformAdmin ? "Platform administration" : "Partner administration"}</p>
        <Button variant="outline" onClick={() => { dispatch(logout()); router.replace("/login"); }}>Sign out</Button>
      </header>
      <nav aria-label="Administration" className="flex flex-wrap gap-2 border-b bg-white p-4">
        {navigationItems.filter((item) => canAccessNavigationItem(item, user)).map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}
            className="rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600 aria-[current=page]:bg-slate-100">
            {item.title}
          </Link>
        ))}
      </nav>
      <main id="control-plane-content" tabIndex={-1} className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
