import { useNavigate, useLocation } from "react-router-dom";
import { Home, Package, User, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Don't show on admin, dashboard (they have their own), or non-mobile
  const hiddenPaths = ["/dashboard", "/admin", "/customcad75", "/order", "/artist-dashboard", "/artistlogin"];
  if (!isMobile || hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  const items = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Package, label: "Track", path: "/track-order" },
    ...(user
      ? [{ icon: User, label: "Dashboard", path: "/dashboard" }]
      : [{ icon: User, label: "Login", path: "/login" }]),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-sans font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
