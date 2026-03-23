import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles, Rocket, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const APP_VERSION_KEY = "ccc_app_version";
const CHECK_INTERVAL = 30_000;

const AppUpdateBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"downloading" | "installing" | "done">("downloading");
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; message?: string }>({});

  // Check DB for admin-pushed updates
  const checkAdminUpdate = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "app_update_push")
        .maybeSingle();

      if (data?.value) {
        const config = data.value as any;
        const lastDismissed = localStorage.getItem("ccc_update_dismissed_v");
        if (config.active && config.version && config.version !== lastDismissed) {
          setUpdateInfo({ version: config.version, message: config.message });
          setUpdateAvailable(true);
        }
      }
    } catch {}
  }, []);

  // Also check for asset fingerprint changes
  const checkAssetUpdate = useCallback(async () => {
    try {
      const res = await fetch(`/?_t=${Date.now()}`, { cache: "no-store", headers: { Accept: "text/html" } });
      if (!res.ok) return;
      const html = await res.text();
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
    } catch {}
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => setUpdateAvailable(true));
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) setUpdateAvailable(true);
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

    checkAdminUpdate();
    const interval = setInterval(() => {
      checkAdminUpdate();
      checkAssetUpdate();
    }, CHECK_INTERVAL);
    const firstCheck = setTimeout(checkAssetUpdate, 8_000);

    // Realtime listener for admin-pushed updates
    const ch = supabase
      .channel("app-update-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "admin_site_settings",
        filter: "id=eq.app_update_push",
      }, () => checkAdminUpdate())
      .subscribe();

    return () => {
      clearInterval(interval);
      clearTimeout(firstCheck);
      supabase.removeChannel(ch);
    };
  }, [checkAdminUpdate, checkAssetUpdate]);

  const handleUpdate = async () => {
    setUpdating(true);
    setPhase("downloading");
    setProgress(0);

    const animate = (from: number, to: number, duration: number) =>
      new Promise<void>((resolve) => {
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const p = Math.min(elapsed / duration, 1);
          setProgress(from + (to - from) * p);
          if (p < 1) requestAnimationFrame(tick);
          else resolve();
        };
        tick();
      });

    await animate(0, 35, 700);
    setPhase("installing");

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    }

    await animate(35, 80, 900);

    try {
      const res = await fetch(`/?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const html = await res.text();
        const scripts = html.match(/src="(\/assets\/[^"]+)"/g) || [];
        await Promise.allSettled(
          scripts.map((s) => {
            const url = s.replace(/src="([^"]+)"/, "$1");
            return fetch(url, { cache: "no-store" });
          })
        );
      }
    } catch {}

    await animate(80, 100, 500);
    setPhase("done");
    sessionStorage.removeItem(APP_VERSION_KEY);

    if (updateInfo.version) {
      localStorage.setItem("ccc_update_dismissed_v", updateInfo.version);
    }

    await new Promise((r) => setTimeout(r, 600));
    window.location.reload();
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (updateInfo.version) {
      localStorage.setItem("ccc_update_dismissed_v", updateInfo.version);
    }
  };

  // Full-screen updating overlay
  if (updating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background"
      >
        {/* Soft background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-primary/10"
              style={{
                width: Math.random() * 100 + 40,
                height: Math.random() * 100 + 40,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.1, 0.3, 0.1],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* App logo */}
          <motion.img
            src="/logo.png"
            alt="CCC"
            className="w-20 h-20 rounded-2xl border-2 border-border shadow-lg"
            animate={phase === "done" ? { scale: [1, 1.1, 1] } : { rotate: [0, 5, -5, 0] }}
            transition={phase === "done" ? { duration: 0.5 } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-calligraphy font-bold text-foreground">
                {phase === "downloading" && "Downloading Update..."}
                {phase === "installing" && "Installing Update..."}
                {phase === "done" && "Update Complete! ✨"}
              </h2>
              <p className="text-muted-foreground text-sm font-body">
                {phase === "downloading" && "Fetching the latest version"}
                {phase === "installing" && "Applying changes"}
                {phase === "done" && "Launching new version now"}
              </p>
              {updateInfo.version && (
                <p className="text-xs text-primary font-body font-semibold">
                  Version {updateInfo.version}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="w-72 sm:w-80">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-muted-foreground text-xs mt-2 font-mono">{Math.round(progress)}%</p>
          </div>
        </motion.div>

        <motion.p
          className="absolute bottom-8 text-muted-foreground/50 text-xs font-body font-medium tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          CREATIVE CARICATURE CLUB
        </motion.p>
      </motion.div>
    );
  }

  if (!updateAvailable || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-[10000] px-4 py-3 bg-card border-b border-border shadow-lg"
      >
        <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-body font-semibold text-foreground truncate">
                {updateInfo.message || "New update available!"}
              </p>
              {updateInfo.version && (
                <p className="text-xs text-muted-foreground font-body">Version {updateInfo.version}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleUpdate}
              className="rounded-full font-body text-xs gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update
            </Button>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AppUpdateBanner;
