import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, User, ShoppingBag, Compass, GraduationCap, MessageCircle } from "lucide-react";
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
  const workshopVisible = settings.show_workshop?.enabled === true;
  const supportVisible = settings.support_button_visible?.enabled === true;

  // Hide on admin paths only
  const adminPaths = ["/admin", "/customcad75", "/admin-panel", "/shop-admin", "/CFCAdmin936", "/cccworkshop2006", "/workshop-admin-panel"];
  if (!isMobile || adminPaths.some(p => location.pathname.startsWith(p))) return null;

  const items: { icon: any; label: string; path: string }[] = [
    { icon: Home, label: "Home", path: "/" },
    ...(shopVisible ? [{ icon: ShoppingBag, label: "Shop", path: "/shop" }] : []),
    ...(workshopVisible ? [{ icon: GraduationCap, label: "Workshop", path: "/workshop" }] : []),
    { icon: Compass, label: "Explore", path: "/about" },
    { icon: Search, label: "Track", path: "/track-order" },
    ...(user
      ? [{ icon: User, label: "You", path: "/dashboard" }]
      : [{ icon: User, label: "Login", path: "/login" }]),
  ];

  // Limit to 5 items max for clean layout
  const visibleItems = items.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobile navigation">
      <div className="glass-crystal" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }}>
        <div className="flex items-stretch justify-evenly px-2 max-w-lg mx-auto">
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2.5 relative"
              >
                {active && (
                  <motion.div
                    layoutId="app-nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <motion.div
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-300 ${
                    active ? "bg-primary/12 shadow-sm" : ""
                  }`}
                  animate={active ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <item.icon
                    className={`w-[20px] h-[20px] transition-all duration-300 ${
                      active ? "text-primary" : "text-muted-foreground/50"
                    }`}
                    strokeWidth={active ? 2.5 : 1.8}
                    fill={active && item.icon === Home ? "currentColor" : "none"}
                  />
                </motion.div>
                <span
                  className={`text-[10px] leading-none transition-all duration-200 ${
                    active ? "text-primary font-bold" : "text-muted-foreground/40 font-medium"
                  }`}
                >
                  {item.label}
                </span>
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
