import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, User, ShoppingBag, Compass, GraduationCap, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAppMode } from "@/hooks/useAppMode";
import { supabase } from "@/integrations/supabase/client";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { settings } = useSiteSettings();
  const isAppMode = useAppMode();

  // Track whether the logged-in user has a linked workshop account so we can
  // route them straight to /workshop-dashboard (private) instead of the
  // public /workshop landing page.
  const [hasWorkshop, setHasWorkshop] = useState(false);
  useEffect(() => {
    if (!user?.id) { setHasWorkshop(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("workshop_users" as any)
        .select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!cancelled && data) { setHasWorkshop(true); return; }
      // Fallback: match by email/mobile so workshop students who registered
      // for a booking account via the link feature still see their tab.
      const { data: prof } = await supabase.from("profiles")
        .select("email, mobile").eq("user_id", user.id).maybeSingle();
      if (cancelled || !prof) return;
      const email = (prof.email || user.email || "").toLowerCase().trim();
      const mobile = (prof.mobile || "").replace(/\D/g, "");
      if (email) {
        const { data: m } = await supabase.from("workshop_users" as any)
          .select("id").ilike("email", email).maybeSingle();
        if (!cancelled && m) { setHasWorkshop(true); return; }
      }
      if (mobile) {
        const { data: m } = await supabase.from("workshop_users" as any)
          .select("id").eq("mobile", mobile).maybeSingle();
        if (!cancelled && m) setHasWorkshop(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  const shopVisible = settings.shop_nav_visible?.enabled === true;
  const chatVisible = settings.live_chat_visible?.enabled === true;
  const exploreVisible = (settings as any).explore_mobile_nav?.enabled !== false;

  const adminPaths = ["/admin", "/customcad75", "/admin-panel", "/shop-admin", "/CFCAdmin936", "/cccworkshop2006", "/workshop-admin-panel", "/workshop-dashboard", "/workshop/dashboard", "/dashboard"];
  if (!isMobile || adminPaths.some(p => location.pathname.startsWith(p))) return null;

  // Workshop tab is always visible. Linked students go straight to their
  // private dashboard; everyone else lands on the public workshop page.
  const workshopPath = hasWorkshop ? "/workshop-dashboard" : "/workshop";

  const items: { icon: any; label: string; path: string }[] = [
    { icon: Home, label: "Home", path: "/" },
    ...(shopVisible ? [{ icon: ShoppingBag, label: "Shop", path: "/shop" }] : []),
    { icon: GraduationCap, label: "Workshop", path: workshopPath },
    ...(chatVisible ? [{ icon: Sparkles, label: "Chat", path: "/live-chat" }] : []),
    ...(exploreVisible ? [{ icon: Compass, label: "Explore", path: "/explore" }] : []),
    ...(user
      ? [{ icon: User, label: "Me", path: "/dashboard" }]
      : [{ icon: User, label: "Login", path: "/login" }]),
  ];

  // Two layouts:
  //   - APP MODE (Capacitor / installed PWA): edge-to-edge bar that hugs the
  //     bottom safe area, no rounded float — looks like a real native app.
  //   - WEB MODE: existing pill-card design (untouched for the website).
  if (isAppMode) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="App navigation"
      >
        <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path + item.label}
                onClick={() => navigate(item.path)}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 h-14 active:scale-95 transition-transform"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
                <item.icon
                  className={`w-[22px] h-[22px] transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span
                  className={`text-[10px] truncate transition-colors ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Pill-card mobile nav — fully matches the booking dashboard nav: rounded
  // floating bar, primary background on active, icon + tiny label, scrolls
  // horizontally when more than ~5 items fit.
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 pointer-events-none"
      aria-label="Mobile navigation"
    >
      <div className="pointer-events-auto mx-auto w-fit max-w-[calc(100vw-1.5rem)] bg-card border border-border/60 rounded-[28px] shadow-[0_8px_30px_hsl(var(--primary)/0.08)] px-2 py-2 flex items-center justify-around overflow-x-auto scrollbar-hide gap-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path + item.label}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center gap-1 min-w-[64px] h-14 px-3 py-1.5 rounded-2xl transition-all flex-shrink-0 active:scale-95 ${
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              aria-label={item.label}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
              <span className={`text-[10.5px] leading-none font-sans ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
