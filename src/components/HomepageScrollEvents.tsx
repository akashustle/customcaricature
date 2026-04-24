import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const HomepageScrollEvents = () => {
  const [items, setItems] = useState<any[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("scroll_event_images" as any).select("*").order("sort_order");
      if (data) setItems(data as any[]);
    };
    fetch();
    const ch = supabase.channel("scroll-events-rt").on("postgres_changes", { event: "*", schema: "public", table: "scroll_event_images" }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (items.length === 0) return null;

  const tripled = [...items, ...items, ...items];
  // Faster scroll — ~3.2s per card (was 5s)
  const duration = Math.max(14, Math.round(items.length * 3.2));

  return (
    <>
      {lightboxOpen && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/80 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-background/80 hover:text-background z-10"><X className="w-8 h-8" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + items.length) % items.length); }} className="absolute left-4 text-background/80 hover:text-background z-10"><ChevronLeft className="w-10 h-10" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % items.length); }} className="absolute right-4 text-background/80 hover:text-background z-10"><ChevronRight className="w-10 h-10" /></button>
            <motion.img key={lightboxIndex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              src={(items[lightboxIndex] as any).image_url} alt={(items[lightboxIndex] as any).caption || "Event"} className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
            {(items[lightboxIndex] as any).caption && <p className="absolute bottom-12 text-background/80 font-body text-sm bg-foreground/40 px-4 py-1 rounded-full">{(items[lightboxIndex] as any).caption}</p>}
            <p className="absolute bottom-6 text-background/60 font-body text-sm">{lightboxIndex + 1} / {items.length}</p>
          </motion.div>
        </AnimatePresence>
      )}

      <section className="py-12 md:py-16" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-6">
            <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Live Events</p>
            <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-2">Event Gallery</h2>
            <p className="text-muted-foreground font-body">Moments from our live caricature events</p>
          </motion.div>
        </div>
        <style>{`@keyframes events-scroll{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-33.33%,0,0)}}`}</style>
        <div className="overflow-hidden py-4">
          <div
            className="flex gap-4 will-change-transform"
            style={{ animation: `events-scroll ${duration}s linear infinite`, width: "max-content" }}
          >
            {tripled.map((item: any, i) => (
              <div key={i} className="flex-shrink-0 w-64 h-80 rounded-2xl overflow-hidden cursor-pointer shadow-md border border-border/50 hover:scale-[1.03] hover:-translate-y-1 transition-transform duration-300"
                onClick={() => { setLightboxIndex(i % items.length); setLightboxOpen(true); }}>
                <img src={item.image_url} alt={item.caption || `Event ${(i % items.length) + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" width={256} height={320} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HomepageScrollEvents;
