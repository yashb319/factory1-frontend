"use client";

import { Provider } from "react-redux";
import { BrandingProvider } from "@/features/whitelabel/components/BrandingProvider";
import { store } from "./store";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./hook";
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY, logout } from "@/features/auth/authSlice";

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <Provider store={store}>
      <SessionBoundary>{children}</SessionBoundary>
    </Provider>
  );
}

function SessionBoundary({ children }: Props) {
  const generation = useAppSelector((state) => state.auth.generation ?? 0);
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  useEffect(() => {
    function changed(event: StorageEvent) {
      if ((event.key === AUTH_TOKEN_STORAGE_KEY && event.newValue !== token) ||
          (event.key === AUTH_USER_STORAGE_KEY && event.newValue !== JSON.stringify(user)) ||
          event.key === null) {
        dispatch(logout());
      }
    }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [dispatch, token, user]);
  return <BrandingProvider key={generation}>{children}</BrandingProvider>;
}