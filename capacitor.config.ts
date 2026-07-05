import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.factory1.mobile",
  appName: "Factory1",
  webDir: "mobile-web",
  server: {
    url: process.env.FACTORY1_MOBILE_URL ?? "https://factory1-frontend.vercel.app/login",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
