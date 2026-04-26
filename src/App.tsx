import { useState, lazy, Suspense, useEffect, memo } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ScrollToTop from "./components/ScrollToTop";
import DefaultThemeApplier from "./components/DefaultThemeApplier";
import AdminLightThemeForcer from "./components/AdminLightThemeForcer";
import RoutePrefetcher from "./components/RoutePrefetcher";
import RightClickBlocker from "./components/RightClickBlocker";
import { useSiteSettings } from "./hooks/useSiteSettings";

import usePageTracker from "./hooks/usePageTracker";
import { useRouteMemory, getLastRoute, clearRouteMemory } from "./hooks/useRouteMemory";
import { useMaintenanceCheck } from "./hooks/useMaintenanceCheck";
import MaintenanceScreen from "./components/MaintenanceScreen";
import { normalizeInternalNavigationTarget } from "./lib/internal-navigation";

// Lazy-loaded shell components — wrapped in a passthrough so Radix Slot / AnimatePresence
// can't forward refs into the lazy boundary (which causes ref warnings).
const lazyShell = <P,>(loader: () => Promise<{ default: React.ComponentType<P> }>) => {
  const L = lazy(loader);
  // Wrap in a real, non-forwardRef function component so React stops trying to attach a ref.
  const Wrapper = (props: P) => (
    <Suspense fallback={null}>
      {/* @ts-expect-error generic prop pass-through */}
      <L {...props} />
    </Suspense>
  );
  Wrapper.displayName = "LazyShell";
  return Wrapper;
};

const SplashScreen = lazy(() => import("./components/SplashScreen"));
const PWASplashScreen = lazyShell(() => import("./components/PWASplashScreen"));
const FloatingButtons = lazyShell(() => import("./components/FloatingButtons"));
const MobileBottomNav = lazyShell(() => import("./components/MobileBottomNav"));
const AppUpdateBanner = lazyShell(() => import("./components/AppUpdateBanner"));
const AppOnboarding = lazy(() => import("./components/AppOnboarding"));
const OfflineDetector = lazyShell(() => import("./components/OfflineDetector"));
const SyncStatusBadge = lazyShell(() => import("./components/SyncStatusBadge"));

import { useOneSignal } from "./hooks/useOneSignal";
import { useWebPush } from "./hooks/useWebPush";
import useAutoUpdate from "./hooks/useAutoUpdate";
import { installErrorReporter } from "./lib/error-reporter";
import { installSyncWorker } from "./lib/sync-queue";

// Install global error/network reporter once, before React mounts the tree.
installErrorReporter();

// Boot the offline action queue worker (drains on reconnect)
installSyncWorker();

// All pages lazy loaded for performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

