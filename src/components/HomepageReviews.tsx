import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const HomepageReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("homepage_reviews" as any).select("*").order("sort_order");
      if (data) setReviews(data as any[]);
    };
    fetch();
    const ch = supabase.channel("hp-reviews-rt").on("postgres_changes", { event: "*", schema: "public", table: "homepage_reviews" }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="bg-card/50 py-16 md:py-24 border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">What Our Clients Say</p>
          <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-3">Loved by Thousands</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {reviews.map((review: any, i: number) => (
            <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="card-3d h-full">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <p className="text-sm font-body text-foreground leading-relaxed mb-4">"{review.review_text}"</p>
                  <p className="text-xs font-body font-semibold text-primary">{review.reviewer_name}</p>
                  {review.designation && <p className="text-[10px] font-body text-muted-foreground">{review.designation}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageReviews;
