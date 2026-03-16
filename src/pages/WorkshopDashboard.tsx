import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Home, Award, FileText, Video, MessageSquare, Moon, Sun, User, Bell, Sparkles, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const ACCENT_COLORS = [
  { name: "Gold", primary: "#b08d57", secondary: "#c9a96e" },
  { name: "Purple", primary: "#7c3aed", secondary: "#8b5cf6" },
  { name: "Teal", primary: "#0d9488", secondary: "#14b8a6" },
  { name: "Rose", primary: "#e11d48", secondary: "#f43f5e" },
  { name: "Blue", primary: "#2563eb", secondary: "#3b82f6" },
  { name: "Amber", primary: "#d97706", secondary: "#f59e0b" },
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
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 1046;
      g2.gain.value = 0.0001;
      osc2.connect(g2);
      g2.connect(ctx.destination);
      g2.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 150);
  } catch {}
};

const allTabs = [
  { key: "home", icon: Home, label: "Home", settingKey: null },
  { key: "notifications", icon: Bell, label: "Alerts", settingKey: null },
  { key: "videos", icon: Video, label: "Videos", settingKey: "global_video_access" },
  { key: "assignments", icon: FileText, label: "Assignments", settingKey: "assignment_submission_enabled" },
  { key: "certificates", icon: Award, label: "Certificates", settingKey: "certificate_visibility" },
  { key: "feedback", icon: MessageSquare, label: "Feedback", settingKey: "feedback_visibility" },
  { key: "profile", icon: User, label: "Profile", settingKey: null },
];

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const [workshopUser, setWorkshopUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ws_user_dark") === "true");
  const [settings, setSettings] = useState<any>({});
  const [accentIdx, setAccentIdx] = useState(() => parseInt(localStorage.getItem("ws_accent") || "0") || 0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const prevSettingsRef = useRef<any>({});

  const accent = ACCENT_COLORS[accentIdx] || ACCENT_COLORS[0];

  useEffect(() => { localStorage.setItem("ws_user_dark", darkMode.toString()); }, [darkMode]);
  useEffect(() => { localStorage.setItem("ws_accent", accentIdx.toString()); }, [accentIdx]);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (!stored) { navigate("/workshop"); return; }

    const user = JSON.parse(stored);
    setWorkshopUser(user);
    refreshUser(user.id);
    fetchSettings();

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
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings" }, (payload: any) => {
        fetchSettings();
        playNotifSound();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_sessions" }, () => {
        playNotifSound();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workshop_notifications", filter: `user_id=eq.${user.id}` }, () => {
        playNotifSound();
      })
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

  const dm = darkMode;
  const bg = dm ? "bg-[#0f0d15]" : "bg-gradient-to-br from-[#f5f0ff] via-[#efe8fc] to-[#fdf0f8]";
  const headerBg = dm ? "bg-[#1a1625]/95 border-white/10" : "bg-white/80 border-[#e8ddd0]";
  const textPrimary = dm ? "text-white font-bold" : "text-[#3a2e22] font-bold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-[#6a5a4a] font-medium";
  const activeClass = `text-white shadow-lg font-bold`;
  const activeStyle = { background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`, boxShadow: `0 4px 15px ${accent.primary}40` };
  const inactiveClass = dm ? "text-white/50 font-medium" : "text-[#6a5a4a] font-medium";

  const visibleTabs = allTabs.filter(tab => {
    if (!tab.settingKey) return true;
    return settings[tab.settingKey]?.enabled !== false;
  });

  if (!visibleTabs.find(t => t.key === activeTab)) {
    setActiveTab("home");
  }

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

  return (
    <div className={`min-h-screen pb-24 md:pb-8 ${bg} transition-colors duration-500`}>
      <WorkshopOnlineAttendancePopup user={workshopUser} darkMode={darkMode} />
      <WorkshopCountdownOverlay user={workshopUser} />

      {/* Ambient particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + i * 2,
              height: 4 + i * 2,
              background: `${accent.primary}15`,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>

      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-xl ${headerBg} border-b shadow-sm`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.img src="/logo.png" alt="CCC" className="w-9 h-9 rounded-xl shadow-sm"
              style={{ border: `2px solid ${accent.primary}40` }}
              animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity }} />
            <div>
              <h1 className={`${textPrimary} text-sm md:text-base`}>{getGreeting()} {workshopUser.name?.split(" ")[0]}! 🎨</h1>
              <p className={`${textSecondary} text-[10px] md:text-xs`}>Creative Caricature Club Workshop {workshopUser.roll_number && `· Roll #${workshopUser.roll_number}`}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShowColorPicker(!showColorPicker)} className={`${textSecondary} rounded-xl`}>
              <Palette className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)} className={`${textSecondary} rounded-xl`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className={`${textSecondary} rounded-xl`}>
              <LogOut className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Color picker dropdown */}
        <AnimatePresence>
          {showColorPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 items-center">
                <span className={`${textSecondary} text-xs`}>Theme:</span>
                {ACCENT_COLORS.map((c, i) => (
                  <button
                    key={c.name}
                    onClick={() => { setAccentIdx(i); setShowColorPicker(false); }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${accentIdx === i ? "scale-125 border-white shadow-lg" : "border-transparent hover:scale-110"}`}
                    style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})` }}
                    title={c.name}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Tab Bar */}
      <div className="hidden md:block max-w-5xl mx-auto px-4 pt-4">
        <div className={`backdrop-blur-xl ${dm ? "bg-white/5 border-white/10" : "bg-white/60 border-[#e8ddd0]/40"} border rounded-2xl p-1.5 flex gap-1 shadow-sm`}>
          {visibleTabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? activeStyle : {}}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${activeTab === tab.key ? activeClass : `${inactiveClass} hover:bg-white/10`}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-4 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Nav */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl ${dm ? "bg-[#1a1625]/95 border-white/10" : "bg-white/95 border-[#e8ddd0]"} border-t shadow-xl`}>
        <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
          {visibleTabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? activeStyle : {}}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${activeTab === tab.key ? `${activeClass} scale-105` : inactiveClass}`}>
              <tab.icon className="w-5 h-5" />
              <span className="text-[9px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkshopDashboard;
