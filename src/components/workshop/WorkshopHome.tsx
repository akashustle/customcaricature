import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, Video as VideoIcon, ExternalLink, AlertTriangle, Instagram, Youtube, Facebook, Phone, MessageCircle, MonitorPlay, Maximize, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cachedFetch, peekCache } from "@/lib/request-cache";
import { perfMark } from "@/lib/perf-logger";
const WorkshopHome = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [now, setNow] = useState(new Date());
  // Hydrate immediately from in-memory cache so tab switches never show shimmer
  const [attendance, setAttendance] = useState<any[]>(() => peekCache<any[]>(`ws:att:${user.id}`) || []);
  const [liveSessions, setLiveSessions] = useState<any[]>(() => peekCache<any[]>(`ws:live`) || []);
  const [settings, setSettings] = useState<any>(() => peekCache<any>(`ws:settings`) || {});
  const [liveRequests, setLiveRequests] = useState<any[]>(() => peekCache<any[]>(`ws:liveReq:${user.id}`) || []);
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
  const fetchAttendance = async () => {
    const stop = perfMark("workshop:fetchAttendance");
    const data = await cachedFetch(`ws:att:${user.id}`, async () => {
      const { data } = await supabase.from("workshop_attendance" as any).select("*").eq("user_id", user.id);
      return (data as any[]) || [];
    });
    stop();
    if (data) setAttendance(data);
  };
  const fetchLiveSessions = async () => {
    const stop = perfMark("workshop:fetchLiveSessions");
    const data = await cachedFetch(`ws:live`, async () => {
      const { data } = await supabase.from("workshop_live_sessions" as any).select("*").order("session_date").order("slot");
      return (data as any[]) || [];
    });
    stop();
    if (data) setLiveSessions(data);
  };
  const fetchSettings = async () => {
    const stop = perfMark("workshop:fetchSettings");
    const map = await cachedFetch(`ws:settings`, async () => {
      const { data } = await supabase.from("workshop_settings" as any).select("*");
      const m: any = {}; ((data as any[]) || []).forEach((s: any) => { m[s.id] = s.value; });
      return m;
    });
    stop();
    if (map) setSettings(map);
  };
  const fetchLiveRequests = async () => {
    const stop = perfMark("workshop:fetchLiveRequests");
    const data = await cachedFetch(`ws:liveReq:${user.id}`, async () => {
      const { data } = await supabase.from("workshop_live_session_requests" as any).select("*").eq("user_id", user.id);
      return (data as any[]) || [];
    });
    stop();
    if (data) setLiveRequests(data);
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

      {/* HERO — booking-dashboard parity: brand primary/accent, "My Activity"
          chip, big number, two stat tiles. Uses HSL semantic tokens only. */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="relative" style={{ perspective: 1200 }}>
          <div className="absolute inset-x-3 -bottom-2 top-3 rounded-3xl bg-primary/10 blur-2xl pointer-events-none" />
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-secondary/40 border border-border/50 p-5 sm:p-6 shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.28),0_4px_12px_-4px_rgba(0,0,0,0.08)]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.div aria-hidden animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.6, 0.4] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
            <motion.div aria-hidden animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -bottom-20 -left-14 w-60 h-60 rounded-full bg-accent/25 blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary font-bold">My Workshop</p>
                  </div>
                  <p className="mt-3 font-sans text-sm text-muted-foreground">
                    {now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening"}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
                  </p>
                </div>
                {user.is_verified && (
                  <div className="flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-300/40 px-2 py-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-sans font-bold text-blue-700">Verified</span>
                  </div>
                )}
              </div>

              <h2 className={`mt-4 font-display text-2xl sm:text-3xl font-bold tracking-tight ${textPrimary}`}>
                Welcome to your workshop ✨
              </h2>
              <p className={`text-xs mt-1 ${textMuted}`}>
                {user.roll_number && `Roll #${user.roll_number} · `}{slotLabel}
              </p>

              {/* Stat tiles — booking style */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {[
                  { label: "Sessions", value: filteredSessions.length, Icon: VideoIcon, tint: "from-violet-500/15 to-violet-500/5", iconBg: "bg-violet-500/15 text-violet-600" },
                  { label: "Attended", value: attendance.filter((a: any) => a.status === "present" || a.status === "video_session").length, Icon: CheckCircle, tint: "from-emerald-500/15 to-emerald-500/5", iconBg: "bg-emerald-500/15 text-emerald-600" },
                ].map((s) => (
                  <div key={s.label} className={`relative rounded-2xl bg-gradient-to-br ${s.tint} border border-border/40 p-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur`}>
                    <div className={`w-8 h-8 rounded-xl ${s.iconBg} flex items-center justify-center mb-2`}>
                      <s.Icon className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-bold">{s.label}</p>
                    <p className={`font-display text-2xl font-bold leading-tight ${textPrimary}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className={`mt-5 flex flex-wrap items-center gap-3 text-xs ${textSecondary}`}>
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" />{now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" />{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* WORKSHOP DETAILS — matches hero "My Workshop" 3D style */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="relative" style={{ perspective: 1200 }}>
          <div className="absolute inset-x-3 -bottom-2 top-3 rounded-3xl bg-primary/10 blur-2xl pointer-events-none" />
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-secondary/40 border border-border/50 p-5 sm:p-6 shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.28),0_4px_12px_-4px_rgba(0,0,0,0.08)]">
            <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 mb-3">
                <Calendar className="w-3 h-3 text-primary" />
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary font-bold">Workshop Details</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative rounded-2xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-border/40 p-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center mb-2">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-bold">Dates</p>
                  <p className="font-display text-sm font-bold leading-tight text-foreground">14 & 15 Mar 2026</p>
                </div>
                <div className="relative rounded-2xl bg-gradient-to-br from-pink-500/15 to-pink-500/5 border border-border/40 p-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-600 flex items-center justify-center mb-2">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-bold">Your Slot</p>
                  <p className="font-display text-sm font-bold leading-tight text-foreground">{slotLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ATTENDANCE — matches hero "My Workshop" 3D style */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="relative" style={{ perspective: 1200 }}>
          <div className="absolute inset-x-3 -bottom-2 top-3 rounded-3xl bg-accent/10 blur-2xl pointer-events-none" />
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-secondary/40 border border-border/50 p-5 sm:p-6 shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.28),0_4px_12px_-4px_rgba(0,0,0,0.08)]">
            <div className="absolute -top-12 -left-10 w-44 h-44 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 mb-3">
                <CheckCircle className="w-3 h-3 text-primary" />
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary font-bold">Attendance</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {["2026-03-14", "2026-03-15"].map((date, i) => {
                  const status = getAttendance(date);
                  const tint =
                    status === "present" ? "from-emerald-500/15 to-emerald-500/5" :
                    status === "absent" ? "from-red-500/15 to-red-500/5" :
                    status === "video_session" ? "from-blue-500/15 to-blue-500/5" :
                    "from-muted to-muted/40";
                  return (
                    <div
                      key={date}
                      className={`relative rounded-2xl bg-gradient-to-br ${tint} border border-border/40 p-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur text-center`}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-bold">Day {i + 1}</p>
                      <p className="font-display text-sm font-bold leading-tight text-foreground mt-0.5">
                        {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </p>
                      <div className="mt-2 flex justify-center">{statusBadge(status)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
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

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        style={{ contentVisibility: "auto", containIntrinsicSize: "320px", willChange: "auto" } as any}
      >
        {/* Lighter wrapper than GlassCard — removes heavy box-shadow + gradient
            that caused scroll lag in the support section per user report. */}
        <div className={`relative rounded-3xl p-5 border ${dm ? "border-white/10 bg-card" : "border-slate-200/70 bg-white"}`}>
          <div className="flex items-center justify-between mb-4 gap-2 min-w-0">
            <div className="min-w-0">
              <h3 className={`${textPrimary} text-sm uppercase tracking-wider truncate`}>Support & Connect</h3>
              <p className={`${textSecondary} text-[11px] mt-0.5 truncate`}>We're here, anytime you need us</p>
            </div>
            <a
              href={`tel:+91${whatsappNum}`}
              className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              aria-label="Call support"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>

          <a
            href={`https://wa.me/91${whatsappNum}?text=${encodeURIComponent(`Hi Creative Caricature Club! 🎨\n\nI'm ${user.full_name || "a workshop student"} from the ${slotLabel} batch. I have a question about my workshop — could you please help me?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl p-3.5 mb-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-[0_8px_22px_-12px_rgba(16,185,129,0.5)] min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Chat on WhatsApp</p>
              <p className="text-[11px] text-white/85 truncate">Fastest reply · usually under 5 min</p>
            </div>
            <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-80" />
          </a>

          <div className="grid grid-cols-3 gap-2">
            {[
              { href: "https://www.instagram.com/creativecaricatureclub", Icon: Instagram, label: "Instagram", grad: "from-pink-500 to-rose-500" },
              { href: "https://www.facebook.com/creativecaricatureclub", Icon: Facebook, label: "Facebook", grad: "from-blue-500 to-indigo-500" },
              { href: "https://www.youtube.com/@creativecaricatureclub", Icon: Youtube, label: "YouTube", grad: "from-red-500 to-orange-500" },
            ].map(({ href, Icon, label, grad }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-col items-center gap-1.5 rounded-2xl p-3 border ${dm ? "border-white/10 bg-white/5" : "border-slate-200/70 bg-white/70"} min-w-0`}
              >
                <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className={`text-[10.5px] font-bold ${textPrimary} truncate w-full text-center`}>{label}</span>
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkshopHome;
