import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import WatermarkedImage from "@/components/WatermarkedImage";

type GalleryRow = { id: string; image_url: string; caption: string | null; placement?: string | null };

const LilFleaGallery = () => {
  const [images, setImages] = useState<GalleryRow[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

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
  // Filter per placement (admin-controlled). 'all' images appear everywhere.
  const slide1Imgs = images.filter(i => !i.placement || i.placement === "all" || i.placement === "slide1");
  const slide2Imgs = images.filter(i => !i.placement || i.placement === "all" || i.placement === "slide2");
  const scrollImgs = images.filter(i => !i.placement || i.placement === "all" || i.placement === "scroll");
  // Triple for seamless infinite scroll wrap
  const tripled1 = [...slide1Imgs, ...slide1Imgs, ...slide1Imgs];
  const tripled2 = [...slide2Imgs, ...slide2Imgs, ...slide2Imgs];
  const tripledV = [...scrollImgs, ...scrollImgs, ...scrollImgs];
  const duration = Math.max(18, Math.round(slide1Imgs.length * 3.2));

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      <SEOHead
        title="Lil Flea Gallery | Creative Caricature Club™"
        description="Browse all our Lil Flea event photos — live caricatures, happy customers, and unforgettable moments."
        canonical="/lil-flea-gallery"
      />
      <div className="min-h-screen bg-background pb-24 md:pb-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border py-3">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-accent/30 p-0.5 bg-background">
                <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <h1 className="text-base font-black text-foreground">Lil Flea Gallery</h1>
                <p className="text-xs text-muted-foreground">{images.length} Images · auto-scrolling</p>
              </div>
            </div>
            <a href="/lil-flea" className="text-sm font-semibold text-accent hover:underline">← Back</a>
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
          <>
            {/* Section heading like Event Gallery */}
            <section className="py-8 md:py-12" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
              <div className="container mx-auto px-4 mb-4 text-center">
                <p className="text-sm font-body font-semibold uppercase tracking-widest text-accent mb-2">The Lil Flea</p>
                <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground">Moments at the Flea</h2>
                <p className="text-muted-foreground font-body mt-1">Live caricatures · happy customers · unforgettable memories</p>
              </div>

              <style>{`@keyframes lilflea-scroll{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-33.33%,0,0)}}`}</style>

              {/* Row 1 */}
              <div className="overflow-hidden py-3">
                <div
                  className="flex gap-3 will-change-transform"
                  style={{ animation: `lilflea-scroll ${duration}s linear infinite`, width: "max-content" }}
                >
                  {tripled.map((item, i) => (
                    <div
                      key={`r1-${i}`}
                      className="flex-shrink-0 w-56 h-72 sm:w-64 sm:h-80 cursor-pointer hover:scale-[1.03] hover:-translate-y-1 transition-transform duration-300"
                      onClick={() => setLightboxIdx(i % allUrls.length)}
                    >
                      <WatermarkedImage
                        src={item.image_url}
                        alt={item.caption || `Lil Flea photo ${(i % allUrls.length) + 1}`}
                        className="w-full h-full rounded-2xl shadow-md border border-border/50"
                        loading={i < 8 ? "eager" : "lazy"}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 2 — reversed direction for visual depth, only if enough images */}
              {images.length >= 4 && (
                <div className="overflow-hidden py-3">
                  <div
                    className="flex gap-3 will-change-transform"
                    style={{ animation: `lilflea-scroll ${Math.round(duration * 1.2)}s linear infinite reverse`, width: "max-content" }}
                  >
                    {tripled.map((item, i) => (
                      <div
                        key={`r2-${i}`}
                        className="flex-shrink-0 w-48 h-64 sm:w-56 sm:h-72 cursor-pointer hover:scale-[1.03] hover:-translate-y-1 transition-transform duration-300"
                        onClick={() => setLightboxIdx(i % allUrls.length)}
                      >
                        <WatermarkedImage
                          src={item.image_url}
                          alt={item.caption || `Lil Flea photo ${(i % allUrls.length) + 1}`}
                          className="w-full h-full rounded-2xl shadow-md border border-border/50"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Row 3 — vertical infinite UP-scroll grid (2 cols mobile, more on desktop) */}
            <section className="py-6 md:py-10" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}>
              <div className="container mx-auto px-4 mb-4 text-center">
                <p className="text-xs font-body font-semibold uppercase tracking-widest text-accent mb-1">More Memories</p>
                <h3 className="font-calligraphy text-2xl md:text-4xl font-bold text-foreground">Endless Lil Flea Vibes</h3>
                <p className="text-muted-foreground text-xs md:text-sm font-body mt-1">Auto-scrolling grid · tap any photo to view</p>
              </div>

              <style>{`@keyframes lilflea-vscroll{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(0,-33.33%,0)}}`}</style>

              <div className="container mx-auto px-3">
                <div
                  className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/30"
                  style={{ height: "min(70vh, 640px)" }}
                >
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 will-change-transform"
                    style={{
                      animation: `lilflea-vscroll ${Math.max(40, images.length * 5)}s linear infinite`,
                    }}
                  >
                    {tripled.map((item, i) => (
                      <button
                        key={`v-${i}`}
                        type="button"
                        onClick={() => setLightboxIdx(i % allUrls.length)}
                        className="aspect-[3/4] w-full overflow-hidden rounded-xl shadow-sm border border-border/40 active:scale-[0.97] transition-transform"
                      >
                        <WatermarkedImage
                          src={item.image_url}
                          alt={item.caption || `Lil Flea grid ${(i % allUrls.length) + 1}`}
                          className="w-full h-full"
                          imgClassName="!object-cover w-full h-full"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                  {/* Top + bottom fade for premium look */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
                </div>
              </div>
            </section>

            {/* Scroll-to-top FAB */}
            <button
              onClick={scrollToTop}
              className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxIdx(null)}
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
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
          {images[lightboxIdx]?.caption && (
            <p className="absolute bottom-14 left-1/2 -translate-x-1/2 text-background/85 font-semibold text-sm bg-foreground/40 px-4 py-1 rounded-full max-w-[80vw] truncate">{images[lightboxIdx].caption}</p>
          )}
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-background/70 font-semibold bg-foreground/30 px-3 py-1 rounded-full">{lightboxIdx + 1} / {allUrls.length}</p>
        </div>
      )}
    </>
  );
};

export default LilFleaGallery;
