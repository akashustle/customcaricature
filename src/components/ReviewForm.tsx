import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ReviewFormProps {
  userId: string;
  orderId?: string;
  bookingId?: string;
  reviewType: "order" | "event";
  onSubmitted?: () => void;
}

const ReviewForm = ({ userId, orderId, bookingId, reviewType, onSubmitted }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      order_id: orderId || null,
      booking_id: bookingId || null,
      review_type: reviewType,
      rating,
      comment: comment.trim() || null,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Thank you for your review! ⭐" });
      setSubmitted(true);
      onSubmitted?.();
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-50 rounded-xl p-4 text-center">
        <p className="font-display text-lg font-bold text-green-800">✅ Review Submitted!</p>
        <p className="text-xs text-green-700 font-sans">Thank you for your feedback</p>
      </motion.div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <p className="font-display text-sm font-bold">⭐ Rate Your Experience</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i)}
              className="transition-transform hover:scale-110"
            >
              <Star className={`w-8 h-8 ${i <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)..."
          className="text-sm min-h-[80px]"
        />
        <Button onClick={handleSubmit} disabled={rating === 0 || submitting} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90" size="sm">
          {submitting ? "Submitting..." : <><Send className="w-4 h-4 mr-2" />Submit Review</>}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
