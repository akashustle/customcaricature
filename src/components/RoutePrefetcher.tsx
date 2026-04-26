import { useEffect } from "react";

/**
 * Idle-prefetches the JS chunks for the most commonly visited routes.
 * Runs after first paint to avoid competing with LCP.
 * Result: clicking a nav link feels instant — chunk is already in memory.
 */
const PREFETCH_ROUTES: Array<() => Promise<unknown>> = [
  // Dashboards first — these are the most-revisited screens after login
  () => import("@/pages/Dashboard"),
  () => import("@/pages/WorkshopDashboard"),
  () => import("@/pages/Notifications"),
  // Workshop sub-tabs — preload so tab switching never blocks on chunk fetch
  () => import("@/components/workshop/WorkshopHome"),
  () => import("@/components/workshop/WorkshopProfile"),
  () => import("@/components/workshop/WorkshopVideos"),
  () => import("@/components/workshop/WorkshopCertificates"),
  () => import("@/components/workshop/WorkshopFeedback"),
  () => import("@/components/workshop/WorkshopPayments"),
  () => import("@/components/workshop/WorkshopAssignments"),
  () => import("@/components/workshop/WorkshopNotifications"),
  // Common public routes
  () => import("@/pages/Order"),
  () => import("@/pages/BookEvent"),
  () => import("@/pages/Shop"),
  () => import("@/pages/About"),
  () => import("@/pages/CaricatureBudgeting"),
  () => import("@/pages/Workshop"),
  () => import("@/pages/Enquiry"),
  () => import("@/pages/AICaricature"),
  () => import("@/pages/GalleryPage"),
  () => import("@/pages/FAQs"),
  () => import("@/pages/TrackOrder"),
  () => import("@/pages/Login"),
];

const RoutePrefetcher = () => {
  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const isSlowConnection = connection?.saveData || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType || "");
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    const isAdminRoute = ["/customcad75", "/admin-panel", "/cccworkshop2006", "/workshop-admin-panel"].some((route) => path.startsWith(route));

    if (isSlowConnection || isAdminRoute) return;

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
