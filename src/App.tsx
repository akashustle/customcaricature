import { useState, lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ScrollToTop from "./components/ScrollToTop";
import SplashScreen from "./components/SplashScreen";
import FloatingButtons from "./components/FloatingButtons";
import MobileBottomNav from "./components/MobileBottomNav";
import AppUpdateBanner from "./components/AppUpdateBanner";
import PermissionGate from "./components/PermissionGate";
import AppOnboarding from "./components/AppOnboarding";
import { useOneSignal } from "./hooks/useOneSignal";
import { useWebPush } from "./hooks/useWebPush";
import { useRouteMemory, getLastRoute, clearRouteMemory } from "./hooks/useRouteMemory";

// Eagerly loaded core pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      gcTime: 1000 * 60 * 10, // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const OneSignalInit = () => {
  useOneSignal();
  return null;
};

const WebPushInit = () => {
  useWebPush();
  return null;
};

const RouteMemoryTracker = () => {
  useRouteMemory();
  return null;
};

const RouteMemoryRedirector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/") {
      const lastRoute = getLastRoute();
      if (lastRoute && lastRoute !== "/") {
        navigate(lastRoute, { replace: true });
        clearRouteMemory();
      }
    }
  }, []);
  return null;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <OneSignalInit />
        <WebPushInit />
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <AppUpdateBanner />
        <BrowserRouter>
          <AppOnboarding />
          <PermissionGate />
          <ScrollToTop />
          <RouteMemoryTracker />
          <RouteMemoryRedirector />
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
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/admin" element={<Navigate to="/login" replace />} />
              <Route path="/admin-panel" element={<Admin />} />
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
              {/* Shop Routes */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/product/:slug" element={<ShopProduct />} />
              <Route path="/shop/cart" element={<ShopCart />} />
              <Route path="/shop/order-confirmation" element={<ShopOrderConfirmation />} />
              <Route path="/shop/ai-caricature" element={<AICaricature />} />
              {/* Shop Admin */}
              <Route path="/CFCAdmin936" element={<ShopAdminLogin />} />
              <Route path="/shop-admin" element={<ShopAdmin />} />
              {/* Workshop Routes */}
              <Route path="/workshop" element={<Workshop />} />
              <Route path="/workshop/dashboard" element={<WorkshopDashboard />} />
              <Route path="/cccworkshop2006" element={<WorkshopAdminLogin />} />
              <Route path="/workshop-admin-login" element={<Navigate to="/workshop" replace />} />
              <Route path="/workshop-admin" element={<Navigate to="/workshop" replace />} />
              <Route path="/workshop-admin-panel" element={<WorkshopAdminPanel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
