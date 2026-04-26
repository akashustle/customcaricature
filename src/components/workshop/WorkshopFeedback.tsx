import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, ExternalLink, Star, Reply } from "lucide-react";
import { motion } from "framer-motion";

const WorkshopFeedback = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [userReplyText, setUserReplyText] = useState<{ [key: string]: string }>({});
  const messageRef = useRef(message);
  const ratingRef = useRef(rating);

  // Keep refs in sync without triggering re-renders
  useEffect(() => { messageRef.current = message; }, [message]);
  useEffect(() => { ratingRef.current = rating; }, [rating]);

  // Booking-dashboard parity: white 3D cards with brand semantic tokens.
  const cardBg = "bg-card border border-border/50 shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.18)]";
  const textPrimary = "text-foreground font-bold";
  const textSecondary = "text-muted-foreground font-medium";
  const textMuted = "text-muted-foreground/70";
  const inputBg = "bg-background border-border text-foreground placeholder:text-muted-foreground/50";

  const fetchFeedbacks = useCallback(async () => {
    const { data } = await supabase.from("workshop_feedback" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setFeedbacks(data as any[]);
  }, [user.id]);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((s: any) => { map[s.id] = s.value; });
      setSettings(map);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks(); fetchSettings();
    // Only listen for INSERT events to avoid re-fetching while user is typing
    const ch = supabase.channel("ws-feedback-user")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workshop_feedback", filter: `user_id=eq.${user.id}` }, fetchFeedbacks)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workshop_feedback", filter: `user_id=eq.${user.id}` }, (payload) => {
        // Only update the specific feedback item, don't refetch all
        setFeedbacks(prev => prev.map(f => f.id === (payload.new as any).id ? { ...f, ...(payload.new as any) } : f));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id, fetchFeedbacks, fetchSettings]);

  const feedbackEnabled = settings.feedback_visibility?.enabled !== false;

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
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserReply = async (feedbackId: string) => {
    const reply = userReplyText[feedbackId];
    if (!reply?.trim()) return;
    await supabase.from("workshop_feedback" as any).update({
      user_reply: reply.trim(),
      user_reply_at: new Date().toISOString(),
    } as any).eq("id", feedbackId);
    toast({ title: "Reply sent! ✅" });
    setUserReplyText(prev => ({ ...prev, [feedbackId]: "" }));
    setReplyingTo(null);
  };

  const handleGoogleReview = async () => {
    await supabase.from("workshop_feedback" as any).insert({
      user_id: user.id,
      message: "[Google Review Click]",
      google_review_clicked: true,
    } as any);
    window.open("https://g.page/r/creativecaricatureclub/review", "_blank");
  };

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>
  );

  if (!feedbackEnabled) return null;

  return (
    <div className="space-y-4">
      <GlassCard>
        <h2 className={`${textPrimary} text-lg flex items-center gap-2 mb-4`}>
          <MessageSquare className="w-5 h-5 text-primary" /> Feedback & Suggestions
        </h2>
        <div className="space-y-4">
          <div>
            <p className={`${textMuted} text-xs mb-2`}>Rate the Workshop</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)}
                  onMouseEnter={() => setHoveredStar(s)} onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110">
                  <Star className={`w-7 h-7 ${s <= (hoveredStar || rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>

          <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your feedback, suggestions, or experience..."
            rows={4}
            className={`resize-none ${inputBg} rounded-xl focus:border-purple-400`} />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSubmit} disabled={submitting || (!message.trim() && !rating)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 font-bold">
              <Send className="w-4 h-4 mr-2" /> {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </motion.div>

          <Button variant="ghost"
            className={`w-full ${textSecondary} border border-border/60 hover:bg-muted/40 rounded-xl`}
            onClick={handleGoogleReview}>
            <ExternalLink className="w-4 h-4 mr-2" /> Review Us On Google ⭐
          </Button>
        </div>
      </GlassCard>

      {feedbacks.filter(f => f.message !== "[Google Review Click]").length > 0 && (
        <GlassCard>
          <h3 className={`${textSecondary} text-sm mb-3`}>Your Previous Feedback</h3>
          <div className="space-y-2">
            {feedbacks.filter(f => f.message !== "[Google Review Click]").map((f: any) => (
              <div key={f.id} className="p-3 rounded-xl bg-muted/30 border border-border/60">
                {f.rating && (
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= f.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                )}
                <p className={`${textSecondary} text-sm`}>{f.message}</p>
                
                {f.admin_reply && (
                  <div className="mt-2 pl-3 border-l-2 border-primary/40">
                    <p className="text-primary text-xs font-bold">Ritesh Replied:</p>
                    <p className={`${textSecondary} text-xs`}>{f.admin_reply}</p>
                    
                    {/* User reply to admin */}
                    {f.user_reply && (
                      <div className="mt-1.5 pl-3 border-l-2 border-accent/40">
                        <p className="text-accent-foreground text-xs font-bold">Your Reply:</p>
                        <p className={`${textSecondary} text-xs`}>{f.user_reply}</p>
                      </div>
                    )}

                    {/* Admin reply to user reply */}
                    {f.admin_reply_to_user_reply && (
                      <div className="mt-1.5 pl-3 border-l-2 border-primary/40">
                        <p className="text-primary text-xs font-bold">Ritesh:</p>
                        <p className={`${textSecondary} text-xs`}>{f.admin_reply_to_user_reply}</p>
                      </div>
                    )}
                    
                    {/* Reply button - only show if no user reply yet */}
                    {!f.user_reply && (
                      <>
                        {replyingTo === f.id ? (
                          <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
                            <Input
                              value={userReplyText[f.id] || ""}
                              onChange={e => setUserReplyText(prev => ({ ...prev, [f.id]: e.target.value }))}
                              placeholder="Reply to Ritesh..."
                              className={`${inputBg} h-7 text-xs flex-1 rounded-lg`}
                              autoFocus
                              onKeyDown={e => { if (e.key === "Enter") handleUserReply(f.id); }}
                            />
                            <Button size="sm" onClick={() => handleUserReply(f.id)}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-3 text-xs font-bold rounded-lg">
                              <Send className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <button onClick={() => setReplyingTo(f.id)}
                            className="mt-1 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-bold">
                            <Reply className="w-3 h-3" /> Reply
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                <p className={`${textMuted} text-[10px] mt-1`}>{new Date(f.created_at).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default WorkshopFeedback;
