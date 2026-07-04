"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hook";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    if (user?.platformAdmin && pathname !== "/saas-admin") {
      router.replace("/saas-admin");
    }
  }, [mounted, pathname, token, user?.platformAdmin, router]);

  if (!mounted || !token) {
    return null;
  }

  return <>{children}</>;
}
