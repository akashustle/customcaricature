import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { navigateInternally, normalizeInternalNavigationTarget } from "./lib/internal-navigation";
import { registerPWA } from "./lib/pwa-register";
import { initNativeShell } from "./lib/native-shell";

// Capture PWA install prompt for programmatic install
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
});

// Register service worker (offline support) — guarded against iframe/preview
registerPWA();

// Bootstrap Capacitor native shell (no-op in browser)
initNativeShell();

const nativeWindowOpen = window.open.bind(window);
window.open = ((url?: string | URL, target?: string, features?: string) => {
  const href = typeof url === "string" ? url : url?.toString();
  if (href && normalizeInternalNavigationTarget(href)) {
    navigateInternally(href);
    return window as unknown as Window;
  }

  return nativeWindowOpen(url as string | URL | undefined, target, features);
}) as typeof window.open;

createRoot(document.getElementById("root")!).render(
  <App />
);
