import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, Video as VideoIcon, ExternalLink, AlertTriangle, Instagram, Youtube, Facebook, Phone, MessageCircle, MonitorPlay, Maximize, Volume2, Sparkles, BadgeCheck, Award, FileText, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const WorkshopHome = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [now, setNow] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [countdownFullscreen, setCountdownFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [countdownFinished, setCountdownFinished] = useState(false);

  // White 3D aesthetic — matches the user dashboard hero card
  const cardBg = dm ? "bg-[#241f33]/80 border-[#3a3150]/50" : "bg-white border-white/80";
  const textPrimary = dm ? "text-white font-bold" : "text-slate-900 font-bold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-slate-600 font-medium";
  const textMuted = dm ? "text-white/40" : "text-slate-400";

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    fetchData();
    requestLocation();
    const ch = supabase.channel("workshop-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_attendance" }, fetchAttendance)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_sessions" }, fetchLiveSessions)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings" }, fetchSettings)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_session_requests" }, fetchLiveRequests)
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    // Only ask for location once per device on dashboard login (per admin policy)
    const ASK_KEY = "ccc_workshop_location_asked_v1";
    if (typeof window !== "undefined" && localStorage.getItem(ASK_KEY) === "done") return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try { localStorage.setItem(ASK_KEY, "done"); } catch {}
        try { await supabase.from("workshop_user_locations" as any).upsert({ user_id: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude, location_allowed: true, last_updated: new Date().toISOString() } as any, { onConflict: "user_id" }); } catch {}
      },
      async () => {
        try { localStorage.setItem(ASK_KEY, "done"); } catch {}
        try { await supabase.from("workshop_user_locations" as any).upsert({ user_id: user.id, lat: 0, lng: 0, location_allowed: false, last_updated: new Date().toISOString() } as any, { onConflict: "user_id" }); } catch {}
      }
    );
  };

  const fetchData = () => { fetchAttendance(); fetchLiveSessions(); fetchSettings(); fetchLiveRequests(); };
  const fetchAttendance = async () => { const { data } = await supabase.from("workshop_attendance" as any).select("*").eq("user_id", user.id); if (data) setAttendance(data as any[]); };
  const fetchLiveSessions = async () => { const { data } = await supabase.from("workshop_live_sessions" as any).select("*").order("session_date").order("slot"); if (data) setLiveSessions(data as any[]); };
  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) { const map: any = {}; (data as any[]).forEach((s: any) => { map[s.id] = s.value; }); setSettings(map); }
  };
  const fetchLiveRequests = async () => {
    const { data } = await supabase.from("workshop_live_session_requests" as any).select("*").eq("user_id", user.id);
    if (data) setLiveRequests(data as any[]);
  };

  const getAttendance = (date: string) => attendance.find((att: any) => att.session_date === date)?.status || "not_marked";
  const slotLabel = user.slot === "12pm-3pm" ? "12:00 PM – 3:00 PM" : "6:00 PM – 9:00 PM";
  const isSessionExpired = (session: any) => session.link_expiry ? now > new Date(session.link_expiry) : false;
  const workshopEnded = settings.workshop_ended?.enabled;
  const whatsappNum = settings.whatsapp_support_number?.number || "8433843725";

  // Filter live sessions by user's slot
  const filteredSessions = liveSessions.filter(s => {
    if (!s.slot) return true;
    return s.slot === user.slot;
  });

  // Countdown timer
  const countdownTarget = settings.countdown_timer?.target_time ? new Date(settings.countdown_timer.target_time) : null;
  const countdownEnabled = settings.countdown_timer?.enabled && countdownTarget;
  const countdownLabel = settings.countdown_timer?.label || "Session starts in";

  const getCountdownParts = () => {
    if (!countdownTarget) return null;
    const diff = countdownTarget.getTime() - now.getTime();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
    };
  };

  const countdownParts = countdownEnabled ? getCountdownParts() : null;

  // Audio cue when countdown reaches 0
  useEffect(() => {
    if (countdownEnabled && countdownTarget) {
      const diff = countdownTarget.getTime() - now.getTime();
      if (diff <= 0 && diff > -2000 && !countdownFinished) {
        setCountdownFinished(true);
        // Play a beep sound
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1);
        } catch {}
      }
    }
  }, [now, countdownEnabled, countdownTarget, countdownFinished]);

  // Recorded session preference
  const prefersRecorded = user.prefers_recorded;
  const liveRequest = liveRequests[0];

  const requestLiveSession = async () => {
    await supabase.from("workshop_live_session_requests" as any).insert({ user_id: user.id, status: "pending" } as any);
    fetchLiveRequests();
  };

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 border ${dm ? cardBg : "border-white/80"} ${className}`}
      style={
        dm
          ? undefined
          : {
              background:
                "linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eef2ff 100%)",
              boxShadow:
                "0 20px 45px -25px hsl(252 60% 40% / 0.18), 0 4px 16px -10px hsl(252 60% 40% / 0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
            }
      }
    >
      {children}
    </div>
  );

  const statusBadge = (status: string) => {
    if (status === "present") return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
    if (status === "absent") return <Badge className="bg-red-100 text-red-600 border-red-200 text-xs font-bold"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
    if (status === "video_session") return <Badge className="bg-blue-100 text-blue-600 border-blue-200 text-xs font-bold"><MonitorPlay className="w-3 h-3 mr-1" />Recorded Session</Badge>;
    return <Badge className={`${dm ? "bg-white/10 text-white/40" : "bg-gray-100 text-gray-400"} border-gray-200 text-xs`}>Not Marked</Badge>;
  };

  // Countdown fullscreen overlay
  const CountdownOverlay = () => {
    if (!countdownFullscreen || !countdownParts) return null;
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center" onClick={() => setCountdownFullscreen(false)}>
        <p className="text-white/60 text-xl mb-4 font-bold">{countdownLabel}</p>
        <div className="flex gap-6">
          {[
            { val: countdownParts.days, label: "Days" },
            { val: countdownParts.hours, label: "Hours" },
            { val: countdownParts.mins, label: "Minutes" },
            { val: countdownParts.secs, label: "Seconds" },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <p className="text-7xl md:text-9xl font-mono font-bold text-white tabular-nums">{String(p.val).padStart(2, "0")}</p>
              <p className="text-white/40 text-sm mt-2 font-medium">{p.label}</p>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-xs mt-8">Tap anywhere to exit fullscreen</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <CountdownOverlay />

      {workshopEnded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`${dm ? "bg-green-900/30 border-green-700/40" : "bg-gradient-to-r from-green-100/80 to-emerald-100/80 border-green-200/40"} border rounded-2xl p-5 text-center`}>
            <h2 className={`${dm ? "text-green-400" : "text-green-700"} font-bold text-lg mb-1`}>🎉 Workshop Completed!</h2>
            <p className={`${dm ? "text-green-300/70" : "text-green-600"} text-sm font-medium`}>Thank you for joining Creative Caricature Club™ Workshop!</p>
          </div>
        </motion.div>
      )}

      {/* Countdown Timer */}
      {countdownEnabled && countdownParts && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className={`${dm ? "!bg-gradient-to-r from-purple-900/40 to-pink-900/40 !border-purple-700/40" : "!bg-gradient-to-r from-purple-50/80 to-pink-50/80 !border-purple-200/40"}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`${textSecondary} text-xs uppercase tracking-wider`}>{countdownLabel}</p>
              <Button variant="ghost" size="sm" onClick={() => setCountdownFullscreen(true)} className={`${textMuted} h-7 px-2`}>
                <Maximize className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex justify-center gap-4">
              {[
                { val: countdownParts.days, label: "Days" },
                { val: countdownParts.hours, label: "Hrs" },
                { val: countdownParts.mins, label: "Min" },
                { val: countdownParts.secs, label: "Sec" },
              ].map((p) => (
                <div key={p.label} className="text-center">
                  <div className={`${dm ? "bg-white/10" : "bg-white/80"} rounded-xl px-3 py-2 min-w-[52px]`}>
                    <p className={`text-2xl font-mono font-bold ${dm ? "text-purple-300" : "text-purple-600"} tabular-nums`}>{String(p.val).padStart(2, "0")}</p>
                  </div>
                  <p className={`${textMuted} text-[10px] mt-1`}>{p.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}
      {countdownEnabled && !countdownParts && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassCard className={`${dm ? "!bg-gradient-to-r from-green-900/30 to-emerald-900/30 !border-green-700/40" : "!bg-gradient-to-r from-green-50/80 to-emerald-50/80 !border-green-200/40"} text-center`}>
            <p className={`${dm ? "text-green-400" : "text-green-600"} font-bold text-lg`}>🎉 Session is starting!</p>
          </GlassCard>
        </motion.div>
      )}

      {/* Recorded Session Preference Notice */}
      {prefersRecorded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className={`${dm ? "!bg-blue-900/20 !border-blue-700/30" : "!bg-blue-50/80 !border-blue-200/40"}`}>
            <div className="flex items-start gap-3">
              <MonitorPlay className={`w-5 h-5 ${dm ? "text-blue-400" : "text-blue-500"} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`${dm ? "text-blue-400" : "text-blue-600"} font-bold text-sm`}>Preferred: Recorded Session</p>
                <p className={`${textSecondary} text-xs mt-1`}>
                  Your attendance is marked as "Recorded Session". You will get access to recording sessions after the workshop ends.
                </p>
                {/* Request for live session */}
                {!liveRequest && (
                  <Button size="sm" variant="outline" onClick={requestLiveSession}
                    className={`mt-2 text-xs ${dm ? "border-blue-700/30 text-blue-400" : "border-blue-200 text-blue-500"} font-bold rounded-lg`}>
                    Request for Live Session
                  </Button>
                )}
                {liveRequest?.status === "pending" && (
                  <Badge className="mt-2 bg-amber-100 text-amber-600 border-amber-200 text-xs font-bold">⏳ Live Session Request Pending</Badge>
                )}
                {liveRequest?.status === "allowed" && (
                  <Badge className="mt-2 bg-green-100 text-green-600 border-green-200 text-xs font-bold">✅ Live Session Access Granted</Badge>
                )}
                {liveRequest?.status === "denied" && (
                  <div className="mt-2">
                    <Badge className="bg-red-100 text-red-500 border-red-200 text-xs font-bold">❌ Live Session Request Denied</Badge>
                    {liveRequest.admin_note && <p className={`${textMuted} text-xs mt-1`}>Reason: {liveRequest.admin_note}</p>}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div
          className="relative overflow-hidden rounded-3xl p-6 border border-white/80"
          style={
            dm
              ? { background: "linear-gradient(135deg, #241f33 0%, #1a1626 100%)" }
              : {
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eef2ff 100%)",
                  boxShadow:
                    "0 30px 60px -25px hsl(252 60% 40% / 0.18), 0 8px 24px -12px hsl(252 60% 40% / 0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
                }
          }
        >
          {/* ambient orbs */}
          {!dm && (
            <>
              <motion.div
                aria-hidden
                className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-50 pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(262 80% 75%), transparent 70%)" }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden
                className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(330 80% 78%), transparent 70%)" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
            </>
          )}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className={`${dm ? "text-purple-400" : "text-purple-600"} text-sm font-bold`}>
                {now.getHours() < 12 ? "Good Morning ☀️" : now.getHours() < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙"}
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <h2 className={`text-2xl ${textPrimary} mb-1`}>Hello, {user.name?.split(" ")[0]}! 👋</h2>
            <p className={`${textMuted} text-sm`}>Welcome to Creative Caricature Club™ Workshop {user.roll_number && `· Roll #${user.roll_number}`}</p>
            <div className="mt-4 flex flex-wrap gap-4">
              <div className={`flex items-center gap-2 ${textSecondary} text-sm`}>
                <Calendar className="w-4 h-4 text-purple-500" />
                {now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
              <div className={`flex items-center gap-2 ${textSecondary} text-sm`}>
                <Clock className="w-4 h-4 text-pink-500" />
                {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>
          </div>
        </div>
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

      {filteredSessions.length > 0 && settings.live_session_enabled?.enabled !== false && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <h3 className={`${textPrimary} text-sm uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <VideoIcon className="w-4 h-4 text-purple-500" /> Live Sessions
            </h3>
            <div className="space-y-3">
              {filteredSessions.map((session: any) => {
                const expired = isSessionExpired(session);
                const isLive = session.status === "live" && session.link_enabled && !expired;
                // Lock link for recorded session users unless they have an approved request
                const isLockedForRecorded = prefersRecorded && liveRequest?.status !== "allowed";
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
                        {isLockedForRecorded ? (
                          <div className={`${dm ? "bg-amber-900/20 border-amber-700/30" : "bg-amber-50/80 border-amber-200/30"} border rounded-xl p-3 text-center`}>
                            <MonitorPlay className={`w-6 h-6 ${dm ? "text-amber-400" : "text-amber-500"} mx-auto mb-1`} />
                            <p className={`${dm ? "text-amber-400" : "text-amber-600"} text-xs font-bold`}>As you wished for recorded session, you are not allowed to attend live lecture</p>
                            <p className={`${textMuted} text-[10px] mt-1`}>You can request live session access above</p>
                          </div>
                        ) : (
                          <>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button onClick={() => window.open(session.meet_link, "_blank")}
                                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-lg text-base">
                                <VideoIcon className="w-5 h-5 mr-2" /> JOIN LIVE SESSION
                              </Button>
                            </motion.div>
                            <p className="text-[10px] text-center text-amber-500 flex items-center justify-center gap-1 font-medium"><AlertTriangle className="w-3 h-3" />Only for workshop participants</p>
                          </>
                        )}
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
