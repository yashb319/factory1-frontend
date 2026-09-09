"use client";

import { Provider } from "react-redux";
import { BrandingProvider } from "@/features/whitelabel/components/BrandingProvider";
import { store } from "./store";

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <Provider store={store}>
      <BrandingProvider>{children}</BrandingProvider>
    </Provider>
  );
}