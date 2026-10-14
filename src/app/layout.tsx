import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/lib/providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import { StorefrontBoundary, legacyRequest } from "@/features/partner-saas/StorefrontBoundary";
import { FoundationStorefront } from "@/features/partner-saas/components/FoundationStorefront";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const factoryMetadata: Metadata = {
  title: "Factory1 - AI first ERP",
  description: "Factory1 AI first ERP for factory operations management",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return await legacyRequest() ? factoryMetadata : {
    title: "Product storefront",
    description: "Product storefront readiness",
    robots: { index: false, follow: false },
    icons: { icon: [] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <Suspense fallback={<FoundationStorefront state="loading" />}>
          <StorefrontBoundary>
            <AppProviders>
              {children}
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </AppProviders>
          </StorefrontBoundary>
        </Suspense>
      </body>
    </html>
  );
}
