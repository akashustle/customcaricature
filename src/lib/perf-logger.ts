/**
 * Lightweight performance logger.
 *
 * Only emits in dev / on Lovable preview hosts so production stays silent.
 * Use it from dashboard hooks to time expensive operations:
 *
 *   const stop = perfMark("dashboard:fetchProfile");
 *   await fetchProfile();
 *   stop();
 *
 * It also pushes results into a window-accessible ring buffer so you can
 * inspect them in the console: `window.__cccPerf` returns the last 200
 * timings sorted by recency.
 */

type PerfEntry = {
  label: string;
  durationMs: number;
  startedAt: number;
};

const RING_LIMIT = 200;
const ring: PerfEntry[] = [];

const isDevLike = (() => {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  const host = window.location.hostname;
  return host.includes("id-preview--") || host.includes("lovableproject.com");
})();

if (typeof window !== "undefined" && isDevLike) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__cccPerf = ring;
}

export const perfMark = (label: string) => {
  if (!isDevLike) return () => {};
  const startedAt = performance.now();
  return () => {
    const durationMs = performance.now() - startedAt;
    ring.unshift({ label, durationMs, startedAt });
    if (ring.length > RING_LIMIT) ring.length = RING_LIMIT;
    if (durationMs > 600) {
      // Surface slow operations directly so they're easy to spot.
      // eslint-disable-next-line no-console
      console.warn(`[perf] ${label}: ${durationMs.toFixed(0)}ms`);
    } else if (durationMs > 200) {
      // eslint-disable-next-line no-console
      console.info(`[perf] ${label}: ${durationMs.toFixed(0)}ms`);
    }
  };
};

/** Log Web-Vital style numbers once per page load. */
export const logPageVitals = (page: string) => {
  if (!isDevLike || typeof window === "undefined") return;
  // Run on next frame so layout has settled.
  requestAnimationFrame(() => {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const ttfb = nav ? Math.max(0, nav.responseStart - nav.requestStart) : 0;
      const dom = nav ? nav.domContentLoadedEventEnd - nav.startTime : 0;
      const first = performance.getEntriesByName("first-contentful-paint")[0];
      const fcp = first ? first.startTime : 0;
      // eslint-disable-next-line no-console
      console.info(
        `[perf] ${page} TTFB=${ttfb.toFixed(0)}ms DOMReady=${dom.toFixed(0)}ms FCP=${fcp.toFixed(0)}ms`,
      );
    } catch {
      /* ignore */
    }
  });
};
