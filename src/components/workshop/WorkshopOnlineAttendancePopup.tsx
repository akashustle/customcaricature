import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const ALLOWED_ATTENDANCE_DATES = ["2026-03-14", "2026-03-15"];

const WorkshopOnlineAttendancePopup = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const [prompt, setPrompt] = useState<any>(null);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);

  const checkPrompt = useCallback(async () => {
    if (!user?.id) return;

    const { data: attendanceSetting } = await supabase
      .from("workshop_settings" as any)
      .select("value")
      .eq("id", "online_attendance_enabled")
      .maybeSingle();

    if (attendanceSetting?.value?.enabled === false) {
      setPrompt(null);
      setMarked(false);
      return;
    }

    const { data } = await supabase
      .from("workshop_online_attendance_prompts" as any)
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (!data || (data as any[]).length === 0) {
      setPrompt(null);
      return;
    }

    const eligiblePrompts = (data as any[]).filter((p: any) => {
      if (!ALLOWED_ATTENDANCE_DATES.includes(p.session_date)) return false;
      if (p.target_user_id && p.target_user_id !== user.id) return false;
      if (p.slot && p.slot !== "all" && user.slot && p.slot !== user.slot) return false;
      return true;
    });

    if (!eligiblePrompts.length) {
      setPrompt(null);
      return;
    }

    const latestPrompt = eligiblePrompts[0];

    const { data: existing } = await supabase
      .from("workshop_attendance" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("session_date", latestPrompt.session_date)
      .eq("status", "present")
      .limit(1);

    if (existing && (existing as any[]).length > 0) {
      setMarked(true);
      setPrompt(null);
      return;
    }

    setMarked(false);
    setPrompt(latestPrompt);
  }, [user?.id, user?.slot]);

  useEffect(() => {
    if (!user?.id) return;
    checkPrompt();

    const ch = supabase
      .channel("online-attendance-prompt-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_online_attendance_prompts" }, () => checkPrompt())
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_attendance" }, () => checkPrompt())
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings", filter: "id=eq.online_attendance_enabled" }, () => checkPrompt())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, checkPrompt]);

  const handleMarkPresent = async () => {
    if (!prompt || marking) return;
    setMarking(true);

    try {
      const { data, error } = await supabase.functions.invoke("mark-workshop-attendance", {
        body: {
          user_id: user.id,
          session_date: prompt.session_date,
        },
      });

      if (error || !data?.success) {
        toast({
          title: "Unable to mark attendance",
          description: data?.error || error?.message || "Please try again.",
          variant: "destructive",
        });
        setMarking(false);
        return;
      }

      toast({
        title: "✅ Attendance Marked!",
        description: "You have been marked present for this session.",
      });

      setMarked(true);
      setPrompt(null);
    } catch (err: any) {
      toast({
        title: "Unable to mark attendance",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setMarking(false);
    }
  };

  if (!prompt || marked) return null;

  const dm = darkMode;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border ${dm ? "bg-card text-foreground border-border" : "bg-card text-foreground border-border"}`}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
          >
            <Clock className="w-8 h-8 text-primary" />
          </motion.div>

          <h2 className="text-xl font-bold mb-2">📋 Mark Your Attendance</h2>
          <p className="text-sm mb-1 text-muted-foreground">
            Session: <span className="font-semibold text-foreground">{prompt.timing || prompt.slot}</span>
          </p>
          <p className="text-xs mb-6 text-muted-foreground">
            {new Date(prompt.session_date + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          <Button
            onClick={handleMarkPresent}
            disabled={marking}
            className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 text-base hover:bg-primary/90"
          >
            {marking ? "Marking..." : "✅ Mark Present"}
          </Button>

          <p className="text-[10px] mt-3 text-muted-foreground">
            This popup will close only after your attendance is marked.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkshopOnlineAttendancePopup;
