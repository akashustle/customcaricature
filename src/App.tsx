import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import SplashScreen from "./components/SplashScreen";
import Index from "./pages/Index";
import Order from "./pages/Order";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import TrackOrder from "./pages/TrackOrder";
import BookEvent from "./pages/BookEvent";
import EventPolicy from "./pages/EventPolicy";
import ArtistDashboard from "./pages/ArtistDashboard";
import ArtistLogin from "./pages/ArtistLogin";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import LiveChat from "./pages/LiveChat";
import FloatingButtons from "./components/FloatingButtons";
import MobileBottomNav from "./components/MobileBottomNav";
import Shop from "./pages/Shop";
import ShopProduct from "./pages/ShopProduct";
import ShopCart from "./pages/ShopCart";
import ShopAdminLogin from "./pages/ShopAdminLogin";
import ShopAdmin from "./pages/ShopAdmin";
import AICaricature from "./pages/AICaricature";
import ShopOrderConfirmation from "./pages/ShopOrderConfirmation";
import Workshop from "./pages/Workshop";
import WorkshopDashboard from "./pages/WorkshopDashboard";
import WorkshopAdminLogin from "./pages/WorkshopAdminLogin";
import WorkshopAdminPanel from "./pages/WorkshopAdminPanel";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <BrowserRouter>
          <ScrollToTop />
          <FloatingButtons />
          <MobileBottomNav />
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
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/book-event" element={<BookEvent />} />
            <Route path="/event-policy" element={<EventPolicy />} />
            <Route path="/artist-dashboard" element={<ArtistDashboard />} />
            <Route path="/artistlogin" element={<ArtistLogin />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/live-chat" element={<LiveChat />} />
            {/* Shop Routes */}
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/product/:slug" element={<ShopProduct />} />
            <Route path="/shop/cart" element={<ShopCart />} />
            <Route path="/shop/order-confirmation" element={<ShopOrderConfirmation />} />
            <Route path="/shop/ai-caricature" element={<AICaricature />} />
            {/* Shop Admin */}
            <Route path="/CFCAdmin936" element={<ShopAdminLogin />} />
            <Route path="/shop-admin" element={<ShopAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
