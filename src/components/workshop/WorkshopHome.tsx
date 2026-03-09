import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, Video as VideoIcon, ExternalLink, AlertTriangle, Instagram, Youtube, Facebook, Phone, MessageCircle, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WorkshopHome = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [now, setNow] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  const cardBg = dm ? "bg-[#241f33]/80 border-[#3a3150]/50" : "bg-white/50 border-purple-100/30";
  const textPrimary = dm ? "text-white font-bold" : "text-[#3a2e22] font-bold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-[#5a4a3a] font-medium";
  const textMuted = dm ? "text-white/40" : "text-[#8a7a6a]";

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    fetchData();
    requestLocation();
    const ch = supabase.channel("workshop-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_attendance" }, fetchAttendance)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_sessions" }, fetchLiveSessions)
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => { try { await supabase.from("workshop_user_locations" as any).upsert({ user_id: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude, location_allowed: true, last_updated: new Date().toISOString() } as any, { onConflict: "user_id" }); } catch {} },
      async () => { try { await supabase.from("workshop_user_locations" as any).upsert({ user_id: user.id, lat: 0, lng: 0, location_allowed: false, last_updated: new Date().toISOString() } as any, { onConflict: "user_id" }); } catch {} }
    );
  };

  const fetchData = () => { fetchAttendance(); fetchLiveSessions(); fetchSettings(); };
  const fetchAttendance = async () => { const { data } = await supabase.from("workshop_attendance" as any).select("*").eq("user_id", user.id); if (data) setAttendance(data as any[]); };
  const fetchLiveSessions = async () => { const { data } = await supabase.from("workshop_live_sessions" as any).select("*").order("session_date").order("slot"); if (data) setLiveSessions(data as any[]); };
  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) { const map: any = {}; (data as any[]).forEach((s: any) => { map[s.id] = s.value; }); setSettings(map); }
  };

  const getAttendance = (date: string) => attendance.find((att: any) => att.session_date === date)?.status || "not_marked";
  const slotLabel = user.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : "6:00 PM – 9:00 PM";
  const isSessionExpired = (session: any) => session.link_expiry ? now > new Date(session.link_expiry) : false;
  const workshopEnded = settings.workshop_ended?.enabled;
  const whatsappNum = settings.whatsapp_support_number?.number || "8433843725";

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>
  );

  const statusBadge = (status: string) => {
    if (status === "present") return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
    if (status === "absent") return <Badge className="bg-red-100 text-red-600 border-red-200 text-xs font-bold"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
    if (status === "video_session") return <Badge className="bg-blue-100 text-blue-600 border-blue-200 text-xs font-bold"><MonitorPlay className="w-3 h-3 mr-1" />Video Session</Badge>;
    return <Badge className={`${dm ? "bg-white/10 text-white/40" : "bg-gray-100 text-gray-400"} border-gray-200 text-xs`}>Not Marked</Badge>;
  };

  return (
    <div className="space-y-4">
      {workshopEnded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`${dm ? "bg-green-900/30 border-green-700/40" : "bg-gradient-to-r from-green-100/80 to-emerald-100/80 border-green-200/40"} border rounded-2xl p-5 text-center`}>
            <h2 className={`${dm ? "text-green-400" : "text-green-700"} font-bold text-lg mb-1`}>🎉 Workshop Completed!</h2>
            <p className={`${dm ? "text-green-300/70" : "text-green-600"} text-sm font-medium`}>Thank you for joining Creative Caricature Club Workshop!</p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard>
          <p className={`${dm ? "text-purple-400" : "text-purple-500"} text-sm font-bold mb-1`}>
            {now.getHours() < 12 ? "Good Morning ☀️" : now.getHours() < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙"}
          </p>
          <h2 className={`text-2xl ${textPrimary} mb-1`}>Hello, {user.name?.split(" ")[0]}! 👋</h2>
          <p className={`${textMuted} text-sm`}>Welcome to Creative Caricature Club Workshop {user.roll_number && `· Roll #${user.roll_number}`}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className={`flex items-center gap-2 ${textSecondary} text-sm`}>
              <Calendar className="w-4 h-4 text-purple-400" />
              {now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <div className={`flex items-center gap-2 ${textSecondary} text-sm`}>
              <Clock className="w-4 h-4 text-pink-400" />
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard>
          <h3 className={`${textPrimary} text-sm uppercase tracking-wider mb-3`}>Workshop Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`${dm ? "bg-purple-900/20 border-purple-700/30" : "bg-purple-50/60 border-purple-100/40"} rounded-xl p-3 border`}>
              <p className={`${textMuted} text-xs`}>Dates</p>
              <p className={`${textPrimary} text-sm mt-1`}>14 March & 15 March 2026</p>
            </div>
            <div className={`${dm ? "bg-pink-900/20 border-pink-700/30" : "bg-pink-50/60 border-pink-100/40"} rounded-xl p-3 border`}>
              <p className={`${textMuted} text-xs`}>Your Slot</p>
              <p className={`${textPrimary} text-sm mt-1`}>{slotLabel}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard>
          <h3 className={`${textPrimary} text-sm uppercase tracking-wider mb-3`}>Attendance</h3>
          <div className="grid grid-cols-2 gap-3">
            {["2026-03-14", "2026-03-15"].map((date, i) => {
              const status = getAttendance(date);
              return (
                <div key={date} className={`rounded-xl p-4 border text-center ${
                  status === "present" ? (dm ? "bg-green-900/20 border-green-700/30" : "bg-green-50/80 border-green-200/40") :
                  status === "absent" ? (dm ? "bg-red-900/20 border-red-700/30" : "bg-red-50/80 border-red-200/40") :
                  status === "video_session" ? (dm ? "bg-blue-900/20 border-blue-700/30" : "bg-blue-50/80 border-blue-200/40") :
                  (dm ? "bg-white/5 border-white/10" : "bg-gray-50/60 border-gray-200/30")
                }`}>
                  <p className={`${textMuted} text-xs`}>Day {i + 1}</p>
                  <p className={`${textPrimary} text-sm mt-1`}>{new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                  <div className="mt-2">{statusBadge(status)}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

      {liveSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <h3 className={`${textPrimary} text-sm uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <VideoIcon className="w-4 h-4 text-purple-500" /> Live Sessions
            </h3>
            <div className="space-y-3">
              {liveSessions.map((session: any) => {
                const expired = isSessionExpired(session);
                const isLive = session.status === "live" && session.link_enabled && !expired;
                return (
                  <div key={session.id} className={`rounded-xl p-4 border ${
                    isLive ? (dm ? "bg-purple-900/20 border-purple-700/30" : "bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-200/40") :
                    (dm ? "bg-white/5 border-white/10" : "bg-gray-50/60 border-gray-200/30")
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`${textPrimary} text-sm`}>{session.title}</h4>
                          {isLive && <Badge className="bg-red-500 text-white border-none text-[10px] animate-pulse font-bold">🔴 LIVE</Badge>}
                          {session.status === "completed" && <Badge className="bg-green-100 text-green-600 border-none text-[10px] font-bold">Done</Badge>}
                        </div>
                        <p className={`${textMuted} text-xs`}>
                          {new Date(session.session_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {session.slot && ` · ${session.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}`}
                        </p>
                        {session.artist_name && (
                          <p className={`${textSecondary} text-xs mt-1`}>
                            Artist: {session.artist_name}
                            {session.artist_portfolio_link && <a href={session.artist_portfolio_link} target="_blank" rel="noopener noreferrer" className="text-purple-500 ml-1 inline-flex items-center gap-0.5 font-bold">Portfolio <ExternalLink className="w-2.5 h-2.5" /></a>}
                          </p>
                        )}
                        {session.what_students_learn && <p className={`${textMuted} text-xs mt-1`}>📚 {session.what_students_learn}</p>}
                      </div>
                    </div>
                    {isLive && session.meet_link && (
                      <div className="mt-3 space-y-2">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={() => window.open(session.meet_link, "_blank")}
                            className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-lg text-base">
                            <VideoIcon className="w-5 h-5 mr-2" /> JOIN LIVE SESSION
                          </Button>
                        </motion.div>
                        <p className="text-[10px] text-center text-amber-500 flex items-center justify-center gap-1 font-medium"><AlertTriangle className="w-3 h-3" />Only for workshop participants</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard>
          <h3 className={`${textPrimary} text-sm uppercase tracking-wider mb-3`}>Support & Connect</h3>
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/91${whatsappNum}`} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 ${dm ? "bg-green-900/20 border-green-700/30" : "bg-green-50/80 border-green-200/40"} border rounded-xl p-3 ${dm ? "text-green-400" : "text-green-600"} text-xs font-bold hover:opacity-80 transition-opacity`}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a href="https://www.instagram.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 ${dm ? "bg-pink-900/20 border-pink-700/30" : "bg-pink-50/80 border-pink-200/40"} border rounded-xl p-3 ${dm ? "text-pink-400" : "text-pink-500"} text-xs font-bold hover:opacity-80 transition-opacity`}>
              <Instagram className="w-4 h-4" /> Instagram
            </a>
            <a href="https://www.facebook.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 ${dm ? "bg-blue-900/20 border-blue-700/30" : "bg-blue-50/80 border-blue-200/40"} border rounded-xl p-3 ${dm ? "text-blue-400" : "text-blue-500"} text-xs font-bold hover:opacity-80 transition-opacity`}>
              <Facebook className="w-4 h-4" /> Facebook
            </a>
            <a href="https://www.youtube.com/@creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 ${dm ? "bg-red-900/20 border-red-700/30" : "bg-red-50/80 border-red-200/40"} border rounded-xl p-3 ${dm ? "text-red-400" : "text-red-500"} text-xs font-bold hover:opacity-80 transition-opacity`}>
              <Youtube className="w-4 h-4" /> YouTube
            </a>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default WorkshopHome;
