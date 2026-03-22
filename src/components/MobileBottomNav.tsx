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
      <div 
        className="border-t shadow-[0_-8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.3)]"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.48) 50%, rgba(255,255,255,0.60) 100%)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderColor: "rgba(255,255,255,0.35)",
        }}
      >
        {/* Dark mode override via CSS class */}
        <style>{`
          .dark nav[aria-label="Mobile navigation"] > div:first-child {
            background: linear-gradient(135deg, rgba(30,25,20,0.75) 0%, rgba(40,35,28,0.55) 50%, rgba(35,30,24,0.65) 100%) !important;
            border-color: rgba(255,255,255,0.08) !important;
          }
        `}</style>
        <div className="flex items-center justify-evenly px-1 py-1.5 max-w-lg mx-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-1.5 relative"
              >
                <div
                  className={`flex items-center justify-center w-11 h-9 rounded-2xl transition-all duration-300 ${
                    active
                      ? "shadow-[0_2px_12px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.8)]"
                      : ""
                  }`}
                  style={active ? {
                    background: "linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(240,240,245,0.7) 100%)",
                    border: "1px solid rgba(255,255,255,0.6)",
                  } : {}}
                >
                  <item.icon
                    className={`w-[19px] h-[19px] transition-all duration-300 ${
                      active ? "text-primary drop-shadow-sm" : "text-muted-foreground/70"
                    }`}
                    strokeWidth={active ? 2.4 : 1.6}
                  />
                </div>
                <span
                  className={`text-[9px] leading-none transition-all duration-300 ${
                    active
                      ? "text-primary font-bold"
                      : "text-muted-foreground/60 font-medium"
                  }`}
                  style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
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
