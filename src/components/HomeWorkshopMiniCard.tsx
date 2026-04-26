/**
 * HomeWorkshopMiniCard — slim "My Workshop" summary for the booking
 * dashboard Home tab. Shows the user's upcoming (or last) workshop date
 * with a one-tap "Open Workshop" CTA. Hides itself silently if the
 * user has no linked workshop record. Matches the booking Home tab's
 * white 3D card aesthetic (uses semantic tokens only — no hardcoded
 * colors so it stays correct in light + dark mode).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  authUserId: string;
  onOpenWorkshopTab?: () => void;
};

const HomeWorkshopMiniCard = ({ authUserId, onOpenWorkshopTab }: Props) => {
  const navigate = useNavigate();
  const [ws, setWs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 1) Direct match by auth_user_id
      let row: any = null;
      const { data: direct } = await supabase
        .from("workshop_users" as any)
        .select("*")
        .eq("auth_user_id", authUserId)
        .order("workshop_date", { ascending: false })
        .limit(1);
      row = (direct as any)?.[0] || null;

      // 2) Fallback by email/mobile (unlinked legacy records)
      if (!row) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("email, mobile")
          .eq("user_id", authUserId)
          .maybeSingle();
        const email = (prof?.email || "").toLowerCase().trim();
        const mobile = (prof?.mobile || "").replace(/\D/g, "");
        if (email) {
          const { data } = await supabase
            .from("workshop_users" as any)
            .select("*")
            .ilike("email", email)
            .limit(1);
          row = (data as any)?.[0] || null;
        }
        if (!row && mobile) {
          const { data } = await supabase
            .from("workshop_users" as any)
            .select("*")
            .eq("mobile", mobile)
            .limit(1);
          row = (data as any)?.[0] || null;
        }
      }

      if (!cancelled) {
        setWs(row);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  if (loading || !ws) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wsDate = ws.workshop_date ? new Date(ws.workshop_date + "T00:00:00") : null;
  const isUpcoming = wsDate && wsDate.getTime() >= today.getTime();
  const dateLabel = wsDate
    ? wsDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Date TBD";
  const slotLabel =
    ws.slot === "12pm-3pm" ? "12 PM – 3 PM" :
    ws.slot === "6pm-9pm" ? "6 PM – 9 PM" :
    ws.slot || "";

  const open = () => {
    if (onOpenWorkshopTab) {
      onOpenWorkshopTab();
    } else {
      try { localStorage.setItem("workshop_user", JSON.stringify(ws)); } catch {}
      navigate("/workshop-dashboard");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/40 p-4 sm:p-5 shadow-[0_14px_36px_-18px_hsl(var(--primary)/0.32),0_3px_10px_-4px_rgba(0,0,0,0.06)]"
    >
      {/* Soft ambient orb */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-md flex-shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] font-sans font-bold text-primary">
              My Workshop
            </span>
            <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-[1px] rounded-full ${
              isUpcoming ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {isUpcoming ? "Upcoming" : "Past"}
            </span>
          </div>
          <p className="font-display text-sm sm:text-base font-bold text-foreground leading-tight truncate mt-0.5">
            {ws.name || "Workshop Student"}
          </p>
          <p className="flex items-center gap-1 text-[11px] sm:text-xs font-sans text-muted-foreground mt-0.5 truncate">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{dateLabel}{slotLabel ? ` · ${slotLabel}` : ""}</span>
          </p>
        </div>
      </div>

      <Button
        onClick={open}
        size="sm"
        className="relative mt-3 w-full rounded-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        Open Workshop <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </Button>
    </motion.div>
  );
};

export default HomeWorkshopMiniCard;
