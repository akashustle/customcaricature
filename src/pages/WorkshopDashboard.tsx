import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Home, Award, FileText, Video, MessageSquare } from "lucide-react";
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

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (!stored) {
      navigate("/workshop");
      return;
    }
    const user = JSON.parse(stored);
    setWorkshopUser(user);
    refreshUser(user.id);
  }, []);

  const refreshUser = async (userId: string) => {
    const { data } = await supabase.from("workshop_users" as any).select("*").eq("id", userId).single();
    if (data) {
      const user = data as any;
      if (!user.is_enabled) {
        localStorage.removeItem("workshop_user");
        toast({ title: "Account Disabled", variant: "destructive" });
        navigate("/workshop");
        return;
      }
      setWorkshopUser(user);
      localStorage.setItem("workshop_user", JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("workshop_user");
    navigate("/workshop");
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning ☀️";
    if (h < 17) return "Good Afternoon 🌤️";
    return "Good Evening 🌙";
  };

  if (!workshopUser) return null;

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
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: "linear-gradient(135deg, #fdf6f0 0%, #f0e6ff 30%, #e8f4fd 60%, #fff5f5 100%)" }}>
      
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-purple-100/40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CCC" className="w-9 h-9 rounded-xl border border-purple-200/40 shadow-sm" />
            <div>
              <h1 className="text-gray-800 font-bold text-sm md:text-base">
                {getGreeting()} {workshopUser.name?.split(" ")[0]}! 🎨
              </h1>
              <p className="text-gray-400 text-[10px] md:text-xs">Creative Caricature Club Workshop</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-xl"
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      {/* Desktop Tab Bar */}
      <div className="hidden md:block max-w-5xl mx-auto px-4 pt-4">
        <div className="backdrop-blur-xl bg-white/50 border border-purple-100/40 rounded-2xl p-1.5 flex gap-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-300/25"
                  : "text-gray-400 hover:text-gray-600 hover:bg-white/60"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl bg-white/70 border-t border-purple-100/40 shadow-lg">
        <div className="flex items-center justify-around py-2 px-1 max-w-md mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === tab.key
                  ? "text-white bg-gradient-to-b from-purple-500 to-pink-500 shadow-lg scale-105"
                  : "text-gray-400"
              }`}
            >
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
