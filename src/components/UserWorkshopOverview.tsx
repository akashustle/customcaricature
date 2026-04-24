/**
 * Workshop overview tab inside the User Dashboard.
 * Only renders for users whose auth account is linked to a workshop_user
 * (via workshop_users.auth_user_id). Shows quick stats, upcoming workshop,
 * and a deep-link to the dedicated workshop dashboard.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  GraduationCap, Calendar, Award, FileText, ChevronRight, ArrowRight, Loader2, Video,
} from "lucide-react";

const palette = {
  ivory: "hsl(38 60% 96%)",
  coral: "hsl(8 78% 70%)",
  gold: "hsl(36 78% 60%)",
  sage: "hsl(150 30% 65%)",
  sky: "hsl(200 70% 70%)",
  plum: "hsl(335 45% 55%)",
};

type Props = {
  authUserId: string;
};

const UserWorkshopOverview = ({ authUserId }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<any>(null);
  const [counts, setCounts] = useState({ assignments: 0, certificates: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const q: any = supabase.from("workshop_users" as any).select("*");
      const { data: wsUsers } = await q.eq("auth_user_id", authUserId).order("workshop_date", { ascending: false }).limit(1);
      const wsUser: any = (wsUsers as any)?.[0];
      setWs(wsUser || null);

      if (wsUser?.id) {
        const [{ count: aCount }, { count: cCount }] = await Promise.all([
          (supabase.from("workshop_assignments" as any).select("id", { count: "exact", head: true }) as any).eq("user_id", wsUser.id),
          (supabase.from("workshop_certificates" as any).select("id", { count: "exact", head: true }) as any).eq("user_id", wsUser.id),
        ]);
        setCounts({ assignments: aCount || 0, certificates: cCount || 0 });
      }
      setLoading(false);
    };
    load();
  }, [authUserId]);

  const goToWorkshopDash = () => {
    if (ws) {
      // Cache to LS so workshop dashboard hydrates instantly
      localStorage.setItem("workshop_user", JSON.stringify(ws));
    }
    navigate("/workshop-dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="rounded-3xl p-8 text-center border bg-card">
        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-bold text-foreground">No workshop account linked</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Once you join a CCC workshop, your sessions will appear here.
        </p>
      </div>
    );
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const wsDate = ws.workshop_date ? new Date(ws.workshop_date + "T00:00:00") : null;
  const isUpcoming = wsDate && wsDate.getTime() >= today.getTime();

  return (
    <div className="space-y-5">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] p-5 md:p-6 border-2 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.2)]"
        style={{
          background: `linear-gradient(135deg, ${palette.ivory} 0%, hsl(36 60% 92%) 50%, hsl(36 55% 88%) 100%)`,
          borderColor: palette.gold,
        }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-50 pointer-events-none"
          style={{ background: palette.gold }} />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: palette.coral }} />

        <div className="relative z-10 flex flex-col md:flex-row items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${palette.coral}, ${palette.gold})` }}>
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(20 40% 30%)" }}>
              CCC Workshop
            </p>
            <h2 className="font-display text-xl md:text-2xl font-bold leading-tight" style={{ color: "hsl(20 40% 22%)" }}>
              {ws.name || "Welcome, Student!"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isUpcoming ? (
                <Badge className="border-0 text-white text-[10px] font-bold px-2.5 py-1"
                  style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
                  Upcoming
                </Badge>
              ) : (
                <Badge className="border-0 text-white text-[10px] font-bold px-2.5 py-1"
                  style={{ background: `linear-gradient(135deg, ${palette.plum}, ${palette.coral})` }}>
                  Past
                </Badge>
              )}
              {ws.roll_number && (
                <Badge className="border-0 text-[10px] font-bold px-2.5 py-1"
                  style={{ background: `${palette.plum}25`, color: "hsl(335 45% 30%)" }}>
                  Roll #{ws.roll_number}
                </Badge>
              )}
              {ws.skill_level && (
                <Badge className="border-0 text-[10px] font-bold px-2.5 py-1"
                  style={{ background: `${palette.sage}25`, color: "hsl(150 35% 25%)" }}>
                  {ws.skill_level}
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={goToWorkshopDash} className="rounded-full font-bold text-white border-0 shadow-md"
            style={{ background: `linear-gradient(135deg, ${palette.coral}, ${palette.gold})` }}>
            Open Workshop <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </motion.div>

      {/* Upcoming/last workshop card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-[24px] border-2 p-5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]"
        style={{
          background: `linear-gradient(135deg, hsl(200 70% 96%), hsl(200 65% 91%))`,
          borderColor: palette.sky,
        }}>
        <h3 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: "hsl(220 40% 25%)" }}>
          <Calendar className="w-4 h-4" /> {isUpcoming ? "Your upcoming workshop" : "Your last workshop"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Cell label="Date" value={wsDate ? wsDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} color={palette.sky} />
          <Cell label="Slot" value={ws.slot === "12pm-3pm" ? "12 PM – 3 PM" : ws.slot === "6pm-9pm" ? "6 PM – 9 PM" : (ws.slot || "—")} color={palette.gold} />
          <Cell label="City" value={ws.city || "—"} color={palette.sage} />
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={FileText} label="Assignments" value={counts.assignments} color={palette.coral} />
        <StatCard icon={Award} label="Certificates" value={counts.certificates} color={palette.gold} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink icon={Video} label="Workshop Videos" onClick={goToWorkshopDash} color={palette.sky} />
        <QuickLink icon={GraduationCap} label="Full Workshop Dashboard" onClick={goToWorkshopDash} color={palette.plum} />
      </div>
    </div>
  );
};

const Cell = ({ label, value, color }: any) => (
  <div className="rounded-xl bg-card/70 border p-3 shadow-sm" style={{ borderColor: `${color}40` }}>
    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
    <p className="text-sm font-bold mt-0.5" style={{ color: "hsl(20 30% 20%)" }}>{value}</p>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <motion.div whileHover={{ y: -3, scale: 1.02 }}
    className="relative overflow-hidden rounded-2xl p-4 border-2 bg-card shadow-md"
    style={{ borderColor: `${color}55` }}>
    <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-40 pointer-events-none" style={{ background: color }} />
    <div className="relative z-10 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
        <p className="font-display text-xl font-bold leading-none mt-1" style={{ color: "hsl(20 30% 20%)" }}>{value}</p>
      </div>
    </div>
  </motion.div>
);

const QuickLink = ({ icon: Icon, label, onClick, color }: any) => (
  <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={onClick}
    className="rounded-2xl p-4 text-left border-2 bg-card flex items-center justify-between shadow-md"
    style={{ borderColor: `${color}55` }}>
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-bold text-sm truncate" style={{ color: "hsl(20 30% 20%)" }}>{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </motion.button>
);

export default UserWorkshopOverview;
