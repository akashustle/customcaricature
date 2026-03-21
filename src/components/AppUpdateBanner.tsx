import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_VERSION_KEY = "ccc_app_version";
const CHECK_INTERVAL = 30_000; // 30s

const AppUpdateBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      // Fetch the index.html to detect new build hash
      const res = await fetch(`/?_t=${Date.now()}`, { cache: "no-store", headers: { Accept: "text/html" } });
      if (!res.ok) return;
      const html = await res.text();
      
      // Extract script src hashes as version fingerprint
      const scriptMatches = html.match(/src="\/assets\/[^"]+"/g);
      const currentVersion = scriptMatches ? scriptMatches.join(",") : "";
      
      const storedVersion = sessionStorage.getItem(APP_VERSION_KEY);
      
      if (!storedVersion) {
        sessionStorage.setItem(APP_VERSION_KEY, currentVersion);
        return;
      }
      
      if (currentVersion && storedVersion !== currentVersion) {
        setUpdateAvailable(true);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    // Also listen for SW update events
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setUpdateAvailable(true);
      });

      // Check registration for waiting worker
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setUpdateAvailable(true);
        }
        reg?.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }

    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    // First check after 10s
    const firstCheck = setTimeout(checkForUpdate, 10_000);
    return () => {
      clearInterval(interval);
      clearTimeout(firstCheck);
    };
  }, [checkForUpdate]);

  const handleUpdate = () => {
    sessionStorage.removeItem(APP_VERSION_KEY);
    // Skip waiting on service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      });
    }
    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center px-4 py-2"
        style={{
          background: "linear-gradient(135deg, hsl(22 78% 52%), hsl(38 88% 50%), hsl(22 78% 52%))",
          backgroundSize: "200% 200%",
          animation: "gradient-shift 3s ease infinite",
        }}
      >
        <div className="flex items-center gap-3 text-white max-w-lg w-full justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-semibold font-sans">
              ✨ New update available!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUpdate}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm text-xs h-7 px-3 gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Update Now
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AppUpdateBanner;
