/**
 * Real-time error reporting + alert pipeline.
 *
 * Captures three classes of issues:
 *   1. Uncaught exceptions and unhandled promise rejections.
 *   2. Failed fetch / supabase calls (network errors, 5xx responses).
 *   3. Repeated query bursts surfaced by request-cache.
 *
 * Reports go to:
 *   • console (always)
 *   • window.__cccErrors ring buffer (dev/preview)
 *   • optional Supabase `admin_security_alerts` insert (best-effort,
 *     only for high-severity crashes from the public site).
 *
 * Designed to be zero-dependency on React: a single install() call from
 * App.tsx wires everything up.
 */

import { supabase } from "@/integrations/supabase/client";

export type ErrorSeverity = "info" | "warn" | "error" | "critical";

export interface ErrorEvent {
  severity: ErrorSeverity;
  source: string;
  message: string;
  detail?: string;
  ts: number;
  url?: string;
}

const RING_LIMIT = 200;
const ring: ErrorEvent[] = [];
const isBrowser = typeof window !== "undefined";

const isDevLike = (() => {
  if (!isBrowser) return false;
  if (import.meta.env.DEV) return true;
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
})();

if (isBrowser && isDevLike) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__cccErrors = ring;
}

const lastReport = new Map<string, number>();
const REPORT_DEDUPE_MS = 30_000; // don't spam the same error within 30s

const shouldEmit = (key: string) => {
  const now = Date.now();
  const prev = lastReport.get(key) ?? 0;
  if (now - prev < REPORT_DEDUPE_MS) return false;
  lastReport.set(key, now);
  return true;
};

const push = (ev: ErrorEvent) => {
  ring.unshift(ev);
  if (ring.length > RING_LIMIT) ring.length = RING_LIMIT;

  // Console output
  const fn =
    ev.severity === "critical" || ev.severity === "error"
      ? console.error
      : ev.severity === "warn"
        ? console.warn
        : console.info;
  fn(`[${ev.severity}] ${ev.source} — ${ev.message}`, ev.detail ?? "");

  // Best-effort remote alert for production-grade crashes
  if (!isDevLike && (ev.severity === "critical" || ev.severity === "error")) {
    if (!shouldEmit(`remote:${ev.source}:${ev.message}`)) return;
    try {
      void supabase
        .from("admin_security_alerts")
        .insert({
          alert_type: "client_error",
          severity: ev.severity === "critical" ? "high" : "medium",
          title: `${ev.source}: ${ev.message}`.slice(0, 200),
          description: `${ev.detail ?? ""}\nURL: ${ev.url ?? ""}`.slice(0, 1000),
        })
        .then(() => undefined, () => undefined);
    } catch {
      /* ignore — never let reporter crash the app */
    }
  }
};

export const reportError = (
  source: string,
  message: string,
  detail?: unknown,
  severity: ErrorSeverity = "error",
) => {
  if (!shouldEmit(`local:${source}:${message}`)) return;
  push({
    severity,
    source,
    message,
    detail: detail instanceof Error ? `${detail.message}\n${detail.stack ?? ""}` : detail ? String(detail) : undefined,
    ts: Date.now(),
    url: isBrowser ? window.location.href : undefined,
  });
};

export const reportBurst = (key: string, count: number, windowMs: number) => {
  push({
    severity: "warn",
    source: "request-cache",
    message: `query burst on ${key}`,
    detail: `${count} calls in ${Math.round(windowMs / 1000)}s — check effect dependencies`,
    ts: Date.now(),
    url: isBrowser ? window.location.href : undefined,
  });
};

/** Read the in-memory ring buffer of recent client errors (newest first). */
export const getRecentErrors = (): ErrorEvent[] => ring.slice();


let installed = false;
export const installErrorReporter = () => {
  if (!isBrowser || installed) return;
  installed = true;

  window.addEventListener("error", (e) => {
    // Filter out script load failures from third-party iframes
    if (!e.message || e.message === "Script error.") return;
    reportError("window.error", e.message, e.error ?? e.filename, "error");
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const msg = reason instanceof Error ? reason.message : String(reason ?? "unknown");
    reportError("unhandledrejection", msg, reason, "error");
  });

  // Wrap fetch to catch network failures and 5xx without forcing every
  // call site to add try/catch. We never modify the response — we just
  // observe failures and forward them to the reporter.
  const origFetch = window.fetch.bind(window);
  const emitFailure = () => {
    try { window.dispatchEvent(new CustomEvent("ccc:fetch-failure")); } catch { /* ignore */ }
  };
  window.fetch = async (input, init) => {
    try {
      const res = await origFetch(input, init);
      if (res.status >= 500) {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
        reportError("fetch", `HTTP ${res.status}`, url, "warn");
        emitFailure();
      }
      return res;
    } catch (err) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      // Skip noisy aborts caused by route changes
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      reportError("fetch", "network failure", `${url}: ${(err as Error)?.message ?? err}`, "warn");
      emitFailure();
      throw err;
    }
  };
};
