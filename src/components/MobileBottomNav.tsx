import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, User, ShoppingBag, Compass, GraduationCap, MessageCircle, Play, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { motion } from "framer-motion";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { settings } = useSiteSettings();

  const shopVisible = settings.shop_nav_visible?.enabled === true;
  const workshopVisible = settings.workshop_mobile_nav?.enabled === true;
  const chatVisible = settings.live_chat_visible?.enabled === true;
  const exploreVisible = (settings as any).explore_mobile_nav?.enabled !== false;

  const adminPaths = ["/admin", "/customcad75", "/admin-panel", "/shop-admin", "/CFCAdmin936", "/cccworkshop2006", "/workshop-admin-panel", "/workshop-dashboard", "/dashboard"];
  if (!isMobile || adminPaths.some(p => location.pathname.startsWith(p))) return null;

  const items: { icon: any; label: string; path: string }[] = [
    { icon: Home, label: "", path: "/" },
    ...(shopVisible ? [{ icon: ShoppingBag, label: "", path: "/shop" }] : []),
    ...(workshopVisible ? [{ icon: GraduationCap, label: "", path: "/workshop" }] : []),
    ...(chatVisible ? [{ icon: Sparkles, label: "", path: "/live-chat" }] : []),
    ...(exploreVisible ? [{ icon: Compass, label: "", path: "/explore" }] : []),
    ...(user
      ? [{ icon: User, label: "", path: "/dashboard" }]
      : [{ icon: User, label: "", path: "/login" }]),
  ];

  const visibleItems = items;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobile navigation">
      <div className="bg-background/95 backdrop-blur-lg border-t border-border/30">
        <div className="flex items-center justify-evenly max-w-lg mx-auto h-[56px] overflow-x-auto scrollbar-hide">
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.75 }}
                className="flex items-center justify-center min-w-[48px] w-14 h-14 relative flex-shrink-0"
              >
                <item.icon
                  className={`transition-all duration-200 ${
                    active ? "text-foreground" : "text-muted-foreground/40"
                  } ${item.icon === Sparkles && !active ? "animate-pulse text-primary/60" : ""}`}
                  size={active ? 26 : 22}
                  strokeWidth={active ? 2.2 : 1.4}
                  fill={active && item.icon === Home ? "currentColor" : "none"}
                />
                {active && (
                  <motion.div
                    layoutId="insta-dot"
                    className="absolute bottom-1.5 w-1 h-1 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
};

export default MobileBottomNav;
