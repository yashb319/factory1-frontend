"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/hook";
import type { FactoryUiMode } from "@/lib/uiModePreference";

export function useTallyMode() {
  const user = useAppSelector((state) => state.auth.user);
  const [tallyMode, setTallyMode] = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = () => {
      try {
        const pref = localStorage.getItem("factory1-ui-mode") as FactoryUiMode | null;
        setTallyMode(pref === "tally");
      } catch {
        setTallyMode(false);
      }
    };

    check();

    function handleModeChange(event: Event) {
      const detail = (event as CustomEvent<{ mode?: FactoryUiMode }>).detail;
      setTallyMode(detail?.mode === "tally");
    }

    window.addEventListener("factory1:ui-mode-change", handleModeChange);
    return () =>
      window.removeEventListener("factory1:ui-mode-change", handleModeChange);
  }, [user]);

  return tallyMode;
}
