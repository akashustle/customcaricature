import { useNavigate, useLocation } from "react-router-dom";
import { Home, Package, User, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { settings } = useSiteSettings();

  const shopNavVisible = settings.shop_nav_visible?.enabled !== false;

  const hiddenPaths = ["/dashboard", "/admin", "/customcad75", "/order", "/artist-dashboard", "/artistlogin", "/book-event", "/shop-admin", "/CFCAdmin936"];
  if (!isMobile || hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  const items = [
    { icon: Home, label: "Home", path: "/", action: () => navigate("/") },
    ...(shopNavVisible ? [{ icon: Store, label: "Shop", path: "/shop", action: () => navigate("/shop") }] : []),
    { icon: Package, label: "Track", path: "/track-order", action: () => navigate("/track-order") },
    ...(user
      ? [{ icon: User, label: "Dashboard", path: "/dashboard", action: () => navigate("/dashboard") }]
      : [{ icon: User, label: "Login", path: "/login", action: () => navigate("/login") }]),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl bg-card/95 border-t border-border shadow-lg">
      <div className="flex items-center justify-around py-2 max-w-md mx-auto">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={item.action}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                active 
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 scale-105 font-bold" 
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-body font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
