import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Send, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [tab, setTab] = useState("order");

  useEffect(() => {
    fetchReviews();
    const ch = supabase.channel("admin-reviews-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => fetchReviews())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchReviews = async () => {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (data) setReviews(data as any);
  };

  const handleReply = async (reviewId: string) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;
    setReplyingId(reviewId);
    const { error } = await supabase.from("reviews").update({
      admin_reply: text,
      admin_replied_at: new Date().toISOString(),
    } as any).eq("id", reviewId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Reply Sent!" });
      setReplyText(prev => ({ ...prev, [reviewId]: "" }));
    }
    setReplyingId(null);
  };

  const deleteReview = async (reviewId: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Review Deleted" }); fetchReviews(); }
  };

  const filtered = reviews.filter(r => r.review_type === tab);

  const Stars = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Reviews & Feedback</h2>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="order" className="font-sans">Order Reviews ({reviews.filter(r => r.review_type === "order").length})</TabsTrigger>
          <TabsTrigger value="event" className="font-sans">Event Reviews ({reviews.filter(r => r.review_type === "event").length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-sans text-muted-foreground">No {tab} reviews yet</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((review: any) => (
                <Card key={review.id} className="card-3d">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Stars rating={review.rating} />
                        <p className="text-xs text-muted-foreground font-sans mt-1">
                          {new Date(review.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {review.review_type === "order" ? `Order: ${review.order_id?.slice(0, 8).toUpperCase()}` : `Event: ${review.booking_id?.slice(0, 8).toUpperCase()}`}
                        </p>
                      </div>
                      <Badge className={`border-none text-xs ${review.admin_reply ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {review.admin_reply ? "Replied" : "Pending Reply"}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Review?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this review.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteReview(review.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {review.comment && <p className="text-sm font-sans bg-muted/50 rounded-lg p-3">{review.comment}</p>}
                    {review.admin_reply && (
                      <div className="bg-primary/5 rounded-lg p-3 text-sm font-sans">
                        <p className="text-xs font-semibold text-primary mb-1">Admin Reply:</p>
                        <p>{review.admin_reply}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {review.admin_replied_at && new Date(review.admin_replied_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        value={replyText[review.id] || ""}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                        placeholder={review.admin_reply ? "Update reply..." : "Write a reply..."}
                        className="text-sm min-h-[60px]"
                      />
                      <Button
                        size="sm"
                        className="rounded-full self-end font-sans"
                        disabled={!replyText[review.id]?.trim() || replyingId === review.id}
                        onClick={() => handleReply(review.id)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReviews;
