import { useNavigate, useLocation } from "react-router-dom";
import { Home, Package, Search, User, Store, GraduationCap, HeadphonesIcon, ShoppingBag, Compass } from "lucide-react";
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

  const shopNavVisible = settings.shop_nav_visible?.enabled !== false;
  const workshopNavVisible = (settings as any).workshop_mobile_nav?.enabled || false;
  const supportNavVisible = (settings as any).support_mobile_nav?.enabled || false;

  const hiddenPaths = ["/dashboard", "/admin", "/customcad75", "/order", "/artist-dashboard", "/artistlogin", "/book-event", "/shop-admin", "/CFCAdmin936", "/workshop-admin", "/workshop/dashboard", "/cccworkshop2006", "/workshop-admin-panel", "/workshop/"];
  if (location.pathname.startsWith("/workshop/")) return null;
  if (!isMobile || hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  const items = [
    { icon: Home, label: "Home", path: "/", fill: true },
    ...(shopNavVisible ? [{ icon: ShoppingBag, label: "Shop", path: "/shop", fill: false }] : []),
    { icon: Compass, label: "Explore", path: "/about", fill: false },
    { icon: Search, label: "Track", path: "/track-order", fill: false },
    ...(user
      ? [{ icon: User, label: "Account", path: "/dashboard", fill: false }]
      : [{ icon: User, label: "Login", path: "/login", fill: false }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobile navigation">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-stretch justify-evenly px-1 max-w-lg mx-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 relative"
              >
                {/* Active indicator bar at top */}
                {active && (
                  <motion.div
                    layoutId="app-nav-bar"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                  active ? "bg-primary/10" : ""
                }`}>
                  <item.icon
                    className={`w-[22px] h-[22px] transition-all duration-200 ${
                      active ? "text-primary" : "text-muted-foreground/60"
                    }`}
                    strokeWidth={active ? 2.5 : 1.8}
                    fill={active && item.fill ? "currentColor" : "none"}
                  />
                </div>
                <span
                  className={`text-[10px] leading-none font-medium transition-all duration-200 ${
                    active ? "text-primary font-bold" : "text-muted-foreground/50"
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
