import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, ExternalLink, Star } from "lucide-react";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

const WorkshopFeedback = ({ user }: { user: any }) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchFeedbacks(); }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase.from("workshop_feedback" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setFeedbacks(data as any[]);
  };

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
    // Track click
    await supabase.from("workshop_feedback" as any).insert({
      user_id: user.id,
      message: "[Google Review Click]",
      google_review_clicked: true,
    } as any);
    window.open("https://g.page/r/creativecaricatureclub/review", "_blank");
  };

  return (
    <div className="space-y-4">
      <GlassCard>
        <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-purple-400" /> Feedback & Suggestions
        </h2>
        <div className="space-y-4">
          {/* Star Rating */}
          <div>
            <p className="text-white/50 text-xs mb-2">Rate the Workshop</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoveredStar(s)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={`w-7 h-7 ${
                    s <= (hoveredStar || rating) ? "text-amber-400 fill-amber-400" : "text-white/20"
                  }`} />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your feedback, suggestions, or experience..."
            rows={4}
            className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-purple-400"
          />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (!message.trim() && !rating)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl h-11"
            >
              <Send className="w-4 h-4 mr-2" /> {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </motion.div>

          <Button
            variant="ghost"
            className="w-full text-white/60 hover:text-white border border-white/10 hover:bg-white/5 rounded-xl"
            onClick={handleGoogleReview}
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Review Us On Google ⭐
          </Button>
        </div>
      </GlassCard>

      {feedbacks.filter(f => f.message !== "[Google Review Click]").length > 0 && (
        <GlassCard>
          <h3 className="text-white/50 text-sm font-medium mb-3">Your Previous Feedback</h3>
          <div className="space-y-2">
            {feedbacks.filter(f => f.message !== "[Google Review Click]").map((f: any) => (
              <div key={f.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                {f.rating && (
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= f.rating ? "text-amber-400 fill-amber-400" : "text-white/10"}`} />
                    ))}
                  </div>
                )}
                <p className="text-white/80 text-sm">{f.message}</p>
                <p className="text-white/30 text-[10px] mt-1">{new Date(f.created_at).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default WorkshopFeedback;
