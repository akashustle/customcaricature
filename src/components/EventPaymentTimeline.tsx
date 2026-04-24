/**
 * EventPaymentTimeline — chronological audit log of an event's lifecycle:
 *   booking → advance paid → auto-completion → balance popup → claim submitted
 *   → admin approved/rejected → fully settled.
 *
 * Pulls from `event_bookings`, `payment_history`, and `event_payment_claims`.
 * Time-zone safe: every entry is rendered with the user's local tz.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, CheckCircle2, Clock, CreditCard, AlertCircle,
  Sparkles, Banknote, ShieldCheck, XCircle, FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/pricing";

type TimelineEntry = {
  ts: string; // ISO
  icon: React.ElementType;
  title: string;
  desc?: string;
  tone: "info" | "success" | "warn" | "error";
};

interface Props {
  event: any;
  userId: string;
}

const toneClass = {
  info:    "bg-primary/10 text-primary border-primary/30",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn:    "bg-amber-50 text-amber-800 border-amber-200",
  error:   "bg-red-50 text-red-700 border-red-200",
} as const;

const EventPaymentTimeline = ({ event, userId }: Props) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list: TimelineEntry[] = [];

    // 1. Booking created
    if (event.created_at) {
      list.push({
        ts: event.created_at,
        icon: Calendar,
        title: "Event booked",
        desc: `${event.event_type || "Event"} on ${event.event_date}`,
        tone: "info",
      });
    }

    // 2. Payment history (advance, partials, remaining)
    const { data: ph } = await supabase
      .from("payment_history")
      .select("amount, payment_type, status, description, created_at")
      .eq("booking_id", event.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    (ph || []).forEach((p: any) => {
      const isRemaining = /remaining/i.test(p.payment_type || "");
      const isAdvance = /advance|partial/i.test(p.payment_type || "");
      list.push({
        ts: p.created_at,
        icon: isRemaining ? ShieldCheck : isAdvance ? CreditCard : Sparkles,
        title: isRemaining
          ? `Remaining balance settled (${formatPrice(p.amount)})`
          : isAdvance
          ? `Advance payment received (${formatPrice(p.amount)})`
          : `Payment recorded (${formatPrice(p.amount)})`,
        desc: p.description || undefined,
        tone: "success",
      });
    });

    // 3. Auto-completion (event end time passed)
    try {
      const endIso = new Date(`${event.event_date}T${event.event_end_time || "23:59:59"}`).toISOString();
      const completed = event.status === "completed";
      if (completed && new Date(endIso).getTime() < Date.now()) {
        list.push({
          ts: event.updated_at || endIso,
          icon: CheckCircle2,
          title: "Event auto-completed",
          desc: "Status moved to completed once the scheduled end time passed.",
          tone: "info",
        });
      }
    } catch { /* date parse skip */ }

    // 4. Payment claims submitted by user + admin decision
    const { data: claims } = await supabase
      .from("event_payment_claims")
      .select("id, claim_type, amount, status, admin_reply, created_at, reviewed_at")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    (claims || []).forEach((c: any) => {
      list.push({
        ts: c.created_at,
        icon: c.claim_type === "cash" ? Banknote : FileText,
        title: `${c.claim_type === "cash" ? "Cash" : "Online"} payment claim submitted (${formatPrice(c.amount)})`,
        desc: "Awaiting admin verification (typically under 24h).",
        tone: "warn",
      });
      if (c.reviewed_at) {
        list.push({
          ts: c.reviewed_at,
          icon: c.status === "approved" ? CheckCircle2 : XCircle,
          title: c.status === "approved" ? "Admin approved your payment" : "Admin rejected your payment claim",
          desc: c.admin_reply || (c.status === "approved" ? "Event is fully settled." : "Please contact support."),
          tone: c.status === "approved" ? "success" : "error",
        });
      }
    });

    // Sort chronologically
    list.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    setEntries(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`event-timeline-${event.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_payment_claims", filter: `event_id=eq.${event.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history", filter: `booking_id=eq.${event.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, userId]);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h4 className="font-display text-sm font-bold text-foreground">Payment Timeline</h4>
      </div>
      <ol className="relative border-l-2 border-border/40 ml-2 space-y-3">
        {entries.map((e, i) => {
          const Icon = e.icon;
          return (
            <motion.li
              key={`${e.ts}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="ml-4 relative"
            >
              <span className={`absolute -left-[26px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${toneClass[e.tone]}`}>
                <Icon className="w-2.5 h-2.5" />
              </span>
              <div className={`rounded-xl border p-2.5 ${toneClass[e.tone]}`}>
                <p className="font-sans font-semibold text-xs">{e.title}</p>
                {e.desc && <p className="font-sans text-[11px] opacity-80 mt-0.5">{e.desc}</p>}
                <p className="font-sans text-[10px] opacity-60 mt-1">
                  {new Date(e.ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
};

export default EventPaymentTimeline;
