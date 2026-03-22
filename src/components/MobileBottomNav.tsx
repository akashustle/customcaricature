import { useNavigate, useLocation } from "react-router-dom";
import { Home, Package, User, Store, GraduationCap, HeadphonesIcon } from "lucide-react";
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
    { icon: Home, label: "Home", path: "/" },
    ...(shopNavVisible ? [{ icon: Store, label: "Shop", path: "/shop" }] : []),
    ...(workshopNavVisible ? [{ icon: GraduationCap, label: "Workshop", path: "/workshop" }] : []),
    { icon: Package, label: "Track", path: "/track-order" },
    ...(supportNavVisible ? [{ icon: HeadphonesIcon, label: "Support", path: "/support" }] : []),
    ...(user
      ? [{ icon: User, label: "Dashboard", path: "/dashboard" }]
      : [{ icon: User, label: "Login", path: "/login" }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobile navigation">
      <div className="bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center overflow-x-auto no-scrollbar px-2 py-2 max-w-lg mx-auto gap-1">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-0.5 min-w-0 flex-shrink-0 py-1 relative" style={{ minWidth: '56px' }}>
              >
                <div className={`flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
                  active ? "bg-primary/12" : ""
                }`}>
                  <item.icon className={`w-[20px] h-[20px] transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] font-body leading-none transition-colors duration-200 ${
                  active ? "text-primary font-bold" : "text-muted-foreground font-medium"
                }`}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobile-nav-dot"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
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
