"use client";

import { useEffect } from "react";
import { isMobileUserAgent } from "@/lib/device";

/** Keeps data-shell in sync on the client (covers “Request desktop site” toggles). */
export default function DeviceShell({ initial }: { initial: "mobile" | "desktop" }) {
  useEffect(() => {
    function apply() {
      const uaMobile = isMobileUserAgent(navigator.userAgent);
      const narrow = window.matchMedia("(max-width: 1023px)").matches;
      const touchTablet =
        navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 1280px)").matches;
      const shell = uaMobile || narrow || touchTablet ? "mobile" : "desktop";
      document.documentElement.dataset.shell = shell;
    }
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [initial]);

  return null;
}
