import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Star, Loader2 } from "lucide-react";

const AdminHomepageReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ reviewer_name: "", review_text: "", rating: 5, designation: "" });

  const fetch = async () => {
    const { data } = await supabase.from("homepage_reviews" as any).select("*").order("sort_order");
    if (data) setReviews(data as any[]);
  };

  useEffect(() => {
    fetch();
    const ch = supabase.channel("admin-hp-reviews").on("postgres_changes", { event: "*", schema: "public", table: "homepage_reviews" }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const add = async () => {
    if (!form.reviewer_name || !form.review_text) { toast({ title: "Name & review required", variant: "destructive" }); return; }
    setAdding(true);
    await supabase.from("homepage_reviews" as any).insert({ ...form, sort_order: reviews.length } as any);
    toast({ title: "Review added!" });
    setForm({ reviewer_name: "", review_text: "", rating: 5, designation: "" });
    setAdding(false);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from("homepage_reviews" as any).delete().eq("id", id);
    toast({ title: "Deleted" });
    fetch();
  };

  const toggleVisible = async (id: string, val: boolean) => {
    await supabase.from("homepage_reviews" as any).update({ is_visible: val } as any).eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>Homepage Reviews</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Add Review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Reviewer Name</Label><Input value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} placeholder="Priya S." /></div>
            <div><Label className="text-xs">Designation (optional)</Label><Input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="CEO, Company" /></div>
          </div>
          <div><Label className="text-xs">Review</Label><Textarea value={form.review_text} onChange={e => setForm({ ...form, review_text: e.target.value })} placeholder="Write review..." /></div>
          <div><Label className="text-xs">Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} /></div>
          <Button onClick={add} disabled={adding}>{adding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} Add Review</Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {reviews.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}</div>
                <p className="font-semibold text-sm">{r.reviewer_name}{r.designation && <span className="text-muted-foreground font-normal"> · {r.designation}</span>}</p>
                <p className="text-sm text-muted-foreground mt-1">"{r.review_text}"</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={r.is_visible} onCheckedChange={v => toggleVisible(r.id, v)} />
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminHomepageReviews;
