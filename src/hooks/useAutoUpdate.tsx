import { useEffect, useCallback } from "react";

const CHECK_INTERVAL = 45_000; // 45 seconds
const BUILD_HASH_KEY = "ccc_build_hash";

/**
 * Polls index.html for changes in the built asset hashes.
 * When a new deployment is detected, triggers a seamless reload
 * so users always see the latest version without manual refresh.
 */
const useAutoUpdate = () => {
  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(`/?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) return;
      const html = await res.text();

      // Extract main JS bundle hash from the HTML
      const match = html.match(/src="\/assets\/index-([a-zA-Z0-9]+)\.js"/);
      if (!match) return;

      const newHash = match[1];
      const storedHash = sessionStorage.getItem(BUILD_HASH_KEY);

      if (!storedHash) {
        // First load — just store
        sessionStorage.setItem(BUILD_HASH_KEY, newHash);
        return;
      }

      if (newHash !== storedHash) {
        sessionStorage.setItem(BUILD_HASH_KEY, newHash);
        
        // Update service worker first
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            reg.waiting?.postMessage({ type: "SKIP_WAITING" });
          }
        }

        // Reload seamlessly
        window.location.reload();
      }
    } catch {
      // Silent fail — network issues shouldn't break the app
    }
  }, []);

  useEffect(() => {
    // Don't run on admin pages to avoid interrupting admin work
    if (window.location.pathname.startsWith("/admin") || 
        window.location.pathname.startsWith("/customcad75")) {
      return;
    }

    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    
    // Also check on visibility change (tab comes back to focus)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkForUpdate]);
};

export default useAutoUpdate;