// Lazy loaded pages for performance
const Order = lazy(() => import("./pages/Order"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Admin = lazy(() => import("./pages/Admin"));
const About = lazy(() => import("./pages/About"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const BookEvent = lazy(() => import("./pages/BookEvent"));
const EventPolicy = lazy(() => import("./pages/EventPolicy"));
const ArtistDashboard = lazy(() => import("./pages/ArtistDashboard"));
const ArtistLogin = lazy(() => import("./pages/ArtistLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const LiveChat = lazy(() => import("./pages/LiveChat"));
const Enquiry = lazy(() => import("./pages/Enquiry"));
const Support = lazy(() => import("./pages/Support"));
const Shop = lazy(() => import("./pages/Shop"));
const ShopProduct = lazy(() => import("./pages/ShopProduct"));
const ShopCart = lazy(() => import("./pages/ShopCart"));
const ShopAdminLogin = lazy(() => import("./pages/ShopAdminLogin"));
const ShopAdmin = lazy(() => import("./pages/ShopAdmin"));
const AICaricature = lazy(() => import("./pages/AICaricature"));
const ShopOrderConfirmation = lazy(() => import("./pages/ShopOrderConfirmation"));
const Workshop = lazy(() => import("./pages/Workshop"));
const WorkshopDashboard = lazy(() => import("./pages/WorkshopDashboard"));
const WorkshopAdminLogin = lazy(() => import("./pages/WorkshopAdminLogin"));
const WorkshopAdminPanel = lazy(() => import("./pages/WorkshopAdminPanel"));
const CancellationPolicy = lazy(() => import("./pages/CancellationPolicy"));
const IntellectualProperty = lazy(() => import("./pages/IntellectualProperty"));
const WorkshopPolicy = lazy(() => import("./pages/WorkshopPolicy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const CmsPage = lazy(() => import("./pages/CmsPage"));
const CaricatureBudgeting = lazy(() => import("./pages/CaricatureBudgeting"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const DatabaseEntryReversal = lazy(() => import("./pages/DatabaseEntryReversal"));
const FAQs = lazy(() => import("./pages/FAQs"));
const Explore = lazy(() => import("./pages/Explore"));
const SEOLandingPage = lazy(() => import("./pages/SEOLandingPage"));
const LilFlea = lazy(() => import("./pages/LilFlea"));
const LilFleaGallery = lazy(() => import("./pages/LilFleaGallery"));
const ClaimLink = lazy(() => import("./pages/ClaimLink"));
const ChatNow = lazy(() => import("./pages/ChatNow"));
const Download = lazy(() => import("./pages/Download"));
const SyncQueue = lazy(() => import("./pages/SyncQueue"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30s stale — faster fresh data with realtime
      gcTime: 1000 * 60 * 10,      // 10 min GC
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: 1,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const DeferredInit = memo(() => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestIdleCallback ? requestIdleCallback(() => setReady(true)) : setTimeout(() => setReady(true), 2000);
    return () => { if (typeof cancelIdleCallback !== "undefined") cancelIdleCallback(id as number); };
  }, []);
  if (!ready) return null;
  return <DeferredInitInner />;
});
DeferredInit.displayName = "DeferredInit";

const DeferredInitInner = () => {
  useOneSignal();
  useWebPush();
  useAutoUpdate();
  return null;
};

const RouteMemoryTracker = () => {
  useRouteMemory();
  usePageTracker();
  return null;
};

const RouteMemoryRedirector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/") {
      const lastRoute = getLastRoute();
      const blockedRoutes = ["/login", "/register", "/forgot-password", "/customcad75", "/admin-login", "/artistlogin", "/cccworkshop2006", "/CFCAdmin936"];
      if (lastRoute && lastRoute !== "/" && !blockedRoutes.includes(lastRoute)) {
        navigate(lastRoute, { replace: true });
        clearRouteMemory();
      } else if (lastRoute && blockedRoutes.includes(lastRoute)) {
        clearRouteMemory();
      }
    }
  }, []);
  return null;
};

const InternalNavigationBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleInternalNavigation = (event: Event) => {
      const target = (event as CustomEvent<{ to?: string }>).detail?.to;
      if (!target) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (target !== currentPath) {
        navigate(target);
      }
    };

    const handleAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download")) return;

      const normalizedTarget = normalizeInternalNavigationTarget(anchor.getAttribute("href"));
      if (!normalizedTarget) return;

      event.preventDefault();
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (normalizedTarget !== currentPath) {
        navigate(normalizedTarget);
      }
    };

    window.addEventListener("ccc:navigate-internal", handleInternalNavigation as EventListener);
    document.addEventListener("click", handleAnchorClick);

    return () => {
      window.removeEventListener("ccc:navigate-internal", handleInternalNavigation as EventListener);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, [navigate]);

  return null;
};

/** Global Maintenance Gate — NON-BLOCKING: renders children immediately, only blocks when confirmed enabled */
const GlobalMaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const maintenance = useMaintenanceCheck("global");
  
  const adminPaths = ["/admin", "/customcad75", "/admin-panel", "/shop-admin", "/CFCAdmin936", "/cccworkshop2006", "/workshop-admin-panel"];
  const isAdminPath = adminPaths.some(p => location.pathname.startsWith(p));
  
  // Non-blocking: don't wait for loading. Default state is isEnabled=false so children render immediately.
  if (maintenance.isEnabled && !isAdminPath) {
    return <MaintenanceScreen title={maintenance.title} message={maintenance.message} estimatedEnd={maintenance.estimatedEnd} isGlobal={true} />;
  }
  
  return <>{children}</>;
};

/** Visitor splash screen — only renders when admin has explicitly enabled it. */
const HomepageSplashGate = ({ onComplete }: { onComplete: () => void }) => {
  const { settings, loading } = useSiteSettings();
  // While settings load, do nothing (default-off behavior).
  if (loading) return null;
  if (settings.homepage_splash_enabled?.enabled !== true) {
    onComplete();
    return null;
  }
  return <Suspense fallback={null}><SplashScreen onComplete={onComplete} /></Suspense>;
};

/** App onboarding slides — only renders when admin has explicitly enabled it. */
const AppOnboardingGate = () => {
  const { settings, loading } = useSiteSettings();
  if (loading) return null;
  if (settings.app_onboarding_enabled?.enabled !== true) return null;
  return <Suspense fallback={null}><AppOnboarding /></Suspense>;
};

/**
 * Gate the /admin-panel route. Without a session "admin_panel_unlocked"
 * flag set by the AdminLogin (/customcad75) flow OR an existing admin
 * Supabase session, render NotFound — that way deep-linking /admin-panel
 * directly behaves exactly like /admin and /admin-login (404).
 */
const AdminPanelGate = ({ children }: { children: React.ReactNode }) => {
  const flag = typeof window !== "undefined" ? sessionStorage.getItem("admin_panel_unlocked") : null;
  const hasWorkshopAdmin = typeof window !== "undefined" ? !!localStorage.getItem("workshop_admin") : false;
  if (!flag && !hasWorkshopAdmin) return <Suspense fallback={<PageLoader />}><NotFound /></Suspense>;
  return <>{children}</>;
};

const App = () => {
  // Splash on EVERY full page reload (skip only on admin-style routes).
  const [showSplash, setShowSplash] = useState(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    if (["/customcad75", "/admin-panel", "/admin-login", "/cccworkshop2006", "/workshop-admin-panel", "/lil-flea"].some(r => path.startsWith(r))) return false;
    return true;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <DefaultThemeApplier />
        <DeferredInit />
        <RoutePrefetcher />
        <PWASplashScreen />
        <OfflineDetector />
        <SyncStatusBadge />
        <Toaster />
        <Sonner />
        {showSplash && <HomepageSplashGate onComplete={() => setShowSplash(false)} />}
        <AppUpdateBanner />
        <BrowserRouter>
          <GlobalMaintenanceGate>
            <AppOnboardingGate />
            <ScrollToTop />
            <RouteMemoryTracker />
            <RouteMemoryRedirector />
            <InternalNavigationBridge />
            <AdminLightThemeForcer />
            <RightClickBlocker />
            
            <FloatingButtons />
            <MobileBottomNav />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/order" element={<Order />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customcad75" element={<AdminLogin />} />
                {/* Public-search-friendly admin slugs are intentionally hidden — show a 404 so they don't leak. */}
                <Route path="/admin-login" element={<NotFound />} />
                <Route path="/admin" element={<NotFound />} />
                <Route path="/admin-panel" element={<AdminPanelGate><Admin /></AdminPanelGate>} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund" element={<RefundPolicy />} />
                <Route path="/shipping" element={<ShippingPolicy />} />
                <Route path="/cancellation" element={<CancellationPolicy />} />
                <Route path="/intellectual-property" element={<IntellectualProperty />} />
                <Route path="/workshop-policy" element={<WorkshopPolicy />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
                <Route path="/page/:slug" element={<CmsPage />} />
                <Route path="/caricature-budgeting" element={<CaricatureBudgeting />} />
                <Route path="/gallery/:type" element={<GalleryPage />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/book-event" element={<BookEvent />} />
                <Route path="/event-policy" element={<EventPolicy />} />
                <Route path="/artist-dashboard" element={<ArtistDashboard />} />
                <Route path="/artistlogin" element={<ArtistLogin />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/live-chat" element={<LiveChat />} />
                <Route path="/enquiry" element={<Enquiry />} />
                <Route path="/support" element={<Support />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/product/:slug" element={<ShopProduct />} />
                <Route path="/shop/cart" element={<ShopCart />} />
                <Route path="/shop/order-confirmation" element={<ShopOrderConfirmation />} />
                <Route path="/shop/ai-caricature" element={<AICaricature />} />
                <Route path="/CFCAdmin936" element={<ShopAdminLogin />} />
                <Route path="/shop-admin" element={<ShopAdmin />} />
                <Route path="/workshop" element={<Workshop />} />
                <Route path="/workshop/dashboard" element={<WorkshopDashboard />} />
                {/* Legacy alias — older nav code (mobile bottom nav, switch profile button,
                    UserWorkshopOverview) still links to /workshop-dashboard. Keep this
                    redirect so no in-app navigation 404s. */}
                <Route path="/workshop-dashboard" element={<Navigate to="/workshop/dashboard" replace />} />
                <Route path="/cccworkshop2006" element={<WorkshopAdminLogin />} />
                <Route path="/workshop-admin-login" element={<Navigate to="/workshop" replace />} />
                <Route path="/workshop-admin" element={<Navigate to="/workshop" replace />} />
                <Route path="/workshop-admin-panel" element={<WorkshopAdminPanel />} />
                <Route path="/database-entry-reversal" element={<DatabaseEntryReversal />} />
                <Route path="/faqs" element={<FAQs />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/lil-flea" element={<LilFlea />} />
                <Route path="/lil-flea-gallery" element={<LilFleaGallery />} />
                <Route path="/claim-link" element={<ClaimLink />} />
                <Route path="/chat-now" element={<ChatNow />} />
                <Route path="/download" element={<Download />} />
                <Route path="/install" element={<Navigate to="/download" replace />} />
                <Route path="/sync-queue" element={<SyncQueue />} />
                {/* Programmatic SEO city/service landing pages */}
                <Route path="/:slug" element={<SEOLandingPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </GlobalMaintenanceGate>
        </BrowserRouter>
      </TooltipProvider>
      </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
