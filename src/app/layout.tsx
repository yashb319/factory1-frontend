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
  title: "Factory1",
  description: "Factory operations management platform",
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