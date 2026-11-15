"use client";

import { useEffect } from "react";

/** Applies Capacitor status bar / splash when running inside the Android shell. */
export default function NativeShell() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || cancelled) return;

        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0b0f17" });

        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        // Browser / PWA — ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
