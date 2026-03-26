import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { navigateInternally, normalizeInternalNavigationTarget } from "./lib/internal-navigation";

// Capture PWA install prompt for programmatic install
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
});

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
