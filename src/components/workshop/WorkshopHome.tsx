import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, Video as VideoIcon, ExternalLink, AlertTriangle, Users, Instagram, Youtube, Facebook, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
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
            user_id: user.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            location_allowed: true,
            last_updated: new Date().toISOString(),
          } as any, { onConflict: "user_id" });
        } catch {}
      },
      async () => {
        try {
          await supabase.from("workshop_user_locations" as any).upsert({
            user_id: user.id,
            lat: 0, lng: 0,
            location_allowed: false,
            last_updated: new Date().toISOString(),
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

  const getAttendance = (date: string) => {
    const a = attendance.find((att: any) => att.session_date === date);
    return a?.status || "not_marked";
  };

  const slotLabel = user.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : user.slot === "6pm-9pm" ? "6:00 PM – 9:00 PM" : user.slot;

  const isSessionExpired = (session: any) => {
    if (!session.link_expiry) return false;
    return now > new Date(session.link_expiry);
  };

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard>
          <h2 className="text-2xl font-bold text-white mb-1">
            Hello, {user.name?.split(" ")[0]}! 👋
          </h2>
          <p className="text-white/50 text-sm">Welcome to Creative Caricature Club Workshop</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Calendar className="w-4 h-4 text-purple-400" />
              {now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Clock className="w-4 h-4 text-pink-400" />
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Workshop Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard>
          <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Workshop Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-white/40 text-xs">Workshop Dates</p>
              <p className="text-white font-medium text-sm mt-1">14 March 2026 & 15 March 2026</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-white/40 text-xs">Your Slot</p>
              <p className="text-white font-medium text-sm mt-1">{slotLabel}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Attendance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard>
          <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Attendance</h3>
          <div className="grid grid-cols-2 gap-3">
            {["2026-03-14", "2026-03-15"].map((date, i) => {
              const status = getAttendance(date);
              return (
                <div key={date} className={`rounded-xl p-4 border text-center ${
                  status === "present" ? "bg-green-500/10 border-green-500/30" :
                  status === "absent" ? "bg-red-500/10 border-red-500/30" :
                  "bg-white/5 border-white/10"
                }`}>
                  <p className="text-white/40 text-xs">Day {i + 1}</p>
                  <p className="text-white text-sm font-medium mt-1">
                    {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </p>
                  <div className="mt-2">
                    {status === "present" ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Present
                      </Badge>
                    ) : status === "absent" ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        <XCircle className="w-3 h-3 mr-1" /> Absent
                      </Badge>
                    ) : (
                      <Badge className="bg-white/10 text-white/40 border-white/10 text-xs">
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
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
              <VideoIcon className="w-4 h-4 text-purple-400" /> Live Sessions
            </h3>
            <div className="space-y-3">
              {liveSessions.map((session: any) => {
                const expired = isSessionExpired(session);
                const isLive = session.status === "live" && session.link_enabled && !expired;
                return (
                  <div key={session.id} className={`rounded-xl p-4 border ${
                    isLive ? "bg-gradient-to-r from-purple-500/15 to-pink-500/15 border-purple-500/30 animate-pulse-slow" :
                    "bg-white/5 border-white/10"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium text-sm">{session.title}</h4>
                          {isLive && <Badge className="bg-red-500 text-white border-none text-[10px] animate-pulse">🔴 LIVE</Badge>}
                          {session.status === "completed" && <Badge className="bg-green-500/20 text-green-400 border-none text-[10px]">Completed</Badge>}
                          {expired && <Badge className="bg-yellow-500/20 text-yellow-400 border-none text-[10px]">Expired</Badge>}
                        </div>
                        <p className="text-white/40 text-xs">
                          {new Date(session.session_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {session.slot && ` · ${session.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}`}
                        </p>
                        {session.artist_name && (
                          <p className="text-white/50 text-xs mt-1">
                            Artist: {session.artist_name}
                            {session.artist_portfolio_link && (
                              <a href={session.artist_portfolio_link} target="_blank" rel="noopener noreferrer" className="text-purple-400 ml-1 inline-flex items-center gap-0.5">
                                Portfolio <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </p>
                        )}
                        {session.what_students_learn && (
                          <p className="text-white/40 text-xs mt-1">📚 {session.what_students_learn}</p>
                        )}
                      </div>
                    </div>

                    {isLive && session.meet_link ? (
                      <div className="mt-3 space-y-2">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => window.open(session.meet_link, "_blank")}
                            className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 text-base"
                          >
                            <VideoIcon className="w-5 h-5 mr-2" /> JOIN LIVE SESSION
                          </Button>
                        </motion.div>
                        <p className="text-[10px] text-center text-yellow-400/60 flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          This link is only for workshop participants. Sharing is strictly not allowed.
                        </p>
                      </div>
                    ) : expired ? (
                      <p className="mt-2 text-xs text-yellow-400/60">This live session has ended.</p>
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
          <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Support & Connect</h3>
          <div className="grid grid-cols-2 gap-2">
            <a href="https://wa.me/918369594271" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">
              <Phone className="w-4 h-4" /> WhatsApp Support
            </a>
            <a href="https://www.instagram.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 text-pink-400 text-xs font-medium hover:bg-pink-500/20 transition-colors">
              <Instagram className="w-4 h-4" /> Instagram
            </a>
            <a href="https://www.facebook.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
              <Facebook className="w-4 h-4" /> Facebook
            </a>
            <a href="https://www.youtube.com/@creativecaricatureclub" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
              <Youtube className="w-4 h-4" /> YouTube
            </a>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default WorkshopHome;
