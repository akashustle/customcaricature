import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, Ticket, Phone, X, ChevronLeft, ChevronRight, Instagram, ExternalLink, Sparkles, Users, Palette, Heart, Star, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";

const EVENT_IMAGES = [
  "/images/lil-flea/lf-0.jpeg",
  "/images/lil-flea/lf-1.jpeg",
  "/images/lil-flea/lf-2.jpeg",
  "/images/lil-flea/lf-3.jpeg",
  "/images/lil-flea/lf-4.jpeg",
  "/images/lil-flea/lf-5.jpeg",
  "/images/lil-flea/lf-6.jpeg",
  "/images/lil-flea/lf-7.jpeg",
  "/images/lil-flea/lf-8.jpeg",
];

const DEFAULT_CONFIG = {
  event_name: "The Lil Flea",
  hero_title: "We're Live at The Lil Flea 🎨",
  hero_subtitle: "Get your caricature made in minutes",
  venue: "Jio World Garden, BKC, Mumbai",
  dates: "Apr 3–5 & Apr 10–12",
  time: "From 3 PM onwards",
  ticket_url: "https://www.thelilflea.com/book-tickets-mumbai/",
  district_app_url: "https://play.google.com/store/apps/details?id=com.application.zomato.district&pcampaignid=web_share",
  maps_url: "https://maps.app.goo.gl/UCwiCob2ikenav397",
  whatsapp_number: "919819731040",
  show_district: true,
  splash_line1: "We're Coming to",
  splash_line2: "The Lil Flea!",
  splash_line3: "Come, Visit Our Stall",
  splash_line4: "See You There! 🎨",
  splash_enabled: true,
  splash_sound_url: "/sounds/lil-flea-splash.wav",
  show_footer_link: true,
  footer_link_text: "🎪 Lil Flea Live",
  page_closed: false,
  close_message: "Thank you for joining The Lil Flea and connecting with Live Caricature!",
  instagram_id: "creativecaricatureclub",
  email: "info@creativecaricatureclub.com",
};

type EventConfig = typeof DEFAULT_CONFIG;

/* ─── Typewriter ─── */
const Typewriter = ({ text, delay = 0, speed = 50, className = "", onDone }: {
  text: string; delay?: number; speed?: number; className?: string; onDone?: () => void;
}) => {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) { onDone?.(); return; }
    const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed, onDone]);

  return (
    <span className={className}>
      {displayed}
      {started && displayed.length < text.length && (
        <span className="inline-block w-[3px] h-[1em] bg-current ml-0.5 align-middle animate-pulse" />
      )}
    </span>
  );
};

