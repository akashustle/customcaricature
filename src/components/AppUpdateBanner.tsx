import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles, Rocket, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_VERSION_KEY = "ccc_app_version";
const CHECK_INTERVAL = 20_000; // 20s

const AppUpdateBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"downloading" | "installing" | "done">("downloading");

  const checkForUpdate = useCallback(async () => {
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
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setUpdateAvailable(true);
      });
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
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    const firstCheck = setTimeout(checkForUpdate, 8_000);
    return () => { clearInterval(interval); clearTimeout(firstCheck); };
  }, [checkForUpdate]);

  const handleUpdate = async () => {
    setUpdating(true);
    setPhase("downloading");
    setProgress(0);

    // Animate progress phases
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

    await animate(0, 40, 800);
    setPhase("installing");

    // Skip waiting on service worker
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    }

    await animate(40, 85, 1000);

    // Pre-fetch new assets
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

    await animate(85, 100, 500);
    setPhase("done");
    sessionStorage.removeItem(APP_VERSION_KEY);

    await new Promise((r) => setTimeout(r, 600));
    window.location.reload();
  };

  // Full-screen updating overlay
  if (updating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(22 20% 12%), hsl(22 30% 8%), hsl(38 20% 10%))",
        }}
      >
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 6 + 2,
                height: Math.random() * 6 + 2,
                background: `hsla(${22 + Math.random() * 20}, 80%, ${60 + Math.random() * 20}%, ${0.3 + Math.random() * 0.4})`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -80, 0],
                x: [0, (Math.random() - 0.5) * 60, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.5, 0.8],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Animated icon */}
          <motion.div
            className="relative"
            animate={phase === "done" ? { scale: [1, 1.2, 1] } : { rotate: 360 }}
            transition={
              phase === "done"
                ? { duration: 0.5 }
                : { duration: 2, repeat: Infinity, ease: "linear" }
            }
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
              {phase === "done" ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
              ) : (
                <Rocket className="w-10 h-10 text-white" />
              )}
            </div>
          </motion.div>

          {/* Phase text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-1"
            >
              <h2 className="text-xl font-bold text-white">
                {phase === "downloading" && "Downloading Update..."}
                {phase === "installing" && "Installing Update..."}
                {phase === "done" && "Update Complete! ✨"}
              </h2>
              <p className="text-white/60 text-sm">
                {phase === "downloading" && "Fetching the latest version"}
                {phase === "installing" && "Applying changes to the app"}
                {phase === "done" && "Launching new version now"}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="w-64 sm:w-80">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(22 78% 52%), hsl(38 88% 50%), hsl(22 78% 52%))",
                  backgroundSize: "200% 100%",
                  animation: "gradient-shift 1.5s ease infinite",
                  width: `${progress}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-white/40 text-xs mt-2 font-mono">{Math.round(progress)}%</p>
          </div>
        </motion.div>

        {/* Brand footer */}
        <motion.p
          className="absolute bottom-8 text-white/20 text-xs font-medium tracking-wider"
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
            <span className="text-sm font-semibold font-sans">✨ New update available!</span>
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
            <button onClick={() => setDismissed(true)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AppUpdateBanner;
