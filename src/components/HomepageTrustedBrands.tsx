import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Building2, Tv, Award } from "lucide-react";

const HomepageTrustedBrands = () => {
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("trusted_brands" as any).select("*").order("sort_order");
      if (data) setBrands(data as any[]);
    };
    fetch();
    const ch = supabase.channel("brands-rt").on("postgres_changes", { event: "*", schema: "public", table: "trusted_brands" }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (brands.length === 0) return null;

  const govt = brands.filter((b: any) => b.category === "government");
  const entertainment = brands.filter((b: any) => b.category === "entertainment");
  const others = brands.filter((b: any) => b.category !== "government" && b.category !== "entertainment");

  return (
    <section className="py-16 md:py-24 bg-card/50 border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Our Proud Associations</p>
          <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-3">
            Trusted by Institutions, Brands<br className="hidden md:block" /> & National Platforms
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto">
            Delivering professional caricature artistry for government bodies, corporate enterprises, and major entertainment platforms across India
          </p>
        </motion.div>

        {govt.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="font-body font-bold text-foreground text-sm uppercase tracking-wider">Government & Institutional Engagements</h3>
            </div>
            <p className="text-center text-sm text-muted-foreground font-body mb-6 max-w-xl mx-auto">
              Entrusted with high-profile assignments requiring discretion, professionalism, and consistent quality at national-scale events
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {govt.map((b: any, i: number) => (
                <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="w-28 h-20 rounded-xl bg-background border border-border/50 flex items-center justify-center p-3 hover:shadow-md transition-shadow">
                  <img src={b.logo_url} alt={b.name} className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all" title={b.name} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {entertainment.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Tv className="w-5 h-5 text-primary" />
              <h3 className="font-body font-bold text-foreground text-sm uppercase tracking-wider">Entertainment & Commercial Collaborations</h3>
            </div>
            <p className="text-center text-sm text-muted-foreground font-body mb-6 max-w-xl mx-auto">
              Partnering with leading brands across fashion, broadcast media, sports, and cinema for innovative brand activations
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {entertainment.map((b: any, i: number) => (
                <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="w-28 h-20 rounded-xl bg-background border border-border/50 flex items-center justify-center p-3 hover:shadow-md transition-shadow">
                  <img src={b.logo_url} alt={b.name} className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all" title={b.name} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="font-body font-bold text-foreground text-sm uppercase tracking-wider">Brands & Partners</h3>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {others.map((b: any, i: number) => (
                <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="w-28 h-20 rounded-xl bg-background border border-border/50 flex items-center justify-center p-3 hover:shadow-md transition-shadow">
                  <img src={b.logo_url} alt={b.name} className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all" title={b.name} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HomepageTrustedBrands;
