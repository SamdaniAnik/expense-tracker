import type { CapacitorConfig } from "@capacitor/cli";

/** Live Ledger site loaded inside the Android WebView. Override with NEXT_PUBLIC_APP_URL. */
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://personal-costing-app.vercel.app";

const config: CapacitorConfig = {
  appId: "com.samdanianik.ledger",
  appName: "Ledger",
  webDir: "www",
  server: {
    url: appUrl,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "personal-costing-app.vercel.app",
      "*.vercel.app",
      "*.supabase.co",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0b0f17",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0f17",
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b0f17",
  },
};

export default config;