/* ─── Splash Screen — lightweight, instant audio ─── */
const LilFleaSplash = ({ onComplete, config }: { onComplete: () => void; config: EventConfig }) => {
  const [phase, setPhase] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) {
      onComplete();
      return;
    }

    // Create audio element immediately and try to play
    const soundUrl = config.splash_sound_url || "/sounds/lil-flea-splash.wav";
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    audio.preload = "auto";
    audioRef.current = audio;

    // Try autoplay immediately
    const tryPlay = () => {
      audio.play().catch(() => {});
    };
    tryPlay();

    // Also play on first interaction as fallback
    const onInteract = () => {
      if (audio.paused) audio.play().catch(() => {});
      document.removeEventListener("touchstart", onInteract);
      document.removeEventListener("click", onInteract);
    };
    document.addEventListener("touchstart", onInteract, { once: true, passive: true });
    document.addEventListener("click", onInteract, { once: true });

    // Preload images
    EVENT_IMAGES.forEach(src => { const img = new Image(); img.src = src; });

    // Phase timeline — fast & smooth
    const timers = [
      setTimeout(() => setPhase(1), 100),     // gates open
      setTimeout(() => setPhase(2), 1400),     // typewriter text
      setTimeout(() => setPhase(3), 3800),     // date pills
      setTimeout(() => setPhase(4), 5200),     // photo mosaic (logo stays visible)
      setTimeout(() => setPhase(5), 8500),     // final message
      setTimeout(() => setPhase(6), 11000),    // fade out
      setTimeout(() => {
        sessionStorage.setItem("lf_splash_done", "1");
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        onComplete();
      }, 11800),
    ];

    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("touchstart", onInteract);
      document.removeEventListener("click", onInteract);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [config.splash_enabled, config.splash_sound_url, onComplete]);

  if (sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) return null;

  const imgPositions = [
    "top-[8%] left-[5%] w-20 h-20 rotate-[-8deg]",
    "top-[5%] right-[8%] w-24 h-24 rotate-[5deg]",
    "top-[35%] left-[3%] w-22 h-22 rotate-[6deg]",
    "top-[38%] right-[4%] w-20 h-20 rotate-[-10deg]",
    "bottom-[30%] left-[8%] w-24 h-24 rotate-[-5deg]",
    "bottom-[28%] right-[6%] w-20 h-20 rotate-[8deg]",
    "bottom-[8%] left-[15%] w-22 h-22 rotate-[4deg]",
    "bottom-[5%] right-[12%] w-24 h-24 rotate-[-7deg]",
    "top-[20%] left-[35%] w-20 h-20 rotate-[-3deg]",
  ];

  return (
    <AnimatePresence>
      {phase < 6 && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
          style={{ background: "hsl(var(--background))", perspective: "1200px", fontFamily: "'Nunito', sans-serif" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Gate doors */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 z-30"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              transformOrigin: "left center",
            }}
            initial={{ rotateY: 0 }}
            animate={phase >= 1 ? { rotateY: -90 } : {}}
            transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 z-30"
            style={{
              background: "linear-gradient(225deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              transformOrigin: "right center",
            }}
            initial={{ rotateY: 0 }}
            animate={phase >= 1 ? { rotateY: 90 } : {}}
            transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          />

          {/* Center content */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
            {/* Logo — ALWAYS visible (z-40) */}
            <motion.div
              className="z-40 relative"
              initial={{ scale: 0, opacity: 0 }}
              animate={phase >= 1 ? {
                scale: phase >= 4 ? 0.5 : 1,
                opacity: 1,
                y: phase >= 2 ? -80 : 0,
              } : {}}
              transition={{ delay: 0.3, type: "spring", stiffness: 120, damping: 14 }}
            >
              <div
                className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-[3px] p-1"
                style={{
                  borderColor: "hsl(var(--accent) / 0.5)",
                  background: "hsl(var(--background))",
                  boxShadow: "0 0 40px hsl(var(--accent) / 0.2)",
                }}
              >
                <img src="/logo.png" alt="Creative Caricature Club™" className="w-full h-full rounded-full object-cover" />
              </div>
            </motion.div>

            {/* Phase 2: Typewriter text */}
            {phase >= 2 && phase < 5 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-2 z-40 relative"
              >
                <p className="text-lg md:text-2xl font-bold mb-2 text-muted-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <Typewriter text={config.splash_line1} speed={50} />
                </p>
                <h1 className="text-4xl md:text-6xl font-black leading-tight text-foreground" style={{ fontFamily: "'Dancing Script', cursive" }}>
                  <Typewriter text={config.splash_line2} delay={1000} speed={70} />
                </h1>
              </motion.div>
            )}

            {/* Phase 3: Date/venue pills */}
            {phase >= 3 && phase < 4 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mt-4 z-40"
              >
                <p className="text-base md:text-xl font-bold text-accent mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <Typewriter text={config.splash_line3} speed={40} />
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[config.dates, config.time, config.venue].map((text, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.15, type: "spring" }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground"
                    >
                      {["📅", "⏰", "📍"][i]} {text}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase 4: Photo mosaic — images around edges, logo stays center */}
            {phase >= 4 && phase < 5 && (
              <>
                {imgPositions.map((pos, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 18 }}
                    className={`absolute ${pos} rounded-xl overflow-hidden shadow-lg border-2 border-background z-10`}
                  >
                    <img src={EVENT_IMAGES[i % EVENT_IMAGES.length]} alt="" className="w-full h-full object-cover" />
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="z-40 mt-4 px-6 py-3 rounded-2xl bg-background/90 backdrop-blur-sm shadow-lg"
                >
                  <p className="text-xl md:text-3xl font-black text-center text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    ✨ Live Caricatures ✨
                  </p>
                </motion.div>
              </>
            )}

            {/* Phase 5: Final message */}
            {phase >= 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6 bg-background/95"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent/40 p-0.5 bg-background mb-4">
                  <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-center text-foreground leading-tight" style={{ fontFamily: "'Dancing Script', cursive" }}>
                  <Typewriter text={config.splash_line4} speed={60} />
                </h2>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 100 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="h-[3px] rounded-full mt-4 bg-gradient-to-r from-primary to-accent"
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const EXPERIENCE_CARDS = [
  { title: "Single Caricature", desc: "Your personality captured in a fun, unique sketch", icon: Sparkles, gradient: "from-rose-100 to-pink-50 dark:from-rose-950 dark:to-pink-950", iconColor: "text-rose-500" },
  { title: "Couple Caricature", desc: "A memorable sketch for two — perfect keepsake", icon: Heart, gradient: "from-violet-100 to-purple-50 dark:from-violet-950 dark:to-purple-950", iconColor: "text-violet-500" },
  { title: "Family Caricature", desc: "The whole family in one beautiful portrait", icon: Users, gradient: "from-sky-100 to-blue-50 dark:from-sky-950 dark:to-blue-950", iconColor: "text-sky-500" },
  { title: "Color & B&W", desc: "Vibrant colors or classic black & white — your call", icon: Palette, gradient: "from-amber-100 to-yellow-50 dark:from-amber-950 dark:to-yellow-950", iconColor: "text-amber-500" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Visit Our Stall", desc: "Find us at the event — look for the big Caricature sign!", emoji: "📍" },
  { step: "02", title: "Sit & Get Sketched", desc: "Relax while our artist captures your likeness in minutes", emoji: "🎨" },
  { step: "03", title: "Take It Home", desc: "Walk away with a unique, hand-drawn caricature memento", emoji: "🖼️" },
];

/* ─── 3D Flash Card ─── */
const FlashCard3D = ({ card, index }: { card: typeof EXPERIENCE_CARDS[0]; index: number }) => {
  const [flipped, setFlipped] = useState(false);
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="h-52 cursor-pointer"
      style={{ perspective: "800px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}
      >
        <div
          className={`absolute inset-0 rounded-2xl p-5 flex flex-col justify-between bg-gradient-to-br ${card.gradient} border border-border/50 shadow-md`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className={`w-12 h-12 rounded-xl bg-background/70 flex items-center justify-center ${card.iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">{card.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">Tap to flip ↻</p>
          </div>
        </div>
        <div
          className={`absolute inset-0 rounded-2xl p-5 flex flex-col items-center justify-center text-center bg-gradient-to-br ${card.gradient} border border-border/50 shadow-md`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Icon className={`w-10 h-10 mb-2 ${card.iconColor}`} />
          <h3 className="text-base font-black text-foreground mb-1">{card.title}</h3>
          <p className="text-sm text-muted-foreground">{card.desc}</p>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── CSS Marquee Row (no framer-motion animation = no lag) ─── */
const MarqueeRow = ({ images, direction = "left", duration = 25 }: { images: string[]; direction?: "left" | "right"; duration?: number }) => {
  const tripled = [...images, ...images, ...images];
  const animName = direction === "left" ? "marquee-left" : "marquee-right";

  return (
    <div className="overflow-hidden relative py-1">
      <div
        className="flex gap-3"
        style={{
          animation: `${animName} ${duration}s linear infinite`,
          width: "max-content",
        }}
      >
        {tripled.map((img, i) => (
          <div key={i} className="flex-shrink-0 w-32 md:w-44 h-20 md:h-28 rounded-xl overflow-hidden shadow-sm border border-border/30">
            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Thank You / Notify Popup ─── */
const ThankYouPopup = ({ config, onClose }: { config: EventConfig; onClose: () => void }) => {
  const [showNotify, setShowNotify] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ name: "", mobile: "", instagram_id: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleNotify = async () => {
    if (!notifyForm.name || !notifyForm.mobile) {
      toast({ title: "Please enter name and mobile", variant: "destructive" });
      return;
    }
    setSending(true);
    await supabase.from("lil_flea_notify_users" as any).insert({
      name: notifyForm.name,
      mobile: notifyForm.mobile,
      instagram_id: notifyForm.instagram_id || null,
    });
    setSent(true);
    setSending(false);
    toast({ title: "You'll be notified for the next event! 🎉" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 30 }}
        className="bg-card rounded-3xl p-8 max-w-md w-full shadow-2xl border border-border text-center"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        {!showNotify && !sent && (
          <>
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent/40 p-0.5 bg-background mx-auto mb-4">
              <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2">Thank You! 🎨</h3>
            <p className="text-muted-foreground text-sm mb-6">{config.close_message}</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowNotify(true)} className="rounded-full gap-2 bg-accent text-accent-foreground font-bold">
                🔔 Notify Me for Next Event
              </Button>
              <Button variant="outline" onClick={onClose} className="rounded-full text-muted-foreground">
                Close
              </Button>
            </div>
          </>
        )}
        {showNotify && !sent && (
          <>
            <h3 className="text-xl font-black text-foreground mb-4">Get Notified 🔔</h3>
            <div className="space-y-3 mb-4">
              <Input placeholder="Your Name *" value={notifyForm.name} onChange={e => setNotifyForm({ ...notifyForm, name: e.target.value })} className="rounded-xl h-11" />
              <Input placeholder="Mobile Number *" value={notifyForm.mobile} onChange={e => setNotifyForm({ ...notifyForm, mobile: e.target.value })} className="rounded-xl h-11" />
              <Input placeholder="Instagram ID (optional)" value={notifyForm.instagram_id} onChange={e => setNotifyForm({ ...notifyForm, instagram_id: e.target.value })} className="rounded-xl h-11" />
            </div>
            <Button onClick={handleNotify} disabled={sending} className="w-full rounded-full gap-2 bg-accent text-accent-foreground font-bold">
              {sending ? "Saving..." : "Notify Me 🔔"}
            </Button>
          </>
        )}
        {sent && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-black text-foreground mb-2">You're On the List!</h3>
            <p className="text-muted-foreground text-sm mb-4">We'll notify you when the next Lil Flea event is announced!</p>
            <Button variant="outline" onClick={onClose} className="rounded-full">Close</Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

/* ─── Gallery Image Lightbox (used in gallery section) ─── */
const GalleryLightbox = ({ images, startIdx, onClose }: { images: string[]; startIdx: number; onClose: () => void }) => {
  const [idx, setIdx] = useState(startIdx);
  const len = images.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % len);
      else if (e.key === "ArrowLeft") setIdx(i => (i - 1 + len) % len);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [len, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-background/80 hover:text-background" aria-label="Close"><X className="w-7 h-7" /></button>
      <button
        onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + len) % len); }}
        className="absolute left-3 z-10 w-10 h-10 rounded-full bg-background/20 flex items-center justify-center text-background/80 hover:bg-background/30"
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % len); }}
        className="absolute right-3 z-10 w-10 h-10 rounded-full bg-background/20 flex items-center justify-center text-background/80 hover:bg-background/30"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      <img
        key={idx}
        src={images[idx]}
        alt="Gallery preview"
        className="max-w-[92vw] max-h-[85vh] object-contain rounded-2xl"
        onClick={e => e.stopPropagation()}
      />
      <p className="absolute bottom-5 text-sm text-background/50 font-semibold">{idx + 1} / {len}</p>
    </motion.div>
  );
};

/* ─── Main Page ─── */
const LilFlea = () => {
  const [splashDone, setSplashDone] = useState(!!sessionStorage.getItem("lf_splash_done"));
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const [showThankYou, setShowThankYou] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Disable zoom on this page
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute("content") || "";
    meta?.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
    const preventZoom = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener("touchmove", preventZoom, { passive: false });
    return () => {
      meta?.setAttribute("content", original || "width=device-width, initial-scale=1.0");
      document.removeEventListener("touchmove", preventZoom);
    };
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from("admin_site_settings").select("*").eq("id", "lil_flea_config").maybeSingle();
      if (data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
    };

    fetchConfig();

    const channel = supabase
      .channel("lil-flea-page-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings", filter: "id=eq.lil_flea_config" }, () => {
        fetchConfig();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchGallery = async () => {
      const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
      if (data && data.length > 0) setGalleryImages(data as any[]);
    };

    fetchGallery();

    const channel = supabase
      .channel("lil-flea-page-gallery")
      .on("postgres_changes", { event: "*", schema: "public", table: "lil_flea_gallery" }, () => {
        fetchGallery();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (!splashDone || !config.page_closed) return;
    const handler = () => {
      if (!sessionStorage.getItem("lf_thankyou_shown")) {
        setShowThankYou(true);
        sessionStorage.setItem("lf_thankyou_shown", "1");
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [splashDone, config.page_closed]);

  const allImages = galleryImages.length > 0 ? galleryImages.map(g => g.image_url) : EVENT_IMAGES;
  const row1 = allImages.slice(0, Math.ceil(allImages.length / 3));
  const row2 = allImages.slice(Math.ceil(allImages.length / 3), Math.ceil(allImages.length * 2 / 3));
  const row3 = allImages.slice(Math.ceil(allImages.length * 2 / 3));

  if (config.page_closed && splashDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent/40 p-0.5 bg-background mx-auto mb-6">
            <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-4">Thank You! 🎨</h1>
          <p className="text-muted-foreground mb-8">{config.close_message}</p>
          <Button onClick={() => setShowThankYou(true)} className="rounded-full gap-2 bg-accent text-accent-foreground font-bold">
            🔔 Notify Me for Next Event
          </Button>
          <AnimatePresence>
            {showThankYou && <ThankYouPopup config={config} onClose={() => setShowThankYou(false)} />}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`Live Caricature at ${config.event_name} Mumbai | Creative Caricature Club™`}
        description={`Get your caricature made live at ${config.event_name} Mumbai! Creative Caricature Club™ brings professional caricature artists to ${config.venue}.`}
        canonical="/lil-flea"
        image="/images/lil-flea/lf-3.jpeg"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: `Live Caricature at ${config.event_name} Mumbai`,
            startDate: "2025-04-03T15:00:00+05:30",
            endDate: "2025-04-12T23:00:00+05:30",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            location: { "@type": "Place", name: config.venue, address: { "@type": "PostalAddress", addressLocality: "Mumbai", addressRegion: "Maharashtra", addressCountry: "IN" } },
            image: ["/images/lil-flea/lf-3.jpeg"],
            description: `Get your caricature made live by professional artists at ${config.event_name} Mumbai.`,
            organizer: { "@type": "Organization", name: "Creative Caricature Club™", url: "https://portal.creativecaricatureclub.com" },
            offers: { "@type": "Offer", url: config.ticket_url, availability: "https://schema.org/InStock" },
          }),
        }}
      />

      {/* Marquee CSS keyframes */}
      <style>{`
        @keyframes marquee-left { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
        @keyframes marquee-right { 0% { transform: translateX(-33.33%); } 100% { transform: translateX(0); } }
      `}</style>

      {!splashDone && <LilFleaSplash onComplete={handleSplashComplete} config={config} />}

      {splashDone && (
        <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>

          {/* ─── HERO ─── */}
          <section className="relative min-h-[90svh] flex items-center justify-center overflow-hidden">
            <div className="absolute top-10 left-10 w-60 h-60 rounded-full blur-[100px] bg-rose-200/30 dark:bg-rose-900/20" />
            <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full blur-[80px] bg-violet-200/25 dark:bg-violet-900/15" />

            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-center gap-4 mb-8 flex-wrap">
                <div className="w-14 h-14 rounded-full border-2 overflow-hidden shadow-md p-0.5 border-accent/30 bg-background">
                  <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
                </div>
                <span className="text-lg text-accent/40">✦</span>
                <img src="/images/lil-flea-logo.png" alt={config.event_name} className="h-8 md:h-10 opacity-70" />
              </motion.div>

              <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight tracking-tight">
                {config.hero_title}
              </motion.h1>

              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-base md:text-lg mb-3 text-muted-foreground">
                {config.hero_subtitle}
              </motion.p>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap items-center justify-center gap-2 text-sm mb-8">
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-secondary-foreground"><MapPin className="w-4 h-4 text-accent" /> {config.venue}</span>
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-secondary-foreground"><Calendar className="w-4 h-4 text-accent" /> {config.dates}</span>
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-secondary-foreground"><Clock className="w-4 h-4 text-accent" /> {config.time}</span>
              </motion.div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full gap-2 px-5 font-bold shadow-md text-base bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 hover:from-rose-500 hover:to-pink-600"
                  onClick={() => window.open(config.ticket_url, "_blank")}
                >
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Button>
                <Button
                  size="lg"
                  className="rounded-full gap-2 px-5 font-bold shadow-md text-base bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0 hover:from-violet-500 hover:to-purple-600"
                  onClick={() => window.open(config.maps_url, "_blank")}
                >
                  <MapPin className="w-5 h-5" /> Event Location
                </Button>
              </motion.div>
            </div>
          </section>

          {/* ─── 3D EXPERIENCE FLASH CARDS ─── */}
          <section className="py-14 md:py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Caricature Experience</p>
                <h2 className="text-2xl md:text-4xl font-black">On-Spot Caricatures with<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-500">Live Interaction</span></h2>
                <p className="text-muted-foreground mt-2 text-sm md:text-base">With our professional artists — come to {config.event_name}!</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                {EXPERIENCE_CARDS.map((card, i) => (
                  <FlashCard3D key={card.title} card={card} index={i} />
                ))}
              </div>
            </div>
          </section>

          {/* ─── MEMORIES — auto-scroll marquee, no buttons ─── */}
          <section className="py-14 md:py-20 bg-secondary/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Memories</p>
                <h2 className="text-2xl md:text-4xl font-black">Our Lil Flea Recaps 📸</h2>
                <p className="text-muted-foreground mt-2 text-sm">Your caricature, sketched in 3–5 minutes — relive the magic!</p>
              </div>
              <div className="max-w-6xl mx-auto space-y-2">
                <MarqueeRow images={EVENT_IMAGES.slice(0, 5)} direction="left" duration={22} />
                <MarqueeRow images={EVENT_IMAGES.slice(3, 8)} direction="right" duration={28} />
              </div>
            </div>
          </section>

          {/* ─── GALLERY — clickable images with lightbox ─── */}
          <section className="py-14 md:py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Gallery</p>
                <h2 className="text-2xl md:text-4xl font-black">Our Lil Flea Memories 🖼️</h2>
              </div>
              <div className="max-w-6xl mx-auto space-y-2">
                <MarqueeRow images={row1.length > 0 ? row1 : EVENT_IMAGES.slice(0, 3)} direction="left" duration={30} />
                <MarqueeRow images={row2.length > 0 ? row2 : EVENT_IMAGES.slice(3, 6)} direction="right" duration={35} />
                <MarqueeRow images={row3.length > 0 ? row3 : EVENT_IMAGES.slice(6)} direction="left" duration={26} />
              </div>

              {/* Clickable grid preview */}
              <div className="max-w-5xl mx-auto mt-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {allImages.slice(0, 10).map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-border/30 shadow-sm hover:shadow-lg transition-shadow"
                    onClick={() => setLightboxIdx(i)}
                  >
                    <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>

              <div className="text-center mt-6">
                <Button
                  variant="outline"
                  className="rounded-full gap-2 border-accent/30 text-accent font-bold px-8"
                  onClick={() => window.open("/lil-flea-gallery", "_blank")}
                >
                  All Images <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* ─── HOW IT WORKS ─── */}
          <section className="py-14 md:py-20 bg-secondary/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Simple Process</p>
                <h2 className="text-2xl md:text-4xl font-black">How It Works</h2>
              </div>
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
                {HOW_IT_WORKS.map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="rounded-2xl p-6 bg-card border border-border shadow-sm text-center"
                  >
                    <div className="text-3xl mb-3">{item.emoji}</div>
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs font-black text-accent">{item.step}</span>
                    </div>
                    <h3 className="text-base font-black mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── PRICING ─── */}
          <section className="py-14 md:py-18">
            <div className="container mx-auto px-4 text-center max-w-2xl">
              <div className="rounded-2xl p-7 bg-gradient-to-br from-rose-50 via-violet-50 to-amber-50 border border-border shadow-sm">
                <Palette className="w-10 h-10 text-accent mx-auto mb-3" />
                <h2 className="text-xl md:text-2xl font-black mb-2">Caricatures Available Live 🎨</h2>
                <p className="text-muted-foreground text-sm">Visit us at our stall to experience & get yours made instantly!</p>
              </div>
            </div>
          </section>

          {/* ─── SOCIAL PROOF ─── */}
          <section className="py-14 md:py-20 bg-secondary/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Happy Customers</p>
                <h2 className="text-2xl md:text-4xl font-black">Reactions That Speak ❤️</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {EVENT_IMAGES.slice(0, 3).map((img, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-border shadow-sm">
                    <img src={img} alt={`Customer reaction ${i + 1}`} className="w-full h-44 md:h-56 object-cover" loading="lazy" />
                    <div className="p-4 bg-card">
                      <div className="flex gap-0.5 mb-1">{Array.from({ length: 5 }).map((_, s) => <Star key={s} className="w-3.5 h-3.5 fill-current text-amber-400" />)}</div>
                      <p className="text-sm text-muted-foreground">"Amazing experience! Got our caricature done in minutes!"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── TICKETS ─── */}
          <section className="py-14 md:py-18">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="text-center mb-10">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Get Entry</p>
                <h2 className="text-2xl md:text-4xl font-black">Book Your Entry Tickets 🎟️</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl p-6 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 shadow-sm text-center">
                  <img src="/images/lil-flea-logo.png" alt={config.event_name} className="h-10 mx-auto mb-3 opacity-80" />
                  <h3 className="text-lg font-black mb-1">Book on {config.event_name}</h3>
                  <p className="text-sm text-muted-foreground mb-5">Official event website — secure your entry passes</p>
                  <Button
                    className="rounded-full gap-2 font-bold px-6 bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 shadow-md"
                    onClick={() => window.open(config.ticket_url, "_blank")}
                  >
                    <Ticket className="w-4 h-4" /> Book Tickets <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>

                {config.show_district && (
                  <div className="rounded-2xl p-6 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 shadow-sm text-center">
                    <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-3 shadow-sm">
                      <img src="/images/district-logo-coloured.png" alt="District by Zomato" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-lg font-black mb-1">Book on District App</h3>
                    <p className="text-sm text-muted-foreground mb-5">Also available on the District app by Zomato</p>
                    <Button
                      className="rounded-full gap-2 font-bold px-6 bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0 shadow-md"
                      onClick={() => window.open(config.district_app_url, "_blank")}
                    >
                      <Download className="w-4 h-4" /> Get App <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ─── FINAL CTA ─── */}
          <section className="py-14 md:py-20 bg-gradient-to-b from-secondary/30 to-background">
            <div className="container mx-auto px-4 text-center max-w-3xl">
              <h2 className="text-2xl md:text-4xl font-black mb-3">
                Catch Us <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-500">LIVE</span> at {config.event_name}
              </h2>
              <p className="mb-8 text-sm md:text-base text-muted-foreground">Before it ends! {config.dates} at {config.venue}</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="rounded-full gap-2 shadow-md px-5 font-bold bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0" onClick={() => window.open(config.maps_url, "_blank")}>
                  <MapPin className="w-5 h-5" /> Get Directions
                </Button>
                <Button size="lg" className="rounded-full gap-2 px-5 font-bold bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0" onClick={() => window.open(config.ticket_url, "_blank")}>
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Button>
              </div>
            </div>
          </section>

          {/* ─── BOOK US — buttons only ─── */}
          <section id="book-us" className="py-14 md:py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="rounded-2xl p-7 md:p-10 bg-gradient-to-br from-rose-50 via-amber-50 to-violet-50 border border-border shadow-sm text-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <h2 className="text-xl md:text-3xl font-black mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>Want to Book Us for Your Event?</h2>
                <p className="text-muted-foreground text-sm md:text-base mb-6" style={{ fontFamily: "'Nunito', sans-serif" }}>Or order a custom caricature delivered to your home 🏠</p>

                <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                  <a href={`https://wa.me/${config.whatsapp_number}`} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold text-sm">
                    <Phone className="w-4 h-4" /> WhatsApp
                  </a>
                  <a href={`https://www.instagram.com/${config.instagram_id}/`} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 border border-pink-200 text-pink-700 font-semibold text-sm">
                    <Instagram className="w-4 h-4" /> @{config.instagram_id}
                  </a>
                  <a href={`mailto:${config.email}`} className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-semibold text-sm">
                    <Mail className="w-4 h-4" /> Email Us
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button size="lg" className="rounded-full gap-2 px-6 font-bold bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 shadow-md" onClick={() => window.open("/book-event", "_self")}>
                    <Calendar className="w-5 h-5" /> Event Booking
                  </Button>
                  <Button size="lg" className="rounded-full gap-2 px-6 font-bold bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0 shadow-md" onClick={() => window.open("/order", "_self")}>
                    <Palette className="w-5 h-5" /> Custom Caricature Order
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-6 border-t border-border">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Creative Caricature Club™. All rights reserved.</p>
              <p className="mt-1">Event collaboration with {config.event_name}</p>
            </div>
          </footer>
        </div>
      )}

      {/* Gallery Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <GalleryLightbox images={allImages} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
        )}
      </AnimatePresence>

      {/* Thank You Popup */}
      <AnimatePresence>
        {showThankYou && <ThankYouPopup config={config} onClose={() => setShowThankYou(false)} />}
      </AnimatePresence>
    </>
  );
};

export default LilFlea;
