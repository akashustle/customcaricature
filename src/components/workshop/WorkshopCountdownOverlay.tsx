import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const getLocalDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const playBellSound = () => {
  try {
    const ctx = new AudioContext();
    const freqs = [880, 1047, 1319, 1568];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.15;
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.42);
    });
    setTimeout(() => {
      try {
        const ctx2 = new AudioContext();
        [1319, 1568, 1760, 2093].forEach((f, i) => {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.type = "sine";
          osc.frequency.value = f;
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(ctx2.destination);
          const start = ctx2.currentTime + i * 0.12;
          gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
          osc.start(start);
          osc.stop(start + 0.62);
        });
      } catch {}
    }, 600);
  } catch {}
};

const WorkshopCountdownOverlay = ({ user }: { user: any }) => {
  const [prompt, setPrompt] = useState<any>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const playedRef = useRef(false);

  const fetchPrompt = async () => {
    const today = getLocalDate();
    const { data } = await supabase
      .from("workshop_countdown_prompts" as any)
      .select("*")
      .eq("is_active", true)
      .order("started_at", { ascending: false });

    const list = (data as any[]) || [];
    // Filter by date match or scheduled_at time, slot match, and not already done
    const now = Date.now();
    const match = list.find((p) => {
      if (doneIds.includes(p.id)) return false;
      // Check slot match
      if (p.slot !== "all" && p.slot !== user.slot) return false;
      // Check date
      if (p.session_date !== today) return false;
      // Check scheduled_at - if set and in future, skip
      if (p.scheduled_at) {
        const schedTime = new Date(p.scheduled_at).getTime();
        if (schedTime > now) return false;
      }
      return true;
    });
    setPrompt(match || null);
    playedRef.current = false;
  };

  useEffect(() => {
    fetchPrompt();
    const ch = supabase
      .channel("workshop-countdown-overlay")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_countdown_prompts" }, fetchPrompt)
      .subscribe();

    // Also poll every 5s to catch scheduled countdowns
    const poll = setInterval(fetchPrompt, 5000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [user?.id, user?.slot, doneIds.join(",")]);

  useEffect(() => {
    if (!prompt) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const startedAt = new Date(prompt.started_at).getTime();
      const endsAt = startedAt + Number(prompt.seconds || 0) * 1000;
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      setRemaining(left > 0 ? left : 0);
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [prompt]);

  useEffect(() => {
    if (!prompt || remaining === null || remaining > 0 || playedRef.current) return;
    playedRef.current = true;
    playBellSound();
    setDoneIds((prev) => [...prev, prompt.id]);
    setTimeout(() => setPrompt(null), 2500);
  }, [prompt, remaining]);

  const value = useMemo(() => {
    if (remaining === null) return null;
    return Math.max(0, remaining);
  }, [remaining]);

  if (!prompt || value === null) return null;

  const total = Number(prompt.seconds || 10);
  const progress = total > 0 ? ((total - value) / total) * 100 : 100;
  const isEnding = prompt.countdown_type === "session_end";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[220] flex items-center justify-center overflow-hidden"
        style={{
          background: isEnding
            ? "radial-gradient(ellipse at center, rgba(217,140,140,0.95) 0%, rgba(180,80,80,0.98) 100%)"
            : "radial-gradient(ellipse at center, rgba(26,22,37,0.95) 0%, rgba(10,8,20,0.98) 100%)",
        }}
      >
        {/* Animated rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2"
            style={{
              width: `${200 + i * 120}px`,
              height: `${200 + i * 120}px`,
              borderColor: isEnding ? "rgba(255,255,255,0.1)" : "rgba(176,141,87,0.15)",
            }}
            animate={{ scale: [1, 1.05, 1], rotate: [0, 360] }}
            transition={{ duration: 8 + i * 4, repeat: Infinity, ease: "linear" }}
          />
        ))}

        {/* Progress ring */}
        <svg className="absolute w-64 h-64 md:w-80 md:h-80" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke={isEnding ? "rgba(255,255,255,0.1)" : "rgba(176,141,87,0.15)"} strokeWidth="4" />
          <motion.circle
            cx="100" cy="100" r="90" fill="none"
            stroke={isEnding ? "#fff" : "#b08d57"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={565}
            strokeDashoffset={565 - (progress / 100) * 565}
            transform="rotate(-90 100 100)"
            transition={{ duration: 0.3 }}
          />
        </svg>

        <div className="text-center px-6 relative z-10">
          {/* Countdown type badge */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-4"
          >
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
              isEnding ? "bg-white/20 text-white" : "bg-[#b08d57]/20 text-[#c9a96e]"
            }`}>
              {isEnding ? "🔔 Session Ending" : "⏱️ Session Starting"}
            </span>
          </motion.div>

          {/* Main number */}
          <motion.p
            key={value}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`text-[120px] md:text-[180px] leading-none font-black tabular-nums ${
              isEnding ? "text-white" : "text-transparent bg-clip-text bg-gradient-to-b from-[#c9a96e] to-[#b08d57]"
            }`}
            style={{ textShadow: isEnding ? "0 0 60px rgba(255,255,255,0.3)" : "0 0 60px rgba(176,141,87,0.3)" }}
          >
            {value}
          </motion.p>

          {prompt.details && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm mt-3 font-medium ${isEnding ? "text-white/70" : "text-white/50"}`}
            >
              {prompt.details}
            </motion.p>
          )}

          {remaining === 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mt-6"
            >
              <p className={`text-3xl font-black ${isEnding ? "text-white" : "text-[#c9a96e]"}`}>
                🔔 {isEnding ? "Session Over!" : "Time's Up!"}
              </p>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="mt-2 text-4xl"
              >
                🎉
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Floating particles */}
        {value > 0 && [...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${isEnding ? "bg-white/20" : "bg-[#b08d57]/20"}`}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.sin(i) * 50, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
            style={{ left: `${10 + i * 12}%`, bottom: "10%" }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkshopCountdownOverlay;
