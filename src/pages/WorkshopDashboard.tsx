import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Home, Award, FileText, Video, MessageSquare, Moon, Sun, User, Bell, Palette, LayoutDashboard, BadgeCheck, Receipt } from "lucide-react";
import LiveGreeting from "@/components/LiveGreeting";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import WorkshopHome from "@/components/workshop/WorkshopHome";
import WorkshopCertificates from "@/components/workshop/WorkshopCertificates";
import WorkshopAssignments from "@/components/workshop/WorkshopAssignments";
import WorkshopVideos from "@/components/workshop/WorkshopVideos";
import WorkshopFeedback from "@/components/workshop/WorkshopFeedback";
import WorkshopProfile from "@/components/workshop/WorkshopProfile";
import WorkshopNotifications from "@/components/workshop/WorkshopNotifications";
import WorkshopPayments from "@/components/workshop/WorkshopPayments";
import WorkshopOnlineAttendancePopup from "@/components/workshop/WorkshopOnlineAttendancePopup";
import WorkshopCountdownOverlay from "@/components/workshop/WorkshopCountdownOverlay";
import PageBuilderRenderer from "@/components/PageBuilderRenderer";
import WorkshopNotificationBell from "@/components/workshop/WorkshopNotificationBell";
import DesktopFlashStrip, { STAT_PRESETS } from "@/components/dashboard/DesktopFlashStrip";
import DesktopTabsSidebar from "@/components/dashboard/DesktopTabsSidebar";

// Brand-aligned palette — primary uses CCC site primary, with curated accents
const ACCENT_COLORS = [
  { name: "CCC Brand", primary: "hsl(var(--primary))", secondary: "hsl(var(--accent))" },
  { name: "Violet", primary: "#7c3aed", secondary: "#a855f7" },
  { name: "Terracotta", primary: "#c2703e", secondary: "#d4854f" },
  { name: "Teal", primary: "#0d9488", secondary: "#14b8a6" },
  { name: "Rose", primary: "#be123c", secondary: "#e11d48" },
];

const playNotifSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 830;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
};

