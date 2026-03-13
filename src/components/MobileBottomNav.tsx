import { useNavigate, useLocation } from "react-router-dom";
import { Home, Package, User, Store, GraduationCap } from "lucide-react";
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

  const hiddenPaths = ["/dashboard", "/admin", "/customcad75", "/order", "/artist-dashboard", "/artistlogin", "/book-event", "/shop-admin", "/CFCAdmin936", "/workshop-admin", "/workshop", "/cccworkshop2006"];
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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass effect background */}
      <div className="backdrop-blur-2xl bg-card/90 border-t border-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around py-2.5 px-2 max-w-lg mx-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={item.action}
                className="flex flex-col items-center gap-1 min-w-[64px] py-1 relative group"
              >
                {/* Active indicator dot */}
                {active && (
                  <div className="absolute -top-2.5 w-8 h-1 rounded-full bg-primary" />
                )}
                <div className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 ${
                  active
                    ? "bg-primary/15 shadow-sm"
                    : "group-hover:bg-muted"
                }`}>
                  <item.icon className={`w-5 h-5 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`} />
                </div>
                <span className={`text-[10px] font-body font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

export default MobileBottomNav;
