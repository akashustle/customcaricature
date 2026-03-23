import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
};

const HomepageGallery = ({ table, title, subtitle }: {
  table: "event_gallery" | "caricature_gallery";
  title: string;
  subtitle: string;
}) => {
  const navigate = useNavigate();
  const galleryType = table === "caricature_gallery" ? "caricatures" : "events";
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchItems = async () => {
    const { data } = await supabase.from(table).select("*").order("sort_order");
    if (data) setItems(data as GalleryItem[]);
  };

  useEffect(() => {
    fetchItems();
    const ch = supabase
      .channel(`homepage-${table}-rt`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table]);

  if (items.length === 0) return null;

  return (
    <>
      {lightboxOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/80 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-background/80 hover:text-background z-10">
              <X className="w-8 h-8" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + items.length) % items.length); }} className="absolute left-4 text-background/80 hover:text-background z-10">
              <ChevronLeft className="w-10 h-10" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % items.length); }} className="absolute right-4 text-background/80 hover:text-background z-10">
              <ChevronRight className="w-10 h-10" />
            </button>
            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={items[lightboxIndex].image_url}
              alt={items[lightboxIndex].caption || "Gallery"}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {items[lightboxIndex].caption && (
              <p className="absolute bottom-12 text-background/80 font-body text-sm bg-foreground/40 px-4 py-1 rounded-full">
                {items[lightboxIndex].caption}
              </p>
            )}
            <p className="absolute bottom-6 text-background/60 font-body text-sm">{lightboxIndex + 1} / {items.length}</p>
          </motion.div>
        </AnimatePresence>
      )}

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">{subtitle}</p>
            <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground">{title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {items.slice(0, 8).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03, y: -4 }}
                className="rounded-2xl overflow-hidden cursor-pointer shadow-md border border-border/50 bg-card"
                onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
              >
                <img
                  src={item.image_url}
                  alt={item.caption || `${title} ${i + 1}`}
                  className="w-full h-48 md:h-56 object-cover"
                  loading="lazy"
                />
                {item.caption && (
                  <p className="px-3 py-2 text-xs font-body text-muted-foreground truncate">{item.caption}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HomepageGallery;