// Tab order: Home, Profile, Videos, Notifications, Tasks, Certs, Payments, Feedback.
// Payments is always available (mirrors booking dashboard parity).
const allTabs = [
  { key: "home", icon: Home, label: "Home", settingKey: null },
  { key: "profile", icon: User, label: "Profile", settingKey: null },
  { key: "videos", icon: Video, label: "Videos", settingKey: "global_video_access" },
  { key: "notifications", icon: Bell, label: "Alerts", settingKey: null },
  { key: "assignments", icon: FileText, label: "Tasks", settingKey: "assignment_submission_enabled" },
  { key: "certificates", icon: Award, label: "Certs", settingKey: "certificate_visibility" },
  { key: "payments", icon: Receipt, label: "Pay", settingKey: null },
  { key: "feedback", icon: MessageSquare, label: "Feedback", settingKey: "feedback_visibility" },
];

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const { settings: siteSettings } = useSiteSettings();
  const [workshopUser, setWorkshopUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("home");
  const { resolvedTheme, setTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const [settings, setSettings] = useState<any>({});
  const [accentIdx, setAccentIdx] = useState(() => parseInt(localStorage.getItem("ws_accent") || "0") || 0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  // Whether this workshop user also has a linked booking (main) account
  const [hasBookingAccount, setHasBookingAccount] = useState(false);

  const accent = ACCENT_COLORS[accentIdx] || ACCENT_COLORS[0];

  const setDarkMode = (val: boolean) => setTheme(val ? "dark" : "light");
  useEffect(() => { localStorage.setItem("ws_accent", accentIdx.toString()); }, [accentIdx]);

  // Log Web-Vital style numbers once per dashboard mount (dev/preview only)
  useEffect(() => { import("@/lib/perf-logger").then(m => m.logPageVitals("/workshop-dashboard")); }, []);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (!stored) { navigate("/workshop"); return; }
    const user = JSON.parse(stored);
    setWorkshopUser(user);
    refreshUser(user.id);
    fetchSettings();
    // Detect whether a booking (main) profile exists for this user.
    // We match on email OR mobile so the workshop dashboard can offer either
    // "Open Booking Account" (when linked) or "Create Booking Account".
    (async () => {
      const filters: string[] = [];
      if (user.email) filters.push(`email.eq.${user.email}`);
      if (user.mobile) filters.push(`mobile.eq.${user.mobile}`);
      if (filters.length === 0) return;
      const { data } = await supabase.from("profiles").select("id").or(filters.join(",")).limit(1).maybeSingle();
      setHasBookingAccount(!!data);
    })();

    const handleLocalUserUpdate = (event: Event) => {
      const updated = (event as CustomEvent<any>).detail;
      if (!updated?.id || updated.id !== user.id) return;
      setWorkshopUser(updated);
      localStorage.setItem("workshop_user", JSON.stringify(updated));
    };
    window.addEventListener("workshop-user-updated", handleLocalUserUpdate as EventListener);

    const ch = supabase.channel("ws-user-profile")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workshop_users", filter: `id=eq.${user.id}` }, (payload: any) => {
        const updated = payload.new;
        if (!updated.is_enabled) {
          localStorage.removeItem("workshop_user");
          toast({ title: "Account Disabled", variant: "destructive" });
          navigate("/workshop");
          return;
        }
        setWorkshopUser(updated);
        localStorage.setItem("workshop_user", JSON.stringify(updated));
        playNotifSound();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings" }, () => { fetchSettings(); playNotifSound(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_sessions" }, () => { playNotifSound(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workshop_notifications", filter: `user_id=eq.${user.id}` }, () => { playNotifSound(); })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("workshop-user-updated", handleLocalUserUpdate as EventListener);
    };
  }, []);

  const refreshUser = async (userId: string) => {
    const { data } = await supabase.from("workshop_users" as any).select("*").eq("id", userId).single();
    if (data) {
      const user = data as any;
      if (!user.is_enabled) { localStorage.removeItem("workshop_user"); toast({ title: "Account Disabled", variant: "destructive" }); navigate("/workshop"); return; }
      setWorkshopUser(user); localStorage.setItem("workshop_user", JSON.stringify(user));
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((s: any) => { map[s.id] = s.value; });
      setSettings(map);
    }
  };

  const handleLogout = () => { localStorage.removeItem("workshop_user"); navigate("/workshop"); };
  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return "Good Morning ☀️"; if (h < 17) return "Good Afternoon 🌤️"; return "Good Evening 🌙"; };

  // Filter to enabled tabs, then apply admin-defined order from site settings.
  const visibleTabs = useMemo(() => {
    const enabled = allTabs.filter(tab => {
      if (!tab.settingKey) return true;
      return settings[tab.settingKey]?.enabled !== false;
    });
    const savedOrder: string[] | undefined = (siteSettings as any).workshop_nav_order?.order;
    if (Array.isArray(savedOrder) && savedOrder.length > 0) {
      const byKey = new Map(enabled.map(t => [t.key, t] as const));
      const ordered = savedOrder.map(k => byKey.get(k)).filter(Boolean) as typeof enabled;
      // Append any enabled tabs that weren't in the saved order (newly added)
      const seen = new Set(ordered.map(t => t.key));
      enabled.forEach(t => { if (!seen.has(t.key)) ordered.push(t); });
      return ordered;
    }
    return enabled;
  }, [settings, siteSettings]);

  if (!workshopUser) return null;

  if (!visibleTabs.find(t => t.key === activeTab)) {
    setActiveTab("home");
  }

  // Active tab style — uses brand gradient from CSS tokens
  const activeStyle = accentIdx === 0
    ? { background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))`, boxShadow: `0 8px 24px -8px hsl(var(--primary) / 0.45)` }
    : { background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`, boxShadow: `0 8px 24px -8px ${accent.primary}55` };

  const renderContent = () => {
    switch (activeTab) {
      case "home": return <WorkshopHome user={workshopUser} darkMode={darkMode} />;
      case "notifications": return <WorkshopNotifications user={workshopUser} darkMode={darkMode} />;
      case "certificates": return <WorkshopCertificates user={workshopUser} darkMode={darkMode} />;
      case "assignments": return <WorkshopAssignments user={workshopUser} darkMode={darkMode} />;
      case "videos": return <WorkshopVideos user={workshopUser} darkMode={darkMode} />;
      case "feedback": return <WorkshopFeedback user={workshopUser} darkMode={darkMode} />;
      case "profile": return <WorkshopProfile user={workshopUser} darkMode={darkMode} />;
      case "payments": return <WorkshopPayments user={workshopUser} darkMode={darkMode} />;
      default: return null;
    }
  };

  const initials = (workshopUser.name || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen pb-24 md:pb-8 bg-background transition-colors duration-300 relative overflow-hidden">
      {/* 3D ambient background — branded soft orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full opacity-[0.10] blur-[120px] ws-orb-1"
          style={{ background: `radial-gradient(circle, hsl(var(--primary) / 0.6), transparent 70%)` }} />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full opacity-[0.08] blur-[100px] ws-orb-2"
          style={{ background: `radial-gradient(circle, hsl(var(--accent) / 0.6), transparent 70%)` }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: `radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)` }} />
      </div>

      <WorkshopOnlineAttendancePopup user={workshopUser} darkMode={darkMode} />
      <WorkshopCountdownOverlay user={workshopUser} />

      {/* DESKTOP top bar — same shell as booking dashboard */}
      <header className="hidden md:block sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="font-display text-lg font-bold leading-none">
                Creative <span className="text-gradient-violet">Caricature Club™</span>
              </h1>
              <p className="text-[11px] text-muted-foreground font-sans mt-0.5">Workshop portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WorkshopNotificationBell userId={workshopUser.id} />
            <Button variant="ghost" size="icon" onClick={() => setShowColorPicker(!showColorPicker)} className="rounded-full h-9 w-9 text-muted-foreground" title="Theme color">
              <Palette className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative w-10 h-10 rounded-full bg-card border-2 border-primary flex items-center justify-center font-bold text-foreground hover:scale-105 transition-transform"
                  aria-label="Open profile"
                >
                  <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                    {workshopUser.avatar_url ? (
                      <img src={workshopUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">{initials}</span>
                    )}
                  </span>
                  {workshopUser.is_verified && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-background shadow-lg"
                      style={{ background: "linear-gradient(135deg, hsl(210 90% 55%), hsl(220 85% 50%))" }}
                      title="Verified user"
                      aria-label="Verified"
                    >
                      <BadgeCheck className="w-4 h-4 text-white" strokeWidth={2.6} />
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-border/70">
                <DropdownMenuLabel className="flex items-center gap-2 py-2.5">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={workshopUser.avatar_url || undefined} />
                    <AvatarFallback className="text-xs font-bold text-primary-foreground"
                      style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))` }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{workshopUser.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{workshopUser.email || workshopUser.mobile}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => setActiveTab("profile")}>
                  <User className="w-4 h-4 mr-2" /> View / Edit Profile
                </DropdownMenuItem>
                {hasBookingAccount ? (
                  <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Open Booking Account
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/register?from=workshop")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Create Booking Account
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg cursor-pointer text-destructive focus:text-destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <AnimatePresence>
          {showColorPicker && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="max-w-5xl mx-auto px-6 pb-3 flex gap-2 items-center flex-wrap">
                <span className="text-muted-foreground text-xs font-semibold">Theme:</span>
                {ACCENT_COLORS.map((c, i) => (
                  <motion.button key={c.name} onClick={() => { setAccentIdx(i); setShowColorPicker(false); }}
                    whileHover={{ scale: 1.18, y: -2 }} whileTap={{ scale: 0.9 }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${accentIdx === i ? "scale-110 border-foreground shadow-md" : "border-transparent"}`}
                    style={{ background: c.primary === "hsl(var(--primary))"
                      ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))`
                      : `linear-gradient(135deg, ${c.primary}, ${c.secondary})` }}
                    title={c.name} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MOBILE inline greeting + circular avatar — mirrors booking dashboard.
          Visible on every tab including Profile, per request. */}
      <div className="md:hidden max-w-5xl mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-4">
          <LiveGreeting name={workshopUser.name} />
          <div className="flex items-center gap-2">
            <WorkshopNotificationBell userId={workshopUser.id} />
            <button
              onClick={() => setActiveTab("profile")}
              className="relative w-11 h-11 rounded-full overflow-visible bg-card border-2 border-primary flex items-center justify-center font-bold text-foreground shadow-sm"
              aria-label="Open profile"
            >
              <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                {workshopUser.avatar_url ? (
                  <img src={workshopUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs">{initials}</span>
                )}
              </span>
              {workshopUser.is_verified && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-background shadow-lg"
                  style={{ background: "linear-gradient(135deg, hsl(210 90% 55%), hsl(220 85% 50%))" }}
                  title="Verified user"
                  aria-label="Verified"
                >
                  <BadgeCheck className="w-4 h-4 text-white" strokeWidth={2.6} />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop 3D flash-card hero strip (lg+) — hidden on Profile tab so the
          profile hero is the only large surface above content. */}
      <div className={`hidden lg:block max-w-5xl mx-auto px-4 pt-5 ${activeTab === "profile" ? "lg:hidden" : ""}`}>
        <DesktopFlashStrip
          greeting={getGreeting()}
          fullName={workshopUser.name || "Workshop Student"}
          subtitle="Your premium workshop hub — videos, certificates and live sessions in one place."
          avatarUrl={workshopUser.avatar_url}
          isVerified={!!workshopUser.is_verified}
          primaryCta={{ label: "Watch videos", onClick: () => setActiveTab("videos"), Icon: Video }}
          quickLinks={[
            { label: "Certificates", Icon: Award, onClick: () => setActiveTab("certificates") },
            { label: "Assignments", Icon: FileText, onClick: () => setActiveTab("assignments") },
            { label: "Notifications", Icon: Bell, onClick: () => setActiveTab("notifications") },
          ]}
          stats={[
            { key: "workshop", label: "Workshop", value: workshopUser.workshop_date ? new Date(workshopUser.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Scheduled", hint: workshopUser.slot || "Slot TBD", onClick: () => setActiveTab("home"), ...STAT_PRESETS.workshop },
            { key: "certificates", label: "Certificates", value: "View", hint: "Your achievements", onClick: () => setActiveTab("certificates"), ...STAT_PRESETS.events },
            { key: "videos", label: "Videos", value: "Library", hint: "Recorded sessions", onClick: () => setActiveTab("videos"), ...STAT_PRESETS.chat },
            { key: "payments", label: "Payments", value: workshopUser.payment_status === "paid" ? "Paid" : "Due", hint: "Workshop fees", onClick: () => setActiveTab("payments"), ...STAT_PRESETS.payments },
          ]}
        />
      </div>

      {/* Desktop Tab Bar — 3D pill (md only, hidden on lg where sidebar takes over) */}
      <div className="hidden md:block lg:hidden max-w-5xl mx-auto px-4 pt-5">
        <div className="bg-card border border-border/60 rounded-2xl p-1.5 flex gap-1 shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.12)]">
          {visibleTabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? activeStyle : {}}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
                activeTab === tab.key ? "text-primary-foreground font-semibold" : "text-muted-foreground font-medium hover:bg-muted"
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content — desktop (lg+) renders 3D sidebar + content grid */}
      <div className="max-w-7xl mx-auto px-4 py-4 relative z-10 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <DesktopTabsSidebar
          tabs={visibleTabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))}
          activeTab={activeTab}
          onChange={setActiveTab}
          title="Workshop"
          subtitle={workshopUser.name ? `Hi, ${workshopUser.name.split(" ")[0]}` : "Student"}
        />
        <div className="min-w-0">
          <div key={activeTab} className="tab-content-enter">
            {renderContent()}
          </div>
          <PageBuilderRenderer page="workshop-dashboard-builder" className="mt-6" />
        </div>
      </div>

      {/* Mobile Bottom Nav — IDENTICAL pill-style as the booking dashboard:
          rounded floating bar, primary background on the active tab,
          icon + tiny label, scrollable when more than 6 tabs are visible. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 pointer-events-none"
        aria-label="Workshop navigation"
      >
        <div className="pointer-events-auto mx-auto w-fit max-w-[calc(100vw-1.5rem)] bg-card border border-border/60 rounded-[28px] shadow-[0_8px_30px_hsl(var(--primary)/0.08)] px-1.5 py-1.5 flex items-center justify-around overflow-x-auto scrollbar-hide gap-0.5 snap-x snap-mandatory">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isProfile = tab.key === "profile";
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] h-13 px-2.5 py-1.5 rounded-2xl transition-all flex-shrink-0 ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-label={tab.label}
              >
                {isProfile ? (
                  <span className="relative">
                    <Avatar className={`w-[18px] h-[18px] transition-all ${isActive ? "ring-2 ring-primary-foreground/60" : "ring-1 ring-border/40"}`}>
                      <AvatarImage src={workshopUser.avatar_url || undefined} />
                      <AvatarFallback
                        className="text-[8px] font-bold text-primary-foreground"
                        style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))` }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {workshopUser.is_verified && (
                      <span
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center ring-2 ring-background"
                        style={{ background: "linear-gradient(135deg, hsl(210 90% 55%), hsl(220 85% 50%))" }}
                        aria-label="Verified"
                      >
                        <BadgeCheck className="w-2 h-2 text-white" strokeWidth={2.6} />
                      </span>
                    )}
                  </span>
                ) : (
                  <tab.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 1.8} />
                )}
                <span className={`text-[9.5px] leading-none font-sans ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default WorkshopDashboard;
