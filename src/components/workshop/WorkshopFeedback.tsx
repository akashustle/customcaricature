import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, ExternalLink, Star } from "lucide-react";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/50 border border-purple-100/30 rounded-2xl p-5 shadow-sm ${className}`}>
    {children}
  </div>
);

const WorkshopFeedback = ({ user }: { user: any }) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => { fetchFeedbacks(); fetchSettings(); }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase.from("workshop_feedback" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setFeedbacks(data as any[]);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((s: any) => { map[s.id] = s.value; });
      setSettings(map);
    }
  };

  const feedbackEnabled = settings.feedback_enabled?.enabled !== false;

  const handleSubmit = async () => {
    if (!message.trim() && !rating) return;
    setSubmitting(true);
    try {
      await supabase.from("workshop_feedback" as any).insert({
        user_id: user.id,
        message: message.trim(),
        rating: rating || null,
      } as any);
      toast({ title: "Thank you for your feedback! 💛" });
      setMessage("");
      setRating(0);
      fetchFeedbacks();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleReview = async () => {
    await supabase.from("workshop_feedback" as any).insert({
      user_id: user.id,
      message: "[Google Review Click]",
      google_review_clicked: true,
    } as any);
    window.open("https://g.page/r/creativecaricatureclub/review", "_blank");
  };

  if (!feedbackEnabled) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-purple-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Feedback is not available yet</p>
          <p className="text-gray-300 text-xs mt-1">Feedback will be enabled after workshop completion.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-purple-500" /> Feedback & Suggestions
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-xs mb-2">Rate the Workshop</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)}
                  onMouseEnter={() => setHoveredStar(s)} onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110">
                  <Star className={`w-7 h-7 ${s <= (hoveredStar || rating) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                </button>
              ))}
            </div>
          </div>

          <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your feedback, suggestions, or experience..."
            rows={4}
            className="resize-none bg-white/80 border-purple-100 text-gray-700 placeholder:text-gray-300 rounded-xl focus:border-purple-400" />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSubmit} disabled={submitting || (!message.trim() && !rating)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl h-11">
              <Send className="w-4 h-4 mr-2" /> {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </motion.div>

          <Button variant="ghost"
            className="w-full text-gray-500 hover:text-gray-700 border border-purple-100/40 hover:bg-purple-50/60 rounded-xl"
            onClick={handleGoogleReview}>
            <ExternalLink className="w-4 h-4 mr-2" /> Review Us On Google ⭐
          </Button>
        </div>
      </GlassCard>

      {feedbacks.filter(f => f.message !== "[Google Review Click]").length > 0 && (
        <GlassCard>
          <h3 className="text-gray-500 text-sm font-medium mb-3">Your Previous Feedback</h3>
          <div className="space-y-2">
            {feedbacks.filter(f => f.message !== "[Google Review Click]").map((f: any) => (
              <div key={f.id} className="p-3 rounded-xl bg-purple-50/40 border border-purple-100/30">
                {f.rating && (
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= f.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                )}
                <p className="text-gray-600 text-sm">{f.message}</p>
                {f.admin_reply && (
                  <div className="mt-2 pl-3 border-l-2 border-purple-300">
                    <p className="text-purple-600 text-xs font-medium">Admin Reply:</p>
                    <p className="text-gray-500 text-xs">{f.admin_reply}</p>
                  </div>
                )}
                <p className="text-gray-300 text-[10px] mt-1">{new Date(f.created_at).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default WorkshopFeedback;
