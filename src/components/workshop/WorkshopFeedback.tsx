import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, ExternalLink } from "lucide-react";

const WorkshopFeedback = ({ user }: { user: any }) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase.from("workshop_feedback" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setFeedbacks(data as any[]);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from("workshop_feedback" as any).insert({
        user_id: user.id,
        message: message.trim(),
      } as any);
      toast({ title: "Thank you for your feedback! 💛" });
      setMessage("");
      fetchFeedbacks();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Feedback & Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your feedback, suggestions, or experience..."
              rows={4}
              className="resize-none"
            />
            <Button onClick={handleSubmit} disabled={submitting || !message.trim()} className="w-full font-sans">
              <Send className="w-4 h-4 mr-2" /> {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full font-sans"
              onClick={() => window.open("https://g.page/r/creativecaricatureclub/review", "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" /> Review Us On Google ⭐
            </Button>
          </div>
        </CardContent>
      </Card>

      {feedbacks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-sm text-muted-foreground">Your Previous Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {feedbacks.map((f: any) => (
              <div key={f.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="font-sans text-sm">{f.message}</p>
                <p className="text-[10px] text-muted-foreground font-sans mt-1">
                  {new Date(f.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkshopFeedback;
