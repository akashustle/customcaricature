import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

const LilFleaGallery = () => {
  const [images, setImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
      if (data && data.length > 0) setImages(data as any[]);
    })();
  }, []);

  // Infinite upward auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;
    let speed = 1.2;
    const scroll = () => {
      el.scrollTop += speed;
      // Reset to create infinite loop
      if (el.scrollTop >= el.scrollHeight / 2) {
        el.scrollTop = 0;
      }
      raf = requestAnimationFrame(scroll);
    };
    raf = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(raf);
  }, [images]);

  const allUrls = images.map(i => i.image_url);
  // Double for infinite scroll illusion
  const doubled = [...allUrls, ...allUrls];

  return (
    <>
      <SEOHead
        title="Lil Flea Gallery | Creative Caricature Club"
        description="Browse all our Lil Flea event photos — live caricatures, happy customers, and unforgettable moments."
        canonical="/lil-flea-gallery"
      />
      <div className="min-h-screen bg-background" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border py-4">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-accent/30 p-0.5 bg-background">
                <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-black text-foreground">Lil Flea Gallery</h1>
                <p className="text-xs text-muted-foreground">{images.length} Photos</p>
              </div>
            </div>
            <a href="/lil-flea" className="text-sm font-semibold text-accent hover:underline">← Back</a>
          </div>
        </div>

        {/* Infinite scroll container */}
        <div
          ref={scrollRef}
          className="h-[calc(100vh-73px)] overflow-hidden"
          style={{ scrollBehavior: "auto" }}
        >
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 p-4 space-y-3">
            {doubled.map((url, i) => (
              <motion.div
                key={`${url}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5), type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.03 }}
                className="break-inside-avoid mb-3 cursor-pointer rounded-xl overflow-hidden shadow-md border border-border/30 hover:shadow-xl transition-shadow"
                onClick={() => setLightboxIdx(i % allUrls.length)}
              >
                <img
                  src={url}
                  alt={`Lil Flea photo ${(i % allUrls.length) + 1}`}
                  className="w-full object-cover"
                  loading={i < 12 ? "eager" : "lazy"}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/90 backdrop-blur-sm"
            onClick={() => setLightboxIdx(null)}
          >
            <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 z-10 text-background/80 hover:text-background" aria-label="Close"><X className="w-8 h-8" /></button>
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i - 1 + allUrls.length) % allUrls.length : 0); }}
              className="absolute left-4 z-10 w-12 h-12 rounded-full bg-background/20 flex items-center justify-center text-background/80 hover:bg-background/30"
              aria-label="Previous"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i + 1) % allUrls.length : 0); }}
              className="absolute right-4 z-10 w-12 h-12 rounded-full bg-background/20 flex items-center justify-center text-background/80 hover:bg-background/30"
              aria-label="Next"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              src={allUrls[lightboxIdx]}
              alt="Gallery preview"
              className="max-w-[92vw] max-h-[85vh] object-contain rounded-2xl"
              onClick={e => e.stopPropagation()}
            />
            <p className="absolute bottom-6 text-sm text-background/50 font-semibold">{lightboxIdx + 1} / {allUrls.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LilFleaGallery;
