import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

const ADMIN_ROUTES = ["/customcad75", "/admin-panel", "/admin-login", "/cccworkshop2006", "/workshop-admin-panel"];
const FRONTEND_ROUTES_BLOCKED = ["/", "/order", "/login", "/register", "/forgot-password", "/dashboard", "/about", "/terms", "/privacy", "/refund", "/shipping", "/cancellation", "/intellectual-property", "/workshop-policy", "/disclaimer", "/track-order", "/book-event", "/event-policy", "/artist-dashboard", "/artistlogin", "/notifications", "/blog", "/live-chat", "/enquiry", "/support", "/shop", "/workshop", "/caricature-budgeting", "/gallery", "/faqs", "/page"];

/**
 * Detects if running as admin PWA (standalone mode + admin start_url).
 */
export const isAdminPWA = () => {
  if (typeof window === "undefined") return false;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
  if (!isStandalone) return false;
  // Check if the PWA was installed from admin manifest (admin id in manifest)
  const ref = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  return ref?.href?.includes("admin-manifest");
};

/**
 * Manages admin PWA manifest injection, install prompt, and frontend blocking.
 */
const AdminPWAManager = () => {
  const location = useLocation();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("admin_pwa_dismissed") === "true");

  const isAdminRoute = ADMIN_ROUTES.some(r => location.pathname.startsWith(r));

  // Swap manifest based on route
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!link) return;

    if (isAdminRoute) {
      link.href = "/admin-manifest.json";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#1E3A5F");
      // Set admin favicon
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) favicon.href = "/admin-favicon.jpeg";
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleTouchIcon) appleTouchIcon.href = "/admin-favicon.jpeg";
    } else {
      link.href = "/manifest.json";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#fdf8f3");
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) favicon.href = "/favicon.png";
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleTouchIcon) appleTouchIcon.href = "/logo.png";
    }
  }, [isAdminRoute, location.pathname]);

  // Block frontend routes in admin PWA standalone mode
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (!isStandalone) return;
    
    // If manifest is admin and user navigates to frontend route, redirect to admin login
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    const isAdminManifest = link?.href?.includes("admin-manifest");
    
    if (isAdminManifest || sessionStorage.getItem("admin_pwa_mode") === "true") {
      sessionStorage.setItem("admin_pwa_mode", "true");
      const isFrontendRoute = FRONTEND_ROUTES_BLOCKED.some(r => {
        if (r === "/") return location.pathname === "/";
        return location.pathname.startsWith(r);
      });
      if (isFrontendRoute) {
        window.location.href = "/customcad75";
      }
    }
  }, [location.pathname]);

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      (window as any).__pwaInstallPrompt = e;
      if (isAdminRoute && !dismissed) {
        setShowBanner(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isAdminRoute, dismissed]);

  // Show banner when navigating to admin routes
  useEffect(() => {
    if (isAdminRoute && installPrompt && !dismissed) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [isAdminRoute, installPrompt, dismissed]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem("admin_pwa_dismissed", "true");
  };

  return (
    <AnimatePresence>
      {showBanner && isAdminRoute && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9998] px-4 py-3"
          style={{ background: "linear-gradient(135deg, #1E3A5F, #0EA5E9)" }}
        >
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <img src="/admin-favicon.jpeg" alt="Admin App" className="w-10 h-10 rounded-full shadow-lg object-cover" />
              <div>
                <p className="text-white text-sm font-bold">Install CCC Admin</p>
                <p className="text-white/70 text-[11px]">Get the admin app for quick access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 bg-white text-[#1E3A5F] text-xs font-bold rounded-full hover:bg-white/90 transition-all flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Install
              </button>
              <button onClick={handleDismiss} className="text-white/60 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminPWAManager;
