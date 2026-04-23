/**
 * PWA Service Worker registration with safety guards.
 *
 * - NEVER registers in Lovable preview/iframe (would cache stale builds).
 * - Auto-updates on new deploy.
 * - Logs offline ready state.
 */

const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isPreviewHost = (): boolean => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h.includes("lovable.app") === false && h.includes("lovable") === true
  );
};

export async function registerPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Hard block in iframe / Lovable preview — service workers there break HMR
  if (isInIframe()) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      regs.forEach((r) => r.unregister());
    } catch {}
    return;
  }

  // Only register on production builds (id-preview hosts skipped above already)
  if (isPreviewHost()) return;

  try {
    // Dynamic import so this entire chunk is excluded in dev
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        // Check for updates every 60 minutes while app is open
        if (registration) {
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60 * 60 * 1000);
        }
      },
      onNeedRefresh() {
        // Auto-apply update on next navigation; no toast spam
      },
      onOfflineReady() {
        // App ready to work offline — silent
      },
    });
  } catch {
    // virtual module not available in dev; ignore
  }
}
