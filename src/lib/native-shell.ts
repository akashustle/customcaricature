/**
 * Native shell bootstrap for Capacitor (Android / iOS).
 *
 * Runs only when the app is wrapped in Capacitor — completely no-op in the
 * browser/PWA build, so it cannot break the web preview.
 *
 * Wires up:
 *   - StatusBar: matches our cream brand background
 *   - SplashScreen: hide as soon as React mounts
 *   - App: hardware back button → router back, deep links → router push
 *   - Keyboard: smooth resize without layout jumps
 *   - Network: reflects offline state into the existing network event bus
 */

import { Capacitor } from "@capacitor/core";

export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const [{ StatusBar, Style }, { SplashScreen }, { App }, { Keyboard }, { Network }] =
      await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/app"),
        import("@capacitor/keyboard"),
        import("@capacitor/network"),
      ]);

    // Status bar — match our brand cream
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#fdf8f3" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch {/* noop on iOS */}

    // Hide splash quickly once JS is ready
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
    }, 400);

    // Hardware back button → router back, exit on root
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Deep links: caricatureclub://order/123 → /order/123
    App.addListener("appUrlOpen", (event) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname + url.search + url.hash;
        if (path) window.dispatchEvent(new CustomEvent("ccc:deep-link", { detail: path }));
      } catch {/* ignore */}
    });

    // Smooth keyboard handling
    Keyboard.addListener("keyboardWillShow", (info) => {
      document.documentElement.style.setProperty("--kb-height", `${info.keyboardHeight}px`);
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.style.setProperty("--kb-height", "0px");
    });

    // Reflect native network state into the same bus OfflineDetector listens on
    const status = await Network.getStatus();
    if (!status.connected) {
      window.dispatchEvent(new Event("offline"));
    }
    Network.addListener("networkStatusChange", (s) => {
      window.dispatchEvent(new Event(s.connected ? "online" : "offline"));
    });
  } catch (err) {
    console.warn("[native-shell] init failed", err);
  }
}

/** Quick helper to know if we're inside a Capacitor app (vs. browser). */
export const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
