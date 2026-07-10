import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/lib/providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Factory1 - AI first ERP",
  description: "Factory1 AI first ERP for factory operations management",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <AppProviders>
          {children}
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </AppProviders>
      </body>
    </html>
  );
}
