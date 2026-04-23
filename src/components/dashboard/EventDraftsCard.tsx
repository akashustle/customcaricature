import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trash2, ArrowRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Draft = {
  id: string;
  event_type: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  hours: number | null;
  state: string | null;
  district: string | null;
  city: string | null;
  venue_name: string | null;
  full_address: string | null;
  pincode: string | null;
  updated_at: string;
};

interface Props {
  userId: string;
  profile: any;
}

const EventDraftsCard = ({ userId, profile }: Props) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const navigate = useNavigate();

  const fetchDrafts = async () => {
    const { data } = await (supabase.from("event_drafts" as any).select("*") as any)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setDrafts((data as any) || []);
  };

  useEffect(() => {
    if (!userId) return;
    fetchDrafts();
    const ch = supabase
      .channel(`event-drafts-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_drafts", filter: `user_id=eq.${userId}` },
        () => fetchDrafts()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const continueDraft = (d: Draft) => {
    if (!d.event_type || !d.event_date || !d.start_time || !d.end_time || !d.state || !d.city || !d.venue_name || !d.full_address || !d.pincode) {
      toast({
        title: "Draft is incomplete",
        description: "Some required fields are missing — finish them, then book.",
        variant: "destructive",
      });
      return;
    }
    const params = new URLSearchParams({
      eventType: d.event_type,
      eventDate: d.event_date,
      startTime: d.start_time,
      endTime: d.end_time,
      state: d.state,
      district: d.district || "",
      city: d.city,
      venueName: d.venue_name,
      fullAddress: d.full_address,
      pincode: d.pincode,
      clientName: profile?.full_name || "",
      clientMobile: profile?.mobile || "",
      clientEmail: profile?.email || "",
      clientInstagram: profile?.instagram_id || "",
      draftId: d.id,
    });
    navigate(`/book-event?${params.toString()}`);
  };

  const removeDraft = async (id: string) => {
    if (!confirm("Discard this saved event draft?")) return;
    await (supabase.from("event_drafts" as any).delete() as any).eq("id", id);
    toast({ title: "Draft discarded" });
    fetchDrafts();
  };

  if (drafts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-bold text-amber-900">
            You have {drafts.length} saved event {drafts.length === 1 ? "draft" : "drafts"}
          </p>
          <p className="text-[11px] text-amber-800/80 font-sans">Finish booking to lock your dates & artists ✨</p>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {drafts.slice(0, 3).map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-amber-200/70"
            >
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-semibold text-foreground truncate">
                  {d.event_type || "Untitled event"}{" "}
                  {d.city && <span className="text-muted-foreground font-normal">· {d.city}</span>}
                </p>
                <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {d.event_date ? format(new Date(d.event_date), "d MMM yyyy") : "No date"}
                  {d.start_time ? ` · ${d.start_time}${d.end_time ? `–${d.end_time}` : ""}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => continueDraft(d)}
                className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-sans"
              >
                Book now <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
              <button
                onClick={() => removeDraft(d.id)}
                className="text-muted-foreground hover:text-destructive p-1 rounded"
                aria-label="Discard draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {drafts.length > 3 && (
          <p className="text-[10px] text-amber-800/70 font-sans text-center">
            +{drafts.length - 3} more saved {drafts.length - 3 === 1 ? "draft" : "drafts"}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default EventDraftsCard;
