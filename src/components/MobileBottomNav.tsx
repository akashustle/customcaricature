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
    { icon: Home, label: "Home", path: "/", action: () => navigate("/") },
    ...(shopNavVisible ? [{ icon: Store, label: "Shop", path: "/shop", action: () => navigate("/shop") }] : []),
    ...(workshopNavVisible ? [{ icon: GraduationCap, label: "Workshop", path: "/workshop", action: () => navigate("/workshop") }] : []),
    { icon: Package, label: "Track", path: "/track-order", action: () => navigate("/track-order") },
    ...(supportNavVisible ? [{ icon: HeadphonesIcon, label: "Support", path: "/support", action: () => navigate("/support") }] : []),
    ...(user
      ? [{ icon: User, label: "Dashboard", path: "/dashboard", action: () => navigate("/dashboard") }]
      : [{ icon: User, label: "Login", path: "/login", action: () => navigate("/login") }]),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="backdrop-blur-2xl bg-card/85 border-t border-border/40 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-around py-1.5 px-1 max-w-lg mx-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                onClick={item.action}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-0.5 min-w-[52px] py-1 relative group"
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1.5 w-10 h-1 rounded-full bg-gradient-to-r from-primary to-primary/70"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={active ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200 ${
                    active
                      ? "bg-primary/15 shadow-[0_2px_8px_hsl(var(--primary)/0.2)]"
                      : "group-active:bg-muted"
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] transition-all duration-200 ${
                    active ? "text-primary stroke-[2.5]" : "text-muted-foreground group-hover:text-foreground"
                  }`} />
                </motion.div>
                <span className={`text-[9px] font-body font-semibold leading-none transition-colors ${
                  active ? "text-primary" : "text-muted-foreground/80"
                }`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

export default MobileBottomNav;
