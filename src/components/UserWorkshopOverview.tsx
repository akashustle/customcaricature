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

// Booking-dashboard parity: this overview lives inside the booking dashboard
// so it must share the same brand tokens, white 3D cards, and gradient orbs
// as the booking Home tab. No more hardcoded ivory/coral/gold palette — we
// only use HSL design tokens (primary, accent, foreground, muted-foreground).

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
      // 1) Try direct match by auth_user_id
      let wsUser: any = null;
      const { data: direct } = await supabase.from("workshop_users" as any).select("*")
        .eq("auth_user_id", authUserId).order("workshop_date", { ascending: false }).limit(1);
      wsUser = (direct as any)?.[0] || null;

      // 2) Fallback: match by profile email/mobile (handles users whose
      //    workshop record predates their booking account, e.g. Akash flow).
      if (!wsUser) {
        const { data: prof } = await supabase.from("profiles")
          .select("email, mobile, full_name").eq("user_id", authUserId).maybeSingle();
        const email = (prof?.email || "").toLowerCase().trim();
        const mobile = (prof?.mobile || "").replace(/\D/g, "");
        if (email) {
          const { data } = await supabase.from("workshop_users" as any).select("*").ilike("email", email).limit(1);
          wsUser = (data as any)?.[0] || null;
        }
        if (!wsUser && mobile) {
          const { data } = await supabase.from("workshop_users" as any).select("*").eq("mobile", mobile).limit(1);
          wsUser = (data as any)?.[0] || null;
        }
        if (wsUser) {
          // Silent link in the background so subsequent loads are instant.
          supabase.functions.invoke("link-workshop-account", {
            body: { auth_user_id: authUserId, email, mobile, full_name: prof?.full_name },
          }).catch(() => {});
        }
      }

      setWs(wsUser);

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
      {/* HERO — booking-dashboard parity. White 3D card with brand primary/accent
          gradient orbs, "My Workshop" chip, semantic foreground text. */}
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary font-bold">My Workshop</p>
                  </div>
                  <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight truncate">
                    {ws.name || "Welcome, Student!"}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {isUpcoming ? (
                      <Badge className="border-0 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1">Upcoming</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-1">Past</Badge>
                    )}
                    {ws.roll_number && (
                      <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-1 border-primary/30 text-primary">
                        Roll #{ws.roll_number}
                      </Badge>
                    )}
                    {ws.skill_level && (
                      <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-1 border-accent/40 text-accent-foreground bg-accent/10">
                        {ws.skill_level}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shadow-lg flex-shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              <Button onClick={goToWorkshopDash} className="mt-5 rounded-full font-bold w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                Open Workshop Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Upcoming/last workshop card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-3xl border border-border/50 p-5 bg-card shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.18)]">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-foreground">
          <Calendar className="w-4 h-4 text-primary" /> {isUpcoming ? "Your upcoming workshop" : "Your last workshop"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Cell label="Date" value={wsDate ? wsDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
          <Cell label="Slot" value={ws.slot === "12pm-3pm" ? "12 PM – 3 PM" : ws.slot === "6pm-9pm" ? "6 PM – 9 PM" : (ws.slot || "—")} />
          <Cell label="City" value={ws.city || "—"} />
        </div>
      </motion.div>

      {/* Quick stats — match booking home stat-tile look */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile icon={FileText} label="Assignments" value={counts.assignments} tint="from-violet-500/15 to-violet-500/5" iconBg="bg-violet-500/15 text-violet-600" />
        <StatTile icon={Award} label="Certificates" value={counts.certificates} tint="from-amber-500/15 to-amber-500/5" iconBg="bg-amber-500/15 text-amber-600" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink icon={Video} label="Workshop Videos" onClick={goToWorkshopDash} />
        <QuickLink icon={GraduationCap} label="Full Dashboard" onClick={goToWorkshopDash} />
      </div>
    </div>
  );
};

const Cell = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary/40 border border-border/50 p-3 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-bold mt-0.5 text-foreground">{value}</p>
  </div>
);

const StatTile = ({ icon: Icon, label, value, tint, iconBg }: any) => (
  <motion.div whileHover={{ y: -3, scale: 1.02 }}
    className={`relative rounded-2xl bg-gradient-to-br ${tint} border border-border/40 p-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur`}>
    <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center mb-2`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-bold">{label}</p>
    <p className="font-display text-2xl font-bold leading-tight text-foreground">{value}</p>
  </motion.div>
);

const QuickLink = ({ icon: Icon, label, onClick }: any) => (
  <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={onClick}
    className="rounded-2xl p-4 text-left border border-border/50 bg-card flex items-center justify-between shadow-[0_6px_16px_-8px_rgba(0,0,0,0.1)] hover:border-primary/40 hover:shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.25)] transition-all">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-bold text-sm truncate text-foreground">{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </motion.button>
);

export default UserWorkshopOverview;
