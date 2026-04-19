import { useEffect } from "react";

/**
 * Idle-prefetches the JS chunks for the most commonly visited routes.
 * Runs after first paint to avoid competing with LCP.
 * Result: clicking a nav link feels instant — chunk is already in memory.
 */
const PREFETCH_ROUTES: Array<() => Promise<unknown>> = [
  () => import("@/pages/Order"),
  () => import("@/pages/BookEvent"),
  () => import("@/pages/Shop"),
  () => import("@/pages/Login"),
  () => import("@/pages/Dashboard"),
  () => import("@/pages/About"),
  () => import("@/pages/CaricatureBudgeting"),
  () => import("@/pages/Workshop"),
  () => import("@/pages/Enquiry"),
];

const RoutePrefetcher = () => {
  useEffect(() => {
    let cancelled = false;
    const idle = (cb: () => void) => {
      if (typeof requestIdleCallback === "function") {
        return requestIdleCallback(cb, { timeout: 4000 });
      }
      return setTimeout(cb, 2500) as unknown as number;
    };

    const run = () => {
      // Sequentially prefetch with small gaps so we never block a click
      let i = 0;
      const next = () => {
        if (cancelled || i >= PREFETCH_ROUTES.length) return;
        const fn = PREFETCH_ROUTES[i++];
        fn().catch(() => {}).finally(() => {
          idle(next);
        });
      };
      next();
    };

    const handle = idle(run);

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function") {
        try { cancelIdleCallback(handle as number); } catch {}
      } else {
        clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
      }
    };
  }, []);
  return null;
};

export default RoutePrefetcher;
