import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { LogOut, User, Video, Award, FileText, MessageSquare } from "lucide-react";
import WorkshopProfile from "@/components/workshop/WorkshopProfile";
import WorkshopVideos from "@/components/workshop/WorkshopVideos";
import WorkshopCertificates from "@/components/workshop/WorkshopCertificates";
import WorkshopAssignments from "@/components/workshop/WorkshopAssignments";
import WorkshopFeedback from "@/components/workshop/WorkshopFeedback";

const WorkshopDashboard = () => {
  const navigate = useNavigate();
  const [workshopUser, setWorkshopUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (!stored) {
      navigate("/workshop");
      return;
    }
    const user = JSON.parse(stored);
    setWorkshopUser(user);
    // Refresh user data from DB
    refreshUser(user.id);
  }, []);

  const refreshUser = async (userId: string) => {
    const { data } = await supabase.from("workshop_users" as any).select("*").eq("id", userId).single();
    if (data) {
      setWorkshopUser(data);
      localStorage.setItem("workshop_user", JSON.stringify(data));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("workshop_user");
    navigate("/workshop");
  };

  if (!workshopUser) return null;

  const firstName = workshopUser.name?.split(" ")[0] || "Student";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Welcome, {firstName}! 🎨
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-sans">
              Creative Caricature Club Workshop
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="font-sans">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop Tabs */}
          <div className="hidden md:block mb-6">
            <TabsList className="w-full bg-card border border-border rounded-2xl p-1.5">
              <TabsTrigger value="profile" className="font-sans rounded-full"><User className="w-4 h-4 mr-1" />Profile</TabsTrigger>
              <TabsTrigger value="videos" className="font-sans rounded-full"><Video className="w-4 h-4 mr-1" />Videos</TabsTrigger>
              <TabsTrigger value="certificates" className="font-sans rounded-full"><Award className="w-4 h-4 mr-1" />Certificate</TabsTrigger>
              <TabsTrigger value="assignments" className="font-sans rounded-full"><FileText className="w-4 h-4 mr-1" />Assignment</TabsTrigger>
              <TabsTrigger value="feedback" className="font-sans rounded-full"><MessageSquare className="w-4 h-4 mr-1" />Feedback</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile"><WorkshopProfile user={workshopUser} /></TabsContent>
          <TabsContent value="videos"><WorkshopVideos user={workshopUser} /></TabsContent>
          <TabsContent value="certificates"><WorkshopCertificates user={workshopUser} /></TabsContent>
          <TabsContent value="assignments"><WorkshopAssignments user={workshopUser} /></TabsContent>
          <TabsContent value="feedback"><WorkshopFeedback user={workshopUser} /></TabsContent>
        </Tabs>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around py-2 px-1">
          {[
            { key: "profile", icon: User, label: "Profile" },
            { key: "videos", icon: Video, label: "Videos" },
            { key: "certificates", icon: Award, label: "Certificate" },
            { key: "assignments", icon: FileText, label: "Assignment" },
            { key: "feedback", icon: MessageSquare, label: "Feedback" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                activeTab === item.key
                  ? "text-primary-foreground bg-primary shadow-md scale-105"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-sans font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkshopDashboard;
