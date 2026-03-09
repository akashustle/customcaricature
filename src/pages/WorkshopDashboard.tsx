import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Home, Award, FileText, Video, MessageSquare, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import WorkshopHome from "@/components/workshop/WorkshopHome";
import WorkshopCertificates from "@/components/workshop/WorkshopCertificates";
import WorkshopAssignments from "@/components/workshop/WorkshopAssignments";
import WorkshopVideos from "@/components/workshop/WorkshopVideos";
import WorkshopFeedback from "@/components/workshop/WorkshopFeedback";

const tabs = [
  { key: "home", icon: Home, label: "Home" },
  { key: "certificates", icon: Award, label: "Certificates" },
  { key: "assignments", icon: FileText, label: "Assignments" },
  { key: "videos", icon: Video, label: "Videos" },
  { key: "feedback", icon: MessageSquare, label: "Feedback" },
];

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const [workshopUser, setWorkshopUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ws_user_dark") === "true");

  useEffect(() => { localStorage.setItem("ws_user_dark", darkMode.toString()); }, [darkMode]);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (!stored) { navigate("/workshop"); return; }
    const user = JSON.parse(stored);
    setWorkshopUser(user);
    refreshUser(user.id);
  }, []);

  const refreshUser = async (userId: string) => {
    const { data } = await supabase.from("workshop_users" as any).select("*").eq("id", userId).single();
    if (data) {
      const user = data as any;
      if (!user.is_enabled) { localStorage.removeItem("workshop_user"); toast({ title: "Account Disabled", variant: "destructive" }); navigate("/workshop"); return; }
      setWorkshopUser(user); localStorage.setItem("workshop_user", JSON.stringify(user));
    }
  };

  const handleLogout = () => { localStorage.removeItem("workshop_user"); navigate("/workshop"); };

  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return "Good Morning ☀️"; if (h < 17) return "Good Afternoon 🌤️"; return "Good Evening 🌙"; };

  if (!workshopUser) return null;

  const dm = darkMode;
  const bg = dm ? "bg-[#1a1625]" : "bg-gradient-to-br from-[#fdf8f3] via-[#f5efe6] to-[#faf5ef]";
  const headerBg = dm ? "bg-[#1a1625]/95 border-white/10" : "bg-white/80 border-[#e8ddd0]";
  const textPrimary = dm ? "text-white" : "text-[#5a4a3a]";
  const textSecondary = dm ? "text-white/50" : "text-[#8b7b6a]";
  const activeClass = "bg-gradient-to-r from-[#b08d57] to-[#c9a96e] text-white shadow-md shadow-[#b08d57]/20";
  const inactiveClass = dm ? "text-white/40" : "text-[#8b7b6a]";

  const renderContent = () => {
    switch (activeTab) {
      case "home": return <WorkshopHome user={workshopUser} />;
      case "certificates": return <WorkshopCertificates user={workshopUser} />;
      case "assignments": return <WorkshopAssignments user={workshopUser} />;
      case "videos": return <WorkshopVideos user={workshopUser} />;
      case "feedback": return <WorkshopFeedback user={workshopUser} />;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen pb-24 md:pb-8 ${bg} transition-colors duration-300`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-xl ${headerBg} border-b shadow-sm`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CCC" className="w-9 h-9 rounded-xl border border-[#b08d57]/30 shadow-sm" />
            <div>
              <h1 className={`${textPrimary} font-bold text-sm md:text-base`}>{getGreeting()} {workshopUser.name?.split(" ")[0]}! 🎨</h1>
              <p className={`${textSecondary} text-[10px] md:text-xs`}>Creative Caricature Club Workshop</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)} className={`${textSecondary} rounded-xl`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className={`${textSecondary} rounded-xl`}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Tab Bar */}
      <div className="hidden md:block max-w-5xl mx-auto px-4 pt-4">
        <div className={`backdrop-blur-xl ${dm ? "bg-white/5 border-white/10" : "bg-white/60 border-[#e8ddd0]/40"} border rounded-2xl p-1.5 flex gap-1 shadow-sm`}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key ? activeClass : `${inactiveClass} hover:${dm ? "text-white" : "text-[#5a4a3a]"} hover:bg-white/10`}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Nav */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl ${dm ? "bg-[#1a1625]/90 border-white/10" : "bg-white/80 border-[#e8ddd0]"} border-t shadow-lg`}>
        <div className="flex items-center justify-around py-2 px-1 max-w-md mx-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${activeTab === tab.key ? `${activeClass} scale-105` : inactiveClass}`}>
              <tab.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkshopDashboard;
