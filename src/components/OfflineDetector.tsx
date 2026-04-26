import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { invalidateCache } from "@/lib/request-cache";

/**
 * Network awareness banner.
 *
 * Surfaces three states to the UI:
 *   1. Hard offline   — navigator.onLine === false. Shown immediately.
 *   2. Poor network   — Supabase / fetch calls have failed repeatedly within
 *                       the rolling 30s window. UI keeps rendering from cache.
 *   3. Recovering     — once back online, ping Supabase, clear stale-marker,
 *                       and broadcast a re-validation event so dashboards
 *                       can refresh without a full reload.
 *
 * Failure counting hooks into the same `window.fetch` interception we set up
 * in `error-reporter.ts` — we listen on a custom event so we never re-wrap
 * fetch twice.
 */

const SUPABASE_PING = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/auth/v1/health`;
const FAILURE_WINDOW_MS = 30_000;
const FAILURE_THRESHOLD = 3;

type NetState = "online" | "offline" | "degraded";

const failures: number[] = [];

// Lightweight global failure tracker — error-reporter dispatches this event.
const trackFailure = () => {
  const now = Date.now();
  failures.push(now);
  while (failures.length && now - failures[0] > FAILURE_WINDOW_MS) failures.shift();
  if (failures.length >= FAILURE_THRESHOLD) {
    window.dispatchEvent(new CustomEvent("ccc:network-degraded"));
  }
};

if (typeof window !== "undefined") {
  // Hook into the fetch wrapper installed by error-reporter
  window.addEventListener("ccc:fetch-failure", trackFailure as EventListener);
}

const OfflineDetector = () => {
  const [state, setState] = useState<NetState>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
  );
  const recoveringRef = useRef(false);

  const revalidate = useCallback(async () => {
    if (recoveringRef.current) return;
    recoveringRef.current = true;
    try {
      // Best-effort ping — if it returns OK, we trust the network is back.
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 4000);
      try {
        const res = await fetch(SUPABASE_PING, { signal: ctrl.signal, cache: "no-store" });
        window.clearTimeout(timer);
        if (res.ok || res.status === 404) {
          // 404 still means the host is reachable
          failures.length = 0;
          setState("online");
          // Force-refresh dashboard caches without reloading the page
          invalidateCache("dashboard:", true);
          invalidateCache("workshop:", true);
          window.dispatchEvent(new CustomEvent("ccc:network-recovered"));
        }
      } catch {
        // ping failed — stay degraded
      }
    } finally {
      recoveringRef.current = false;
    }
  }, []);

  useEffect(() => {
    const onOffline = () => setState("offline");
    const onOnline = () => {
      setState("online");
      void revalidate();
    };
    const onDegraded = () => {
      setState((prev) => (prev === "offline" ? prev : "degraded"));
    };
    const onRecovered = () => setState("online");

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("ccc:network-degraded", onDegraded as EventListener);
    window.addEventListener("ccc:network-recovered", onRecovered as EventListener);

    // Periodic self-heal: while degraded, attempt revalidation every 8s
    const id = window.setInterval(() => {
      if (state === "degraded" && navigator.onLine) void revalidate();
    }, 8000);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("ccc:network-degraded", onDegraded as EventListener);
      window.removeEventListener("ccc:network-recovered", onRecovered as EventListener);
      window.clearInterval(id);
    };
  }, [revalidate, state]);

  if (state === "online") return null;

  const isOffline = state === "offline";
  const Icon = isOffline ? WifiOff : CloudOff;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="fixed top-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-sm z-[9999]"
        role="alert"
        data-testid="network-banner"
        data-state={state}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div
          className={`relative overflow-hidden rounded-3xl border shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] ${
            isOffline
              ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/10"
              : "bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 border-white/20"
          }`}
        >
          {/* Animated glow accent */}
          <motion.div
            aria-hidden
            className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl ${
              isOffline ? "bg-rose-500/30" : "bg-yellow-300/40"
            }`}
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative flex items-center gap-3 px-4 py-3.5">
            {/* Pulsing icon */}
            <div className="shrink-0 relative">
              <motion.div
                className={`absolute inset-0 rounded-2xl ${isOffline ? "bg-rose-500/40" : "bg-yellow-300/40"}`}
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center ${
                isOffline ? "bg-gradient-to-br from-rose-500 to-rose-700" : "bg-white/25"
              }`}>
                <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold leading-tight text-white tracking-tight">
                {isOffline ? "You're offline" : "Slow connection"}
              </div>
              <div className="text-[11.5px] leading-snug mt-0.5 text-white/80">
                {isOffline
                  ? "All your data is saved on this device"
                  : "Showing cached data — auto-retrying"}
              </div>
            </div>

            <button
              onClick={() => void revalidate()}
              className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-bold bg-white/15 hover:bg-white/25 active:scale-95 transition-all px-3 py-1.5 rounded-xl text-white border border-white/20"
              aria-label="Retry now"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineDetector;
