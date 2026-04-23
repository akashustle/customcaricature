import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type BeforeAfterItem = {
  id: string;
  before_image_url: string;
  after_image_url: string;
  caption: string | null;
};

const BeforeAfterSlider = ({ item }: { item: BeforeAfterItem }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleMouseDown = () => { dragging.current = true; };
  const handleMouseUp = () => { dragging.current = false; };

  useEffect(() => {
    const handleGlobalUp = () => { dragging.current = false; };
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchend", handleGlobalUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden cursor-col-resize select-none shadow-lg border border-border/50"
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => handleMove(e.clientX)}
      onTouchStart={handleMouseDown}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After (full background) */}
      <img src={item.after_image_url} alt="After" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img src={item.before_image_url} alt="Before" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" style={{ minWidth: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%" }} />
      </div>

      {/* Slider line */}
      <div className="absolute top-0 bottom-0" style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}>
        <div className="w-0.5 h-full bg-background shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-background shadow-xl flex items-center justify-center border-2 border-primary">
          <ChevronLeft className="w-3 h-3 text-primary" />
          <ChevronRight className="w-3 h-3 text-primary" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 bg-foreground/70 text-background text-xs font-body font-semibold px-3 py-1 rounded-full">Before</span>
      <span className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs font-body font-semibold px-3 py-1 rounded-full">After</span>
    </div>
  );
};

const HomepageBeforeAfter = () => {
  const [items, setItems] = useState<BeforeAfterItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("before_after_gallery").select("*").eq("is_active", true).order("sort_order");
      if (data) setItems(data as BeforeAfterItem[]);
    };
    fetch();
    const ch = supabase.channel("before-after-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "before_after_gallery" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">See The Magic</p>
          <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-2">Before & After</h2>
          <p className="text-muted-foreground font-body">Slide to see the transformation</p>
        </motion.div>

        <div className="max-w-md mx-auto">
          <motion.div key={items[currentIndex].id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <BeforeAfterSlider item={items[currentIndex]} />
          </motion.div>
          {items[currentIndex].caption && (
            <p className="text-center text-sm font-body text-muted-foreground mt-3">{items[currentIndex].caption}</p>
          )}

          {items.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                onClick={() => setCurrentIndex((i) => (i - 1 + items.length) % items.length)}
                className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex gap-2">
                {items.map((_, i) => (
                  <button key={i} onClick={() => setCurrentIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentIndex ? "bg-primary scale-125" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
              <button
                onClick={() => setCurrentIndex((i) => (i + 1) % items.length)}
                className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomepageBeforeAfter;
