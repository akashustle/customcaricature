import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import WatermarkedImage from "@/components/WatermarkedImage";

const LilFleaGallery = () => {
  const [images, setImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userInteractingRef = useRef(false);
  const userInteractTimeoutRef = useRef<number | null>(null);

  const fetchImages = useCallback(async () => {
    const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
    if (data && data.length > 0) setImages(data as any[]);
  }, []);

  useEffect(() => {
    fetchImages();
    const channel = supabase
      .channel("lil-flea-gallery-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lil_flea_gallery" }, () => fetchImages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchImages]);

  // Infinite UPWARD auto-scroll, but pause when user manually scrolls / drags.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || images.length === 0) return;

    // Start in the middle so we can scroll both directions seamlessly.
    const initToMiddle = () => {
      const half = el.scrollHeight / 2;
      if (half > 0) el.scrollTop = half;
    };
    initToMiddle();
    // Re-init after images render
    const t = setTimeout(initToMiddle, 200);

    let raf: number;
    const speed = 1.6; // px/frame upward — slightly fast
    const tick = () => {
      if (autoScroll && !userInteractingRef.current && el) {
        el.scrollTop -= speed;
        if (el.scrollTop <= 0) {
          el.scrollTop = el.scrollHeight / 2;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const handleUserScroll = () => {
      userInteractingRef.current = true;
      if (userInteractTimeoutRef.current) window.clearTimeout(userInteractTimeoutRef.current);
      userInteractTimeoutRef.current = window.setTimeout(() => {
        userInteractingRef.current = false;
      }, 1500);
      // Wrap around if user drags to extremes
      if (el.scrollTop <= 0) el.scrollTop = el.scrollHeight / 2;
      else if (el.scrollTop >= el.scrollHeight - el.clientHeight) el.scrollTop = el.scrollHeight / 2;
    };

    el.addEventListener("wheel", handleUserScroll, { passive: true });
    el.addEventListener("touchmove", handleUserScroll, { passive: true });
    el.addEventListener("scroll", handleUserScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      el.removeEventListener("wheel", handleUserScroll);
      el.removeEventListener("touchmove", handleUserScroll);
      el.removeEventListener("scroll", handleUserScroll);
    };
  }, [images, autoScroll]);

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
  // Triple for seamless wraparound in both directions
  const tripled = [...allUrls, ...allUrls, ...allUrls];

  return (
    <>
      <SEOHead
        title="Lil Flea Gallery | Creative Caricature Club™"
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
                <p className="text-xs text-muted-foreground">{images.length} Images · scroll up or down</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoScroll(s => !s)}
                className="text-[11px] font-semibold flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 hover:bg-muted/70 transition"
                aria-label={autoScroll ? "Pause auto-scroll" : "Play auto-scroll"}
              >
                {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {autoScroll ? "Pause" : "Auto"}
              </button>
              <a href="/lil-flea" className="text-sm font-semibold text-accent hover:underline">← Back</a>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 px-6">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <span className="text-4xl">📸</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Photos coming soon</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              We're uploading the latest Lil Flea moments. Check back shortly to see live caricatures, happy customers, and unforgettable memories.
            </p>
            <a href="/lil-flea" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              ← Back to Lil Flea
            </a>
          </div>
        ) : (
          /* Infinite scroll container — vertical, both directions */
          <div
            ref={scrollRef}
            className="overflow-y-auto scrollbar-hide overscroll-contain"
            style={{ height: "calc(100vh - 65px)" }}
          >
            <div className="columns-2 sm:columns-3 md:columns-4 gap-2 p-3">
              {tripled.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="break-inside-avoid mb-2 cursor-pointer rounded-lg overflow-hidden shadow-sm border border-border/30 hover:shadow-md transition-shadow active:scale-[0.98]"
                  onClick={() => setLightboxIdx(i % allUrls.length)}
                >
                  <WatermarkedImage
                    src={url}
                    alt={`Lil Flea photo ${(i % allUrls.length) + 1}`}
                    className="w-full"
                    loading={i < 12 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxIdx(null)}
        >
          <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/20 flex items-center justify-center text-background/90 hover:bg-background/30" aria-label="Close"><X className="w-6 h-6" /></button>
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i - 1 + allUrls.length) % allUrls.length : 0); }}
            className="absolute left-3 z-10 w-11 h-11 rounded-full bg-background/20 flex items-center justify-center text-background/90 hover:bg-background/30"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i + 1) % allUrls.length : 0); }}
            className="absolute right-3 z-10 w-11 h-11 rounded-full bg-background/20 flex items-center justify-center text-background/90 hover:bg-background/30"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div
            key={lightboxIdx}
            className="max-w-[92vw] max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <WatermarkedImage
              src={allUrls[lightboxIdx]}
              alt="Gallery preview"
              className="rounded-2xl shadow-2xl max-h-[85vh]"
              imgClassName="!object-contain"
            />
          </div>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-background/70 font-semibold bg-foreground/30 px-3 py-1 rounded-full">{lightboxIdx + 1} / {allUrls.length}</p>
        </div>
      )}
    </>
  );
};

export default LilFleaGallery;
