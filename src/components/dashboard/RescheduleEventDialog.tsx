import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Clock, X, CalendarDays, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MonthYearDatePicker from "@/components/ui/month-year-date-picker";

interface Props {
  open: boolean;
  onClose: () => void;
  event: any;
  userId: string;
  onSubmitted?: () => void;
}

const TIME_SLOTS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const addHours = (start: string, hours: number) => {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
};

const RescheduleEventDialog = ({ open, onClose, event, userId, onSubmitted }: Props) => {
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newStart, setNewStart] = useState("");
  const [hours, setHours] = useState(2);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!newDate || !newStart) {
      toast({ title: "Pick new date & time", variant: "destructive" });
      return;
    }
    // Past-time block
    const [sh, sm] = newStart.split(":").map(Number);
    const candidate = new Date(newDate);
    candidate.setHours(sh, sm, 0, 0);
    if (candidate.getTime() <= Date.now()) {
      toast({ title: "Pick a future date/time", description: "The new slot must be in the future.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const newEnd = addHours(newStart, hours);
      const { error } = await supabase.from("event_reschedule_requests" as any).insert({
        event_id: event.id,
        user_id: userId,
        requested_date: format(newDate, "yyyy-MM-dd"),
        requested_start_time: newStart,
        requested_end_time: newEnd,
        reason: reason || null,
        status: "pending",
      } as any);
      if (error) throw error;
      toast({ title: "Request sent! 📩", description: "Our team will review it and get back to you shortly." });
      onSubmitted?.();
      onClose();
      setNewDate(undefined); setNewStart(""); setReason(""); setHours(2);
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-foreground/45 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            className="fixed inset-x-2 bottom-2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[81] w-auto md:w-[520px] max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl"
          >
            <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold leading-none">Request Reschedule</h3>
                  <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
                    Change date/time for "{event?.event_type}"
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl bg-muted/40 p-3 text-xs font-sans">
                <p className="text-muted-foreground">Current schedule</p>
                <p className="font-semibold mt-0.5">
                  {event?.event_date && new Date(event.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {event?.event_start_time} – {event?.event_end_time}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-sans text-muted-foreground">New event date *</Label>
                  <div className="mt-1">
                    <MonthYearDatePicker value={newDate} onChange={setNewDate} placeholder="Pick a date" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-sans text-muted-foreground">New start time *</Label>
                  <div className="relative mt-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm font-sans text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>Select</option>
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-sans text-muted-foreground">Duration *</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[1, 2, 3, 4].map((h) => (
                    <button key={h} type="button" onClick={() => setHours(h)}
                      className={`h-11 rounded-xl border text-sm font-sans font-semibold transition-all ${
                        hours === h ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/50"
                      }`}>
                      {h} hr
                    </button>
                  ))}
                </div>
                {newStart && (
                  <p className="mt-1.5 text-[11px] font-sans text-muted-foreground">
                    Ends around <span className="font-semibold text-foreground">{addHours(newStart, hours)}</span>
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs font-sans text-muted-foreground">Reason (optional)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Let us know why you'd like to reschedule…"
                  className="rounded-xl mt-1 min-h-[72px] text-sm" />
              </div>

              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-sans text-amber-700 dark:text-amber-300 leading-relaxed">
                  Your request will be reviewed by our team. The current event stays scheduled until we approve the change.
                </p>
              </div>

              <Button onClick={submit} disabled={submitting} className="w-full h-12 rounded-2xl font-sans font-semibold text-base">
                {submitting ? "Sending…" : <><Send className="w-4 h-4 mr-2" /> Send Request</>}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RescheduleEventDialog;
