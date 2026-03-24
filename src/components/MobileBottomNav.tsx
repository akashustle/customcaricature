import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, User, ShoppingBag, Compass, GraduationCap, MessageCircle, Play } from "lucide-react";
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

  const adminPaths = ["/admin", "/customcad75", "/admin-panel", "/shop-admin", "/CFCAdmin936", "/cccworkshop2006", "/workshop-admin-panel"];
  if (!isMobile || adminPaths.some(p => location.pathname.startsWith(p))) return null;

  const items: { icon: any; label: string; path: string }[] = [
    { icon: Home, label: "", path: "/" },
    ...(shopVisible ? [{ icon: ShoppingBag, label: "", path: "/shop" }] : []),
    ...(workshopVisible ? [{ icon: GraduationCap, label: "", path: "/workshop" }] : []),
    ...(chatVisible ? [{ icon: MessageCircle, label: "", path: "/live-chat" }] : []),
    { icon: Compass, label: "", path: "/about" },
    ...(user
      ? [{ icon: User, label: "", path: "/dashboard" }]
      : [{ icon: User, label: "", path: "/login" }]),
  ];

  const visibleItems = items.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobile navigation">
      <div className="bg-background border-t border-border/40">
        <div className="flex items-center justify-evenly px-4 max-w-lg mx-auto h-[52px]">
          {visibleItems.map((item, i) => {
            const active = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.75 }}
                className="flex items-center justify-center w-12 h-12 relative"
              >
                <item.icon
                  className={`transition-all duration-200 ${
                    active ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                  size={active ? 26 : 24}
                  strokeWidth={active ? 2.2 : 1.5}
                  fill={active && item.icon === Home ? "currentColor" : "none"}
                />
                {active && (
                  <motion.div
                    layoutId="insta-dot"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-foreground"
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
