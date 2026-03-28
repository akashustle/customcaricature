import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

const LilFleaGallery = () => {
  const [images, setImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchImages = useCallback(async () => {
    const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
    if (data && data.length > 0) setImages(data as any[]);
  }, []);

  useEffect(() => {
    fetchImages();

    const channel = supabase
      .channel("lil-flea-gallery-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lil_flea_gallery" }, () => {
        fetchImages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchImages]);

  // Infinite upward auto-scroll — fast & smooth via RAF
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || images.length === 0) return;
    let raf: number;
    const speed = 1.5;
    const scroll = () => {
      el.scrollTop += speed;
      if (el.scrollTop >= el.scrollHeight / 2) {
        el.scrollTop = 0;
      }
      raf = requestAnimationFrame(scroll);
    };
    raf = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(raf);
  }, [images]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setLightboxIdx(i => i !== null ? (i + 1) % images.length : 0);
      else if (e.key === "ArrowLeft") setLightboxIdx(i => i !== null ? (i - 1 + images.length) % images.length : 0);
      else if (e.key === "Escape") setLightboxIdx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, images.length]);

  const allUrls = images.map(i => i.image_url);
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
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border py-3">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-accent/30 p-0.5 bg-background">
                <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <h1 className="text-base font-black text-foreground">Lil Flea Gallery</h1>
                <p className="text-xs text-muted-foreground">{images.length} Images</p>
              </div>
            </div>
            <a href="/lil-flea" className="text-sm font-semibold text-accent hover:underline">← Back</a>
          </div>
        </div>

        {/* Infinite scroll container */}
        <div
          ref={scrollRef}
          className="h-[calc(100vh-57px)] overflow-hidden"
        >
          <div className="columns-2 sm:columns-3 md:columns-4 gap-2 p-3">
            {doubled.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="break-inside-avoid mb-2 cursor-pointer rounded-lg overflow-hidden shadow-sm border border-border/30 hover:shadow-md transition-shadow"
                onClick={() => setLightboxIdx(i % allUrls.length)}
              >
                <img
                  src={url}
                  alt={`Lil Flea photo ${(i % allUrls.length) + 1}`}
                  className="w-full object-cover"
                  loading={i < 12 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/90 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
        >
          <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 z-10 text-background/80 hover:text-background" aria-label="Close"><X className="w-7 h-7" /></button>
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i - 1 + allUrls.length) % allUrls.length : 0); }}
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-background/20 flex items-center justify-center text-background/80 hover:bg-background/30"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i + 1) % allUrls.length : 0); }}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-background/20 flex items-center justify-center text-background/80 hover:bg-background/30"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <img
            key={lightboxIdx}
            src={allUrls[lightboxIdx]}
            alt="Gallery preview"
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
          <p className="absolute bottom-5 text-sm text-background/50 font-semibold">{lightboxIdx + 1} / {allUrls.length}</p>
        </div>
      )}
    </>
  );
};

export default LilFleaGallery;
