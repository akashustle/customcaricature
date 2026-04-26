import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles, Rocket, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const CHECK_INTERVAL = 5 * 60_000; // 5 min — was 30s and caused constant network chatter + re-renders
const DISMISSED_VERSION_KEY = "ccc_update_dismissed_v";

/**
 * Skip update polling entirely on dev / preview / iframe so the dashboard
 * doesn't constantly re-fetch settings and trigger card shimmer flashes.
 */
const shouldSkipUpdateCheck = (): boolean => {
  if (typeof window === "undefined") return true;
  if (import.meta.env.DEV) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const host = window.location.hostname;
  if (host.includes("lovableproject.com") || host.includes("id-preview--")) return true;
  return false;
};
const APPLIED_VERSION_KEY = "ccc_update_applied_v";
const REMIND_AT_KEY = "ccc_update_remind_at";
const POPUP_OPEN_KEY = "ccc_update_popup_open_v";
const DEFAULT_REMINDER_HOURS = 4;

const AppUpdateBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"downloading" | "installing" | "done">("downloading");
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; message?: string }>({});

  const checkAdminUpdate = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "app_update_push")
        .maybeSingle();

      if (data?.value) {
        const config = data.value as any;
        const version = config.version as string | undefined;
        const reminderHours = Number(config.remind_after_hours || DEFAULT_REMINDER_HOURS);
        const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
        const appliedVersion = localStorage.getItem(APPLIED_VERSION_KEY);
        const popupOpenVersion = localStorage.getItem(POPUP_OPEN_KEY);
        const remindAt = Number(localStorage.getItem(REMIND_AT_KEY) || "0");

        if (!config.active || !version || version === appliedVersion) {
          setUpdateAvailable(false);
          setDismissed(false);
          return;
        }

        const reminderDue = !remindAt || Date.now() >= remindAt;
        const blockedByDismiss = dismissedVersion === version && !reminderDue;
        const blockedByOtherTab = popupOpenVersion === version && !updateAvailable;

        if (!blockedByDismiss && !blockedByOtherTab) {
          setUpdateInfo({ version: config.version, message: config.message });
          setDismissed(false);
          setUpdateAvailable(true);
          localStorage.setItem(POPUP_OPEN_KEY, version);
        } else if (dismissedVersion === version && reminderDue) {
          localStorage.removeItem(DISMISSED_VERSION_KEY);
          localStorage.removeItem(REMIND_AT_KEY);
          setUpdateInfo({ version: config.version, message: config.message });
          setDismissed(false);
          setUpdateAvailable(true);
          localStorage.setItem(POPUP_OPEN_KEY, version);
        } else if (blockedByDismiss) {
          setUpdateAvailable(false);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkAdminUpdate();
    const interval = setInterval(checkAdminUpdate, CHECK_INTERVAL);

    const ch = supabase
      .channel("app-update-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "admin_site_settings",
        filter: "id=eq.app_update_push",
      }, () => checkAdminUpdate())
      .subscribe();

    const syncAcrossTabs = (event: StorageEvent) => {
      if ([DISMISSED_VERSION_KEY, APPLIED_VERSION_KEY, REMIND_AT_KEY, POPUP_OPEN_KEY].includes(event.key || "")) {
        checkAdminUpdate();
      }
    };

    window.addEventListener("storage", syncAcrossTabs);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", syncAcrossTabs);
      supabase.removeChannel(ch);
    };
  }, [checkAdminUpdate, updateAvailable]);

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
      await navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    } catch {}

    await animate(80, 100, 500);
    setPhase("done");

    if (updateInfo.version) {
      localStorage.setItem(APPLIED_VERSION_KEY, updateInfo.version);
      localStorage.removeItem(DISMISSED_VERSION_KEY);
      localStorage.removeItem(REMIND_AT_KEY);
      localStorage.removeItem(POPUP_OPEN_KEY);
    }

    await new Promise((r) => setTimeout(r, 600));
    window.location.reload();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setUpdateAvailable(false);
    if (updateInfo.version) {
      localStorage.setItem(DISMISSED_VERSION_KEY, updateInfo.version);
      localStorage.setItem(REMIND_AT_KEY, String(Date.now() + DEFAULT_REMINDER_HOURS * 60 * 60 * 1000));
      localStorage.removeItem(POPUP_OPEN_KEY);
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
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/15 blur-2xl"
                animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                animate={phase === "done" ? { y: [0, -10, 0] } : { y: [12, -28, 12], rotate: [-4, 0, 4] }}
                transition={{ duration: phase === "done" ? 0.8 : 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex h-28 w-28 items-center justify-center rounded-full border border-border bg-card shadow-xl"
              >
                {phase === "done" ? <CheckCircle2 className="h-14 w-14 text-primary" /> : <Rocket className="h-14 w-14 text-primary" />}
              </motion.div>
              <Sparkles className="absolute -right-2 top-2 h-5 w-5 text-accent" />
              <Sparkles className="absolute -left-1 bottom-4 h-4 w-4 text-primary" />
            </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-calligraphy font-bold text-foreground">
                {phase === "downloading" && "Preparing Launch..."}
                {phase === "installing" && "Installing Update..."}
                {phase === "done" && "Update Complete! ✨"}
              </h2>
              <p className="text-muted-foreground text-sm font-body">
                {phase === "downloading" && "Fueling your latest CCC release"}
                {phase === "installing" && "Applying fresh changes live"}
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
