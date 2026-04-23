import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
};

const GalleryPage = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const table = type === "caricatures" ? "caricature_gallery" : "event_gallery";
  const title = type === "caricatures" ? "Custom Caricature Gallery" : "Event Gallery";
  const subtitle = type === "caricatures" ? "Hand-Crafted Masterpieces" : "Live Caricature Events";

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from(table).select("*").order("sort_order");
      if (data) setItems(data as GalleryItem[]);
    };
    fetch();
    const ch = supabase
      .channel(`gallery-page-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table]);

  // Auto-scroll upward effect
  useEffect(() => {
    if (!scrollRef.current || items.length === 0) return;
    let animFrame: number;
    let scrollPos = 0;
    const speed = 0.5;
    const el = scrollRef.current;

    const animate = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollHeight / 2) scrollPos = 0;
      el.scrollTop = scrollPos;
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);

    const handleTouch = () => cancelAnimationFrame(animFrame);
    const handleTouchEnd = () => { animFrame = requestAnimationFrame(animate); };
    el.addEventListener("touchstart", handleTouch);
    el.addEventListener("mouseenter", handleTouch);
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("mouseleave", handleTouchEnd);

    return () => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener("touchstart", handleTouch);
      el.removeEventListener("mouseenter", handleTouch);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("mouseleave", handleTouchEnd);
    };
  }, [items]);

  // Double items for infinite scroll illusion
  const doubledItems = [...items, ...items];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEOHead title={type === "caricatures" ? "Custom Caricature Gallery | Hand-Crafted Artwork Samples" : "Live Event Caricature Gallery | Wedding & Corporate Events"} description={type === "caricatures" ? "Browse Creative Caricature Club™ custom caricature gallery — cute, romantic, fun, royal & minimal styles. Hand-crafted caricature artwork from photos." : "See live caricature events by Creative Caricature Club™ at weddings, corporate events, birthday parties & baby showers across India."} canonical={`/gallery/${type}`} />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-background/80 hover:text-background z-10"><X className="w-8 h-8" /></button>
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + items.length) % items.length); }} className="absolute left-4 text-background/80 hover:text-background z-10"><ChevronLeft className="w-10 h-10" /></button>
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % items.length); }} className="absolute right-4 text-background/80 hover:text-background z-10"><ChevronRight className="w-10 h-10" /></button>
            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              src={items[lightboxIndex].image_url}
              alt={items[lightboxIndex].caption || "Gallery"}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {items[lightboxIndex].caption && (
              <p className="absolute bottom-14 text-background/80 font-body text-sm bg-foreground/40 px-4 py-1 rounded-full">{items[lightboxIndex].caption}</p>
            )}
            <p className="absolute bottom-6 text-background/60 font-body text-sm">{lightboxIndex + 1} / {items.length}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-primary">{subtitle}</p>
            <h1 className="font-calligraphy text-xl font-bold text-foreground">{title}</h1>
          </div>
        </div>
      </header>

      {/* Auto-scrolling masonry grid */}
      <div ref={scrollRef} className="h-[calc(100vh-80px)] overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <div className="container mx-auto px-3 py-6">
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {doubledItems.map((item, i) => (
              <motion.div
                key={`${item.id}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                whileHover={{ scale: 1.02 }}
                className="break-inside-avoid rounded-xl overflow-hidden cursor-pointer shadow-md border border-border/40 bg-card mb-3"
                onClick={() => { setLightboxIndex(i % items.length); setLightboxOpen(true); }}
              >
                <img
                  src={item.image_url}
                  alt={item.caption || `${title} ${(i % items.length) + 1}`}
                  className="w-full object-cover"
                  loading="lazy"
                />
                {item.caption && (
                  <p className="px-3 py-2 text-xs font-body text-muted-foreground truncate">{item.caption}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;
