import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, Video as VideoIcon, ExternalLink, AlertTriangle, Instagram, Youtube, Facebook, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/50 border border-purple-100/30 rounded-2xl p-5 shadow-sm ${className}`}>
    {children}
  </div>
);

const WorkshopHome = ({ user }: { user: any }) => {
  const [now, setNow] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

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
      async (pos) => {
        try {
          await supabase.from("workshop_user_locations" as any).upsert({
            user_id: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude,
            location_allowed: true, last_updated: new Date().toISOString(),
          } as any, { onConflict: "user_id" });
        } catch {}
      },
      async () => {
        try {
          await supabase.from("workshop_user_locations" as any).upsert({
            user_id: user.id, lat: 0, lng: 0,
            location_allowed: false, last_updated: new Date().toISOString(),
          } as any, { onConflict: "user_id" });
        } catch {}
      }
    );
  };

  const fetchData = () => { fetchAttendance(); fetchLiveSessions(); fetchSettings(); };
  const fetchAttendance = async () => {
    const { data } = await supabase.from("workshop_attendance" as any).select("*").eq("user_id", user.id);
    if (data) setAttendance(data as any[]);
  };
  const fetchLiveSessions = async () => {
    const { data } = await supabase.from("workshop_live_sessions" as any).select("*").order("session_date").order("slot");
    if (data) setLiveSessions(data as any[]);
  };
  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((s: any) => { map[s.id] = s.value; });
      setSettings(map);
    }
  };

  const getGreeting = () => {
    const h = now.getHours();
    if (h < 12) return "Good Morning ☀️";
    if (h < 17) return "Good Afternoon 🌤️";
    return "Good Evening 🌙";
  };

  const getAttendance = (date: string) => {
    const a = attendance.find((att: any) => att.session_date === date);
    return a?.status || "not_marked";
  };

  const slotLabel = user.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : user.slot === "6pm-9pm" ? "6:00 PM – 9:00 PM" : user.slot;

  const isSessionExpired = (session: any) => {
    if (!session.link_expiry) return false;
    return now > new Date(session.link_expiry);
  };

  // Check for workshop ended
  const workshopEnded = settings.workshop_ended?.enabled;

  return (
    <div className="space-y-4">
      {/* Workshop Ended Notice */}
      {workshopEnded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gradient-to-r from-green-100/80 to-emerald-100/80 border border-green-200/40 rounded-2xl p-5 text-center">
            <h2 className="text-green-700 font-bold text-lg mb-1">🎉 Workshop Completed!</h2>
            <p className="text-green-600 text-sm">Thank you for joining Creative Caricature Club Workshop. We hope you had a great learning experience!</p>
          </div>
        </motion.div>
      )}

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard>
          <p className="text-purple-500 text-sm font-medium mb-1">{getGreeting()}</p>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Hello, {user.name?.split(" ")[0]}! 👋
          </h2>
          <p className="text-gray-400 text-sm">Welcome to Creative Caricature Club Workshop</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4 text-purple-400" />
              {now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Clock className="w-4 h-4 text-pink-400" />
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Workshop Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard>
          <h3 className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wider">Workshop Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-100/40">
              <p className="text-gray-400 text-xs">Workshop Dates</p>
              <p className="text-gray-700 font-medium text-sm mt-1">14 March 2026 & 15 March 2026</p>
            </div>
            <div className="bg-pink-50/60 rounded-xl p-3 border border-pink-100/40">
              <p className="text-gray-400 text-xs">Your Slot</p>
              <p className="text-gray-700 font-medium text-sm mt-1">{slotLabel}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Attendance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard>
          <h3 className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wider">Attendance</h3>
          <div className="grid grid-cols-2 gap-3">
            {["2026-03-14", "2026-03-15"].map((date, i) => {
              const status = getAttendance(date);
              return (
                <div key={date} className={`rounded-xl p-4 border text-center ${
                  status === "present" ? "bg-green-50/80 border-green-200/40" :
                  status === "absent" ? "bg-red-50/80 border-red-200/40" :
                  "bg-gray-50/60 border-gray-200/30"
                }`}>
                  <p className="text-gray-400 text-xs">Day {i + 1}</p>
                  <p className="text-gray-700 text-sm font-medium mt-1">
                    {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </p>
                  <div className="mt-2">
                    {status === "present" ? (
                      <Badge className="bg-green-100 text-green-600 border-green-200 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Present
                      </Badge>
                    ) : status === "absent" ? (
                      <Badge className="bg-red-100 text-red-500 border-red-200 text-xs">
                        <XCircle className="w-3 h-3 mr-1" /> Absent
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-400 border-gray-200 text-xs">
                        Not Marked
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

      {/* Live Sessions */}
      {liveSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <h3 className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
              <VideoIcon className="w-4 h-4 text-purple-500" /> Live Sessions
            </h3>
            <div className="space-y-3">
              {liveSessions.map((session: any) => {
                const expired = isSessionExpired(session);
                const isLive = session.status === "live" && session.link_enabled && !expired;
                return (
                  <div key={session.id} className={`rounded-xl p-4 border ${
                    isLive ? "bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-200/40" :
                    "bg-gray-50/60 border-gray-200/30"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-gray-700 font-medium text-sm">{session.title}</h4>
                          {isLive && <Badge className="bg-red-500 text-white border-none text-[10px] animate-pulse">🔴 LIVE</Badge>}
                          {session.status === "completed" && <Badge className="bg-green-100 text-green-600 border-none text-[10px]">Completed</Badge>}
                          {expired && <Badge className="bg-amber-100 text-amber-600 border-none text-[10px]">Expired</Badge>}
                        </div>
                        <p className="text-gray-400 text-xs">
                          {new Date(session.session_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {session.slot && ` · ${session.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}`}
                        </p>
                        {session.artist_name && (
                          <p className="text-gray-500 text-xs mt-1">
                            Artist: {session.artist_name}
                            {session.artist_portfolio_link && (
                              <a href={session.artist_portfolio_link} target="_blank" rel="noopener noreferrer" className="text-purple-500 ml-1 inline-flex items-center gap-0.5">
                                Portfolio <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </p>
                        )}
                        {session.what_students_learn && (
                          <p className="text-gray-400 text-xs mt-1">📚 {session.what_students_learn}</p>
                        )}
                      </div>
                    </div>

                    {isLive && session.meet_link ? (
                      <div className="mt-3 space-y-2">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => window.open(session.meet_link, "_blank")}
                            className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-lg shadow-purple-300/25 text-base"
                          >
                            <VideoIcon className="w-5 h-5 mr-2" /> JOIN LIVE SESSION
                          </Button>
                        </motion.div>
                        <p className="text-[10px] text-center text-amber-500 flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          This link is only for workshop participants. Sharing is strictly not allowed.
                        </p>
                      </div>
                    ) : expired ? (
                      <p className="mt-2 text-xs text-amber-500">This live session has ended.</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Support & Social Links */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard>
          <h3 className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wider">Support & Connect</h3>
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/91${settings.whatsapp_support_number?.number || "8433843725"}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-50/80 border border-green-200/40 rounded-xl p-3 text-green-600 text-xs font-medium hover:bg-green-100/80 transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Support
            </a>
            <a href="https://www.instagram.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-pink-50/80 border border-pink-200/40 rounded-xl p-3 text-pink-500 text-xs font-medium hover:bg-pink-100/80 transition-colors">
              <Instagram className="w-4 h-4" /> Instagram
            </a>
            <a href="https://www.facebook.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-50/80 border border-blue-200/40 rounded-xl p-3 text-blue-500 text-xs font-medium hover:bg-blue-100/80 transition-colors">
              <Facebook className="w-4 h-4" /> Facebook
            </a>
            <a href="https://www.youtube.com/@creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-50/80 border border-red-200/40 rounded-xl p-3 text-red-500 text-xs font-medium hover:bg-red-100/80 transition-colors">
              <Youtube className="w-4 h-4" /> YouTube
            </a>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default WorkshopHome;
