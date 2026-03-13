import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const getLocalDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
      .eq("session_date", today)
      .order("started_at", { ascending: false });

    const list = (data as any[]) || [];
    const match = list.find((p) => (p.slot === "all" || p.slot === user.slot) && !doneIds.includes(p.id));
    setPrompt(match || null);
    playedRef.current = false;
  };

  useEffect(() => {
    fetchPrompt();
    const ch = supabase
      .channel("workshop-countdown-overlay")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_countdown_prompts" }, fetchPrompt)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
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
    try {
      const ctx = new AudioContext();
      const freqs = [880, 1047, 1319];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = f;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const start = ctx.currentTime + i * 0.16;
        gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
        osc.start(start);
        osc.stop(start + 0.21);
      });
    } catch {}

    setDoneIds((prev) => [...prev, prompt.id]);
    setTimeout(() => setPrompt(null), 800);
  }, [prompt, remaining]);

  const value = useMemo(() => {
    if (remaining === null) return null;
    return String(Math.max(0, remaining));
  }, [remaining]);

  if (!prompt || value === null) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-background/95 backdrop-blur-md flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-[120px] md:text-[180px] leading-none font-bold text-primary tabular-nums">{value}</p>
        {prompt.details && <p className="text-sm text-muted-foreground mt-3">{prompt.details}</p>}
      </div>
    </div>
  );
};

export default WorkshopCountdownOverlay;
