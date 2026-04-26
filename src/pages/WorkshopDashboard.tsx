import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Home, Award, FileText, Video, MessageSquare, Moon, Sun, User, Bell, Palette, LayoutDashboard, ChevronDown, BadgeCheck } from "lucide-react";
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
import WorkshopOnlineAttendancePopup from "@/components/workshop/WorkshopOnlineAttendancePopup";
import WorkshopCountdownOverlay from "@/components/workshop/WorkshopCountdownOverlay";
import PageBuilderRenderer from "@/components/PageBuilderRenderer";

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

// Tab order matches user request: Home, Profile, Videos, Notifications,
// Assignments, Certificates (with Feedback as a 7th scrollable tab).
const allTabs = [
  { key: "home", icon: Home, label: "Home", settingKey: null },
  { key: "profile", icon: User, label: "Profile", settingKey: null },
  { key: "videos", icon: Video, label: "Videos", settingKey: "global_video_access" },
  { key: "notifications", icon: Bell, label: "Alerts", settingKey: null },
  { key: "assignments", icon: FileText, label: "Tasks", settingKey: "assignment_submission_enabled" },
  { key: "certificates", icon: Award, label: "Certs", settingKey: "certificate_visibility" },
  { key: "feedback", icon: MessageSquare, label: "Feedback", settingKey: "feedback_visibility" },
];

const WorkshopDashboard = () => {
  const navigate = useNavigate();
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

  if (!workshopUser) return null;

  const visibleTabs = allTabs.filter(tab => {
    if (!tab.settingKey) return true;
    return settings[tab.settingKey]?.enabled !== false;
  });

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

      {/* Header — greeting LEFT, profile dropdown RIGHT */}
      <motion.div className="sticky top-0 z-40 backdrop-blur-2xl bg-card/85 border-b border-border/60 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.08)]"
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* LEFT: Greeting with logo */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <motion.div className="relative flex-shrink-0" whileHover={{ scale: 1.06, rotate: -2 }}>
              <div className="absolute -inset-1 rounded-2xl blur opacity-50"
                style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))` }} />
              <img src="/logo.png" alt="CCC" className="relative w-10 h-10 rounded-2xl shadow-md ring-1 ring-foreground/[0.06]" />
            </motion.div>
            <div className="min-w-0">
              <motion.p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-primary/80"
                initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                {getGreeting()}
              </motion.p>
              <motion.h1 className="text-foreground font-bold text-sm md:text-base tracking-tight truncate"
                initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                {workshopUser.name?.split(" ")[0] || "Student"} 🎨
                {workshopUser.roll_number && <span className="ml-1 text-[10px] font-semibold text-muted-foreground">#{workshopUser.roll_number}</span>}
              </motion.h1>
            </div>
          </div>

          {/* RIGHT: Profile dropdown menu */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="hidden md:flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowColorPicker(!showColorPicker)} className="rounded-xl text-muted-foreground" title="Theme color">
                <Palette className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} className="rounded-xl text-muted-foreground" title="Dark / Light">
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>

            {/* Mobile: tap avatar → directly opens Profile tab (no data dropdown) */}
            <button
              onClick={() => setActiveTab("profile")}
              className="md:hidden flex items-center gap-2 rounded-2xl pl-1 pr-2 py-1 bg-muted/50 hover:bg-muted transition-colors border border-border/60 shadow-sm"
              aria-label="Open profile"
            >
              <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                <AvatarImage src={workshopUser.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] font-bold text-primary-foreground"
                  style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))` }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>

            {/* Desktop keeps the rich dropdown menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-2 rounded-2xl pl-1 pr-2 py-1 bg-muted/50 hover:bg-muted transition-colors border border-border/60 shadow-sm">
                  <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                    <AvatarImage src={workshopUser.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] font-bold text-primary-foreground"
                      style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))` }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
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
                <DropdownMenuItem className="rounded-lg cursor-pointer md:hidden" onClick={() => setShowColorPicker(!showColorPicker)}>
                  <Palette className="w-4 h-4 mr-2" /> Theme color
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer md:hidden" onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />} {darkMode ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Main Dashboard
                </DropdownMenuItem>
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
              <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 items-center flex-wrap">
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
      </motion.div>

      {/* Desktop Tab Bar — 3D pill */}
      <div className="hidden md:block max-w-5xl mx-auto px-4 pt-5">
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

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-4 relative z-10">
        <div key={activeTab} className="tab-content-enter">
          {renderContent()}
        </div>
        <PageBuilderRenderer page="workshop-dashboard-builder" className="mt-6" />
      </div>

      {/* Mobile Bottom Nav — every tab including Profile, 3D */}
      {/* Mobile Bottom Nav — matches booking dashboard look:
          - 56px height, evenly spaced icons
          - Horizontally scrollable so 6+ tabs are reachable on small phones
          - First 6 tabs are sized to fit the viewport without scroll on most phones */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Workshop navigation">
        <div className="bg-background/95 backdrop-blur-lg border-t border-border/30">
          <div className="flex items-center overflow-x-auto scrollbar-hide max-w-lg mx-auto h-[56px] px-1">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const isProfile = tab.key === "profile";
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center justify-center min-w-[16.6%] flex-1 h-14 relative flex-shrink-0 active:scale-75 transition-transform duration-150"
                  aria-label={tab.label}
                >
                  {isProfile ? (
                    <span className="relative">
                      <Avatar className={`w-7 h-7 transition-all ${isActive ? "ring-2 ring-foreground" : "ring-1 ring-border/40 opacity-70"}`}>
                        <AvatarImage src={workshopUser.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] font-bold text-primary-foreground"
                          style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))` }}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {workshopUser.is_verified && (
                        <span
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-background"
                          style={{ background: "linear-gradient(135deg, hsl(210 90% 55%), hsl(220 85% 50%))" }}
                          aria-label="Verified"
                        >
                          <BadgeCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.6} />
                        </span>
                      )}
                    </span>
                  ) : (
                    <tab.icon
                      className={`transition-all duration-200 ${isActive ? "text-foreground" : "text-muted-foreground/40"}`}
                      size={isActive ? 24 : 20}
                      strokeWidth={isActive ? 2.2 : 1.4}
                      fill={isActive && tab.icon === Home ? "currentColor" : "none"}
                    />
                  )}
                  {isActive && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-foreground" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </nav>
    </div>
  );
};

export default WorkshopDashboard;
