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
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className={`fixed top-0 left-0 right-0 z-[9999] py-2.5 px-4 text-center text-sm font-sans font-medium flex items-center justify-center gap-2 shadow-lg ${
          isOffline
            ? "bg-destructive text-destructive-foreground"
            : "bg-amber-500 text-white"
        }`}
        role="alert"
        data-testid="network-banner"
        data-state={state}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {isOffline
            ? "You are offline — showing cached content"
            : "Slow network — using cached data, retrying in background"}
        </span>
        <button
          onClick={() => void revalidate()}
          className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
          aria-label="Retry now"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineDetector;
