import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const WorkshopOnlineAttendancePopup = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const [prompt, setPrompt] = useState<any>(null);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    checkPrompt();
    const ch = supabase.channel("online-attendance-prompt")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_online_attendance_prompts" }, checkPrompt)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const checkPrompt = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("workshop_online_attendance_prompts" as any)
      .select("*")
      .eq("is_active", true)
      .eq("session_date", today);
    
    if (!data || (data as any[]).length === 0) { setPrompt(null); return; }

    // Check if user's slot matches
    const matching = (data as any[]).find((p: any) => {
      if (p.slot && user.slot && p.slot !== user.slot) return false;
      return true;
    });

    if (!matching) { setPrompt(null); return; }

    // Check if already marked
    const { data: existing } = await supabase
      .from("workshop_attendance" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("session_date", today)
      .eq("status", "present");
    
    if (existing && (existing as any[]).length > 0) {
      setMarked(true);
      setPrompt(null);
      return;
    }

    setPrompt(matching);
  };

  const handleMarkPresent = async () => {
    if (!prompt || marking) return;
    setMarking(true);
    const today = new Date().toISOString().split("T")[0];
    
    // Upsert attendance
    const { error } = await supabase.from("workshop_attendance" as any).upsert({
      user_id: user.id,
      session_date: today,
      status: "present",
      marked_by: null,
    } as any, { onConflict: "user_id,session_date" });

    if (error) {
      // Try insert if upsert fails
      await supabase.from("workshop_attendance" as any).insert({
        user_id: user.id,
        session_date: today,
        status: "present",
      } as any);
    }

    toast({ title: "✅ Attendance Marked!", description: "You have been marked present for today's session." });
    setMarked(true);
    setPrompt(null);
    setMarking(false);
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
          className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center ${dm ? "bg-[#241f33] text-white" : "bg-white text-foreground"}`}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
          >
            <Clock className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-xl font-bold mb-2">📋 Mark Your Attendance</h2>
          <p className={`text-sm mb-1 ${dm ? "text-white/70" : "text-muted-foreground"}`}>
            Today's Session: <span className="font-semibold">{prompt.timing || prompt.slot}</span>
          </p>
          <p className={`text-xs mb-6 ${dm ? "text-white/50" : "text-muted-foreground"}`}>
            {new Date(prompt.session_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <Button
            onClick={handleMarkPresent}
            disabled={marking}
            className="w-full rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold py-3 text-base"
          >
            {marking ? "Marking..." : "✅ Mark Present"}
          </Button>
          <p className={`text-[10px] mt-3 ${dm ? "text-white/40" : "text-muted-foreground"}`}>
            This popup will close once you mark your attendance
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkshopOnlineAttendancePopup;
