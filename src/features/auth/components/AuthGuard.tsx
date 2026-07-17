"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import {
  AUTH_LAST_ACTIVITY_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  logout,
} from "../authSlice";

type AuthGuardProps = {
  children: React.ReactNode;
};

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 30 * 1000;
const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

export function AuthGuard({ children }: AuthGuardProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const [mounted, setMounted] = useState(false);
  const logoutTimerRef = useRef<number | null>(null);
  const lastActivityWriteRef = useRef(0);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const logoutInactiveUser = useCallback(() => {
    clearLogoutTimer();
    dispatch(logout());
    router.replace("/login");
  }, [clearLogoutTimer, dispatch, router]);

  const scheduleLogout = useCallback(
    (lastActivityAt: number) => {
      clearLogoutTimer();

      const inactiveFor = Date.now() - lastActivityAt;
      const remainingTime = INACTIVITY_TIMEOUT_MS - inactiveFor;

      if (remainingTime <= 0) {
        logoutInactiveUser();
        return;
      }

      logoutTimerRef.current = window.setTimeout(
        logoutInactiveUser,
        remainingTime
      );
    },
    [clearLogoutTimer, logoutInactiveUser]
  );

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

    if (
      user?.organizationStatus === "PENDING_APPROVAL" &&
      !user.platformAdmin &&
      !pathname.startsWith("/registration-pending")
    ) {
      router.replace("/registration-pending");
      return;
    }

    if (
      user?.platformAdmin &&
      !pathname.startsWith("/saas-admin")
    ) {
      router.replace("/saas-admin");
    }
  }, [
    mounted,
    pathname,
    token,
    user?.organizationStatus,
    user?.platformAdmin,
    router,
  ]);

  useEffect(() => {
    if (!mounted || !token) {
      clearLogoutTimer();
      return;
    }

    const storedActivity = Number(
      window.localStorage.getItem(AUTH_LAST_ACTIVITY_STORAGE_KEY)
    );
    const lastActivityAt = Number.isFinite(storedActivity)
      ? storedActivity
      : Date.now();

    window.localStorage.setItem(
      AUTH_LAST_ACTIVITY_STORAGE_KEY,
      String(lastActivityAt)
    );
    lastActivityWriteRef.current = lastActivityAt;
    scheduleLogout(lastActivityAt);

    function markActive() {
      const now = Date.now();

      if (now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) {
        return;
      }

      lastActivityWriteRef.current = now;
      window.localStorage.setItem(AUTH_LAST_ACTIVITY_STORAGE_KEY, String(now));
      scheduleLogout(now);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === AUTH_TOKEN_STORAGE_KEY && !event.newValue) {
        logoutInactiveUser();
        return;
      }

      if (event.key !== AUTH_LAST_ACTIVITY_STORAGE_KEY || !event.newValue) {
        return;
      }

      const nextActivityAt = Number(event.newValue);

      if (Number.isFinite(nextActivityAt)) {
        lastActivityWriteRef.current = nextActivityAt;
        scheduleLogout(nextActivityAt);
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true });
    });
    window.addEventListener("storage", handleStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
      window.removeEventListener("storage", handleStorage);
      clearLogoutTimer();
    };
  }, [
    clearLogoutTimer,
    logoutInactiveUser,
    mounted,
    scheduleLogout,
    token,
  ]);

  if (!mounted || !token) {
    return null;
  }

  return <>{children}</>;
}
