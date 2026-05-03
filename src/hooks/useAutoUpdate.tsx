import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHECK_INTERVAL = 5 * 60_000; // 5 minutes — was 30s and caused tight reload loops
const BUILD_HASH_KEY = "ccc_build_hash";

/**
 * Skip auto-update entirely in dev / preview / iframe contexts.
 * Vite's hashed asset filenames change on every HMR cycle, which previously
 * caused the page to reload itself every ~30 seconds inside the Lovable
 * editor preview and on the live preview domain.
 */
const shouldSkipAutoUpdate = (): boolean => {
  if (typeof window === "undefined") return true;
  // Dev mode (Vite serves un-hashed /src/* — no point polling)
  if (import.meta.env.DEV) return true;
  // Inside an iframe (Lovable editor preview)
  try { if (window.self !== window.top) return true; } catch { return true; }
  // Lovable preview / project hosts — the hash changes on every rebuild
  const host = window.location.hostname;
  if (host.includes("lovableproject.com") || host.includes("id-preview--") || host.includes("lovable.app")) {
    // Only allow on the published custom domain, not on preview subdomains
    if (host.includes("id-preview--") || host.includes("lovableproject.com")) return true;
  }
  return false;
};

/**
 * Polls index.html for changes in the built asset hashes.
 * Also listens to realtime admin_site_settings for app_update_push.
 * When a new deployment is detected, triggers a seamless reload.
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

      const match = html.match(/src="\/assets\/index-([a-zA-Z0-9]+)\.js"/);
      if (!match) return;

      const newHash = match[1];
      const storedHash = sessionStorage.getItem(BUILD_HASH_KEY);

      if (!storedHash) {
        sessionStorage.setItem(BUILD_HASH_KEY, newHash);
        return;
      }

      if (newHash !== storedHash) {
        // NEVER auto-reload — that caused the entire site (admin, dashboard,
        // public pages) to spontaneously refresh while users were typing /
        // navigating. Just refresh the SW silently in the background; the new
        // build will take effect on the user's next manual navigation/refresh.
        sessionStorage.setItem(BUILD_HASH_KEY, newHash);
        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) await reg.update();
          } catch { /* ignore */ }
        }
        // The visible "Update available" banner (AppUpdateBanner) lets the
        // user opt-in to a reload when they're ready.
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (shouldSkipAutoUpdate()) return;
    // Run on all pages — including admin — to ensure everyone gets updates
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Listen to realtime push updates from admin
    const channel = supabase
      .channel("app-update-broadcast")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_site_settings", filter: "id=eq.app_update_push" },
        (payload: any) => {
          const val = payload?.new?.value;
          if (val?.active) {
            // Force check immediately when admin pushes update
            setTimeout(() => checkForUpdate(), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [checkForUpdate]);
};

export default useAutoUpdate;
