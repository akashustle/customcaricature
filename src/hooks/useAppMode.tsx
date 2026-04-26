import { useEffect, useState } from "react";

/**
 * Detects whether the app is running inside a "real app" context:
 *   - Capacitor native (Android/iOS APK)
 *   - Installed PWA (display-mode: standalone, or iOS navigator.standalone)
 *
 * Browser visitors get `false` — they keep the existing website experience.
 * This is the single source of truth for "show the native app shell".
 */
export function useAppMode() {
  const [isAppMode, setIsAppMode] = useState<boolean>(() => detect());

  useEffect(() => {
    const update = () => setIsAppMode(detect());
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", update);
    window.addEventListener("appinstalled", update);
    return () => {
      mql?.removeEventListener?.("change", update);
      window.removeEventListener("appinstalled", update);
    };
  }, []);

  return isAppMode;
}

function detect(): boolean {
  if (typeof window === "undefined") return false;

  // Capacitor native detection (works without importing the package)
  // @ts-ignore
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  // @ts-ignore
  if ((window as any).cordova) return true;

  // Installed PWA on Android/desktop
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    if (window.matchMedia?.("(display-mode: fullscreen)").matches) return true;
    if (window.matchMedia?.("(display-mode: minimal-ui)").matches) return true;
  } catch {/* ignore */}

  // Installed PWA on iOS Safari
  // @ts-ignore
  if (window.navigator.standalone === true) return true;

  return false;
}

/** Sync helper for non-React contexts (e.g. main.tsx). */
export const isAppMode = detect;
