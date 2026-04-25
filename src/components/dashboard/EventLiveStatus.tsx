import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, PartyPopper, Sparkles, CheckCircle2, Music2, Heart } from "lucide-react";

interface EventLikeRecord {
  event_date: string;          // 'YYYY-MM-DD'
  event_start_time: string;    // 'HH:MM' (24h)
  event_end_time: string;      // 'HH:MM' (24h)
  status?: string;
}

type Phase = "future" | "today_before" | "starting_soon" | "live" | "just_ended" | "past";

const buildEventDates = (ev: EventLikeRecord) => {
  const [y, m, d] = ev.event_date.split("-").map(Number);
  const [sh, sm] = (ev.event_start_time || "00:00").split(":").map(Number);
  const [eh, em] = (ev.event_end_time || ev.event_start_time || "00:00").split(":").map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, sh || 0, sm || 0, 0, 0);
  let end = new Date(y, (m || 1) - 1, d || 1, eh || 0, em || 0, 0, 0);
  // If end time is before start (e.g. crosses midnight), push to next day
  if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const computePhase = (ev: EventLikeRecord, nowMs: number): { phase: Phase; start: Date; end: Date; deltaMs: number } => {
  const { start, end } = buildEventDates(ev);
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (nowMs >= startMs && nowMs < endMs) return { phase: "live", start, end, deltaMs: endMs - nowMs };
  // Within 60 minutes of start → "starting soon"
  if (nowMs < startMs && startMs - nowMs <= 60 * 60 * 1000) {
    return { phase: "starting_soon", start, end, deltaMs: startMs - nowMs };
  }
  // Just ended within last 6 hours → "just ended"
  if (nowMs >= endMs && nowMs - endMs <= 6 * 60 * 60 * 1000) {
    return { phase: "just_ended", start, end, deltaMs: nowMs - endMs };
  }
  // Same calendar day, before the 1-hour window
  const today = new Date(nowMs);
  const sameDay = today.getFullYear() === start.getFullYear()
    && today.getMonth() === start.getMonth()
    && today.getDate() === start.getDate();
  if (sameDay && nowMs < startMs) return { phase: "today_before", start, end, deltaMs: startMs - nowMs };
  if (nowMs >= endMs) return { phase: "past", start, end, deltaMs: nowMs - endMs };
  return { phase: "future", start, end, deltaMs: startMs - nowMs };
};

const formatHMS = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
};

interface Props {
  event: EventLikeRecord;
  /** compact = single-line pill for list rows. card = full panel. */
  variant?: "card" | "compact";
}

const EventLiveStatus = ({ event, variant = "card" }: Props) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!event?.event_date || !event?.event_start_time) return null;

  const { phase, deltaMs, start, end } = computePhase(event, now);

  // Hide entirely for far-future and past events handled elsewhere
  if (phase === "future" || phase === "past") return null;

  const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (variant === "compact") {
    if (phase === "live") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 px-2 py-1 rounded-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live now · {formatHMS(deltaMs)} left
        </span>
      );
    }
    if (phase === "starting_soon") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold text-amber-700 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          Starting in {formatHMS(deltaMs)}
        </span>
      );
    }
    if (phase === "just_ended") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Event just completed
        </span>
      );
    }
    if (phase === "today_before") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
          <Sparkles className="w-3 h-3" />
          Today at {fmtTime(start)}
        </span>
      );
    }
    return null;
  }

  // Card variant
  if (phase === "live") {
    // Continuous celebratory animation — "guests enjoying" until the event ends.
    const partyEmojis = ["🎉", "🎊", "✨", "🥳", "🎨", "💫"];
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-3.5 border-2 border-emerald-300/70 bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-emerald-500/10 shadow-[0_8px_24px_-12px_hsl(142_70%_45%/0.4)]"
      >
        {/* Floating emojis drifting up (continuous) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {partyEmojis.map((e, i) => (
            <motion.span
              key={i}
              className="absolute text-base opacity-60"
              style={{ left: `${10 + i * 14}%`, bottom: -10 }}
              animate={{
                y: [-4, -52, -4],
                opacity: [0, 0.7, 0],
                rotate: [0, 12, -8, 0],
              }}
              transition={{
                duration: 3.6 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            >
              {e}
            </motion.span>
          ))}
        </div>

        <div className="relative flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="font-display text-sm font-bold text-emerald-800 dark:text-emerald-200">
            Your event is live — guests are enjoying every moment! 🎨
          </p>
        </div>

        {/* Continuous shimmer line under headline */}
        <motion.div
          className="relative mt-2 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative flex flex-wrap items-center gap-2 mt-2">
          <motion.span
            className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-900 dark:text-emerald-100 bg-white/80 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Music2 className="w-3 h-3" /> Vibes flowing
          </motion.span>
          <motion.span
            className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-pink-700 dark:text-pink-200 bg-white/80 dark:bg-pink-500/10 px-2 py-0.5 rounded-full"
            animate={{ scale: [1.04, 1, 1.04] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart className="w-3 h-3 fill-current" /> Smiles all around
          </motion.span>
        </div>

        <p className="relative text-[11px] font-sans text-emerald-800/80 dark:text-emerald-200/80 mt-2">
          Started {fmtTime(start)} · Ends {fmtTime(end)}
        </p>
        <div className="relative mt-2 inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-emerald-900 dark:text-emerald-100 bg-white/80 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5" />
          Ends in <span className="tabular-nums">{formatHMS(deltaMs)}</span>
        </div>
      </motion.div>
    );
  }

  if (phase === "starting_soon") {
    return (
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10">
        <p className="font-display text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Get ready! Your event is starting soon
        </p>
        <p className="text-[11px] font-sans text-amber-800/80 dark:text-amber-200/80 mt-0.5">
          Begins at {fmtTime(start)} · in <span className="tabular-nums font-semibold">{formatHMS(deltaMs)}</span>
        </p>
      </motion.div>
    );
  }

  if (phase === "just_ended") {
    return (
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 border border-primary/30 bg-primary/5">
        <p className="font-display text-sm font-bold text-primary flex items-center gap-2">
          <PartyPopper className="w-4 h-4" /> What a lovely event — it just finished!
        </p>
        <p className="text-[11px] font-sans text-foreground/70 mt-0.5">
          Hope your guests had an amazing time. We'll mark it complete in a moment.
        </p>
      </motion.div>
    );
  }

  if (phase === "today_before") {
    return (
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 border border-primary/30 bg-primary/10 text-center">
        <p className="font-display text-base font-bold text-primary">🎊 Today is the Day!</p>
        <p className="text-[11px] font-sans text-foreground/70 mt-0.5">
          Starts at {fmtTime(start)} · in <span className="tabular-nums font-semibold">{formatHMS(deltaMs)}</span>
        </p>
      </motion.div>
    );
  }

  return null;
};

export default EventLiveStatus;
export { computePhase, buildEventDates };
