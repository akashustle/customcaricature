import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, Ticket, Phone, X, ChevronLeft, ChevronRight, Instagram, ExternalLink, Sparkles, Users, Palette, Heart, Star, Download, Mail, Send } from "lucide-react";
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
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[3px] h-[1em] bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
};

/* ─── Splash Screen ─── */
const LilFleaSplash = ({ onComplete, config }: { onComplete: () => void; config: EventConfig }) => {
  const [phase, setPhase] = useState(0);
  const [ready, setReady] = useState(false);
  const [userTapped, setUserTapped] = useState(false);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) {
      onComplete();
      return;
    }
    // Preload images
    EVENT_IMAGES.forEach(src => { const img = new Image(); img.src = src; });
    
    if (document.readyState === "complete") {
      setReady(true);
    } else {
      const onLoad = () => setReady(true);
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, [config.splash_enabled, onComplete]);

  // Play sound after user interaction (autoplay policy)
  const playSound = useCallback(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    try {
      const soundUrl = config.splash_sound_url || "/sounds/lil-flea-splash.wav";
      soundRef.current = new Audio(soundUrl);
      soundRef.current.volume = 0.5;
      soundRef.current.play().catch(() => {});
    } catch {}
  }, [config.splash_sound_url]);

  // Try playing on first user interaction
  useEffect(() => {
    if (!ready) return;
    const handler = () => {
      playSound();
      setUserTapped(true);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
    // Also try immediately (some browsers allow it)
    playSound();
    document.addEventListener("touchstart", handler, { once: true, passive: true });
    document.addEventListener("click", handler, { once: true });
    document.addEventListener("keydown", handler, { once: true });
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [ready, playSound]);

  useEffect(() => {
    if (!ready) return;
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 4200),
      setTimeout(() => setPhase(4), 5800),
      setTimeout(() => setPhase(5), 9200),
      setTimeout(() => setPhase(6), 12000),
      setTimeout(() => {
        sessionStorage.setItem("lf_splash_done", "1");
        if (soundRef.current) { soundRef.current.pause(); soundRef.current = null; }
        onComplete();
      }, 12800),
    ];
    return () => { timers.forEach(clearTimeout); if (soundRef.current) { soundRef.current.pause(); } };
  }, [ready, onComplete]);

  if (!ready || sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) return null;

  /* Image mosaic positions — scattered grid pattern */
  const imgGrid = [
    { col: 0, row: 0, r: -8 },
    { col: 1, row: 0, r: 5 },
    { col: 2, row: 0, r: -3 },
    { col: 0, row: 1, r: 6 },
    { col: 1, row: 1, r: -10 },
    { col: 2, row: 1, r: 4 },
    { col: 0, row: 2, r: -5 },
    { col: 1, row: 2, r: 8 },
    { col: 2, row: 2, r: -7 },
  ];

  return (
    <AnimatePresence>
      {phase < 6 && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
          style={{ background: "hsl(var(--background))", perspective: "1200px" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          onClick={() => { playSound(); setUserTapped(true); }}
        >
          {/* Gate doors */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 z-30"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              transformOrigin: "left center",
              boxShadow: "10px 0 40px rgba(0,0,0,0.2)",
            }}
            initial={{ rotateY: 0 }}
            animate={phase >= 1 ? { rotateY: -90 } : {}}
            transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="absolute inset-0 flex items-center justify-end pr-8">
              <span className="text-4xl">🎨</span>
            </div>
          </motion.div>
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 z-30"
            style={{
              background: "linear-gradient(225deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              transformOrigin: "right center",
              boxShadow: "-10px 0 40px rgba(0,0,0,0.2)",
            }}
            initial={{ rotateY: 0 }}
            animate={phase >= 1 ? { rotateY: 90 } : {}}
            transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="absolute inset-0 flex items-center justify-start pl-8">
              <span className="text-4xl">✏️</span>
            </div>
          </motion.div>

          {/* Center content behind gates */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
            {/* Phase 1: Logo reveal */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={phase >= 1 ? { scale: phase >= 2 ? 0.6 : 1, opacity: 1, y: phase >= 2 ? -100 : 0 } : {}}
              transition={{ delay: 0.4, type: "spring", stiffness: 120, damping: 14 }}
            >
              <div
                className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-[3px] p-1"
                style={{
                  borderColor: "hsl(var(--accent) / 0.5)",
                  boxShadow: "0 0 60px hsl(var(--accent) / 0.25), 0 0 120px hsl(var(--primary) / 0.1)",
                  background: "hsl(var(--background))",
                }}
              >
                <img src="/logo.png" alt="Creative Caricature Club" className="w-full h-full rounded-full object-cover" />
              </div>
            </motion.div>

            {/* Phase 2: Big Typewriter text */}
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-4"
              >
                <p className="text-xl md:text-3xl font-bold mb-3 text-muted-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <Typewriter text={config.splash_line1} speed={55} />
                </p>
                <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.05] text-foreground" style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "-0.03em" }}>
                  <Typewriter text={config.splash_line2} delay={1200} speed={75} />
                </h1>
              </motion.div>
            )}

            {/* Phase 3: Date/time + line 3 */}
            {phase >= 3 && phase < 4 && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring" }}
                className="text-center mt-6"
              >
                <p className="text-lg md:text-2xl font-bold text-accent mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <Typewriter text={config.splash_line3} speed={45} />
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {[
                    { icon: "📅", text: config.dates },
                    { icon: "⏰", text: config.time },
                    { icon: "📍", text: config.venue },
                  ].map((item, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.2, type: "spring" }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-secondary text-secondary-foreground"
                    >
                      {item.icon} {item.text}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase 4: Photo mosaic — 3x3 grid popping in */}
            {phase >= 4 && phase < 5 && (
              <motion.div
                className="absolute inset-0 z-10 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="grid grid-cols-3 gap-2 md:gap-3 w-[85vw] md:w-[60vw] max-w-[500px]">
                  {imgGrid.map((pos, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, rotate: pos.r * 3 }}
                      animate={{ opacity: 1, scale: 1, rotate: pos.r }}
                      transition={{ delay: i * 0.1, type: "spring", stiffness: 150, damping: 15 }}
                      className="rounded-xl overflow-hidden shadow-xl border-2 border-background aspect-square"
                    >
                      <img src={EVENT_IMAGES[i]} alt="" className="w-full h-full object-cover" loading="eager" />
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="px-8 py-4 rounded-2xl bg-background/90 backdrop-blur-md shadow-xl">
                    <p className="text-2xl md:text-4xl font-black text-center text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      ✨ Live Caricatures ✨
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Phase 5: Final message */}
            {phase >= 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 bg-background/95"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent/40 p-0.5 bg-background mb-6"
                >
                  <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
                </motion.div>
                <h2 className="text-4xl md:text-6xl font-black text-center text-foreground leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <Typewriter text={config.splash_line4} speed={65} />
                </h2>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 120 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="h-[3px] rounded-full mt-6 bg-gradient-to-r from-primary to-accent"
                />
              </motion.div>
            )}
          </div>

          {/* Tap hint for sound (mobile) */}
          {!userTapped && phase >= 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 text-xs font-medium px-4 py-2 rounded-full bg-muted text-muted-foreground"
            >
              Tap for sound 🔊
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const EXPERIENCE_CARDS = [
  { title: "Single Caricature", desc: "Your personality captured in a fun, unique sketch", icon: Sparkles, gradient: "from-rose-100 to-pink-50", iconColor: "text-rose-500" },
  { title: "Couple Caricature", desc: "A memorable sketch for two — perfect keepsake", icon: Heart, gradient: "from-violet-100 to-purple-50", iconColor: "text-violet-500" },
  { title: "Family Caricature", desc: "The whole family in one beautiful portrait", icon: Users, gradient: "from-sky-100 to-blue-50", iconColor: "text-sky-500" },
  { title: "Color & B&W", desc: "Vibrant colors or classic black & white — your call", icon: Palette, gradient: "from-amber-100 to-yellow-50", iconColor: "text-amber-500" },
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
      initial={{ opacity: 0, y: 60, rotateX: -15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
      className="h-56 cursor-pointer group"
      style={{ perspective: "1200px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, type: "spring", stiffness: 80 }}
      >
        <div
          className={`absolute inset-0 rounded-3xl p-6 flex flex-col justify-between bg-gradient-to-br ${card.gradient} border border-border/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className={`w-14 h-14 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm ${card.iconColor}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">{card.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">Tap to flip ↻</p>
          </div>
        </div>
        <div
          className={`absolute inset-0 rounded-3xl p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br ${card.gradient} border border-border/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Icon className={`w-12 h-12 mb-3 ${card.iconColor}`} />
          <h3 className="text-lg font-black text-foreground mb-2">{card.title}</h3>
          <p className="text-sm text-muted-foreground">{card.desc}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Marquee Row (no buttons, auto-scroll) ─── */
const MarqueeRow = ({ images, direction = "left", speed = 30 }: { images: string[]; direction?: "left" | "right"; speed?: number }) => {
  const tripled = [...images, ...images, ...images];
  return (
    <div className="overflow-hidden relative py-1">
      <motion.div
        className="flex gap-3"
        animate={{ x: direction === "left" ? ["0%", "-33.33%"] : ["-33.33%", "0%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {tripled.map((img, i) => (
          <div key={i} className="flex-shrink-0 w-36 md:w-48 h-24 md:h-32 rounded-2xl overflow-hidden shadow-md border border-border/30">
            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </motion.div>
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

/* ─── Main Page ─── */
const LilFlea = () => {
  const [splashDone, setSplashDone] = useState(!!sessionStorage.getItem("lf_splash_done"));
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const [showThankYou, setShowThankYou] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Disable zoom on this page
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute("content") || "";
    meta?.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
    // Prevent touch zoom
    const preventZoom = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener("touchmove", preventZoom, { passive: false });
    return () => {
      meta?.setAttribute("content", original || "width=device-width, initial-scale=1.0");
      document.removeEventListener("touchmove", preventZoom);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_site_settings").select("*").eq("id", "lil_flea_config").maybeSingle();
      if (data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
      if (data && data.length > 0) setGalleryImages(data as any[]);
    })();
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
        title={`Live Caricature at ${config.event_name} Mumbai | Creative Caricature Club`}
        description={`Get your caricature made live at ${config.event_name} Mumbai! Creative Caricature Club brings professional caricature artists to ${config.venue}.`}
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
            organizer: { "@type": "Organization", name: "Creative Caricature Club", url: "https://portal.creativecaricatureclub.com" },
            offers: { "@type": "Offer", url: config.ticket_url, availability: "https://schema.org/InStock" },
          }),
        }}
      />

      {!splashDone && <LilFleaSplash onComplete={handleSplashComplete} config={config} />}

      {splashDone && (
        <div className="min-h-screen bg-background text-foreground overscroll-none" style={{ fontFamily: "'Nunito', sans-serif" }}>

          {/* ─── HERO ─── */}
          <section ref={heroRef} className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
            <motion.div style={{ y: heroY }} className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
            </motion.div>

            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.22, 0.12] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-10 left-10 w-80 h-80 rounded-full blur-[120px] bg-rose-300/40" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} className="absolute bottom-20 right-10 w-60 h-60 rounded-full blur-[100px] bg-violet-300/30" />
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 6, repeat: Infinity, delay: 2 }} className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full blur-[130px] bg-amber-200/30" />

            <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center px-4 max-w-4xl mx-auto">
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-center gap-4 mb-8 flex-wrap">
                <div className="w-16 h-16 rounded-full border-2 overflow-hidden shadow-lg p-0.5 border-accent/30 bg-background" style={{ boxShadow: "0 8px 30px hsl(var(--accent) / 0.15)" }}>
                  <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
                </div>
                <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="text-xl text-accent/40">✦</motion.span>
                <img src="/images/lil-flea-logo.png" alt={config.event_name} className="h-9 md:h-11 opacity-70" />
              </motion.div>

              <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, type: "spring" }} className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight tracking-tight">
                {config.hero_title}
              </motion.h1>

              <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="text-lg md:text-xl mb-3 text-muted-foreground">
                {config.hero_subtitle}
              </motion.p>

              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-sm mb-10">
                <span className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full bg-secondary text-secondary-foreground"><MapPin className="w-4 h-4 text-accent" /> {config.venue}</span>
                <span className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full bg-secondary text-secondary-foreground"><Calendar className="w-4 h-4 text-accent" /> {config.dates}</span>
                <span className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full bg-secondary text-secondary-foreground"><Clock className="w-4 h-4 text-accent" /> {config.time}</span>
              </motion.div>

              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                <Button
                  size="lg"
                  className="rounded-full gap-2 px-5 md:px-6 font-bold shadow-lg text-base bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 hover:from-rose-500 hover:to-pink-600"
                  onClick={() => window.open(config.ticket_url, "_blank")}
                >
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Button>
                <Button
                  size="lg"
                  className="rounded-full gap-2 px-5 md:px-6 font-bold shadow-lg text-base bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0 hover:from-violet-500 hover:to-purple-600"
                  onClick={() => window.open(config.maps_url, "_blank")}
                >
                  <MapPin className="w-5 h-5" /> Event Location
                </Button>
              </motion.div>
            </motion.div>
          </section>

          {/* ─── 3D EXPERIENCE FLASH CARDS ─── */}
          <section className="py-16 md:py-24 relative">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 md:mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Caricature Experience</p>
                <h2 className="text-3xl md:text-5xl font-black">On-Spot Caricatures with<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-500">Live Interaction</span></h2>
                <p className="text-muted-foreground mt-3 text-base md:text-lg">With our professional artists — come to {config.event_name}!</p>
              </motion.div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
                {EXPERIENCE_CARDS.map((card, i) => (
                  <FlashCard3D key={card.title} card={card} index={i} />
                ))}
              </div>
            </div>
          </section>

          {/* ─── OUR PREVIOUS LIL FLEA RECAPS ─── */}
          <section className="py-16 md:py-24 relative overflow-hidden bg-secondary/30">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8 md:mb-12">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Memories</p>
                <h2 className="text-3xl md:text-5xl font-black">Our Lil Flea Recaps 📸</h2>
                <p className="text-muted-foreground mt-3">Your caricature, sketched in 3–5 minutes — relive the magic!</p>
              </motion.div>

              {/* Auto-scrolling marquee rows — no buttons */}
              <div className="max-w-6xl mx-auto space-y-3">
                <MarqueeRow images={EVENT_IMAGES.slice(0, 5)} direction="left" speed={25} />
                <MarqueeRow images={EVENT_IMAGES.slice(3, 8)} direction="right" speed={30} />
              </div>
            </div>
          </section>

          {/* ─── GALLERY — Infinite Auto-Scroll 3 Rows ─── */}
          <section className="py-16 md:py-24 relative">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 md:mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Gallery</p>
                <h2 className="text-3xl md:text-5xl font-black">Our Lil Flea Memories 🖼️</h2>
              </motion.div>
              <div className="max-w-6xl mx-auto space-y-3">
                <MarqueeRow images={row1.length > 0 ? row1 : EVENT_IMAGES.slice(0, 3)} direction="left" speed={35} />
                <MarqueeRow images={row2.length > 0 ? row2 : EVENT_IMAGES.slice(3, 6)} direction="right" speed={40} />
                <MarqueeRow images={row3.length > 0 ? row3 : EVENT_IMAGES.slice(6)} direction="left" speed={30} />
              </div>
              <div className="text-center mt-8 md:mt-10">
                <Button
                  variant="outline"
                  className="rounded-full gap-2 border-accent/30 text-accent font-bold px-8"
                  onClick={() => window.open("/lil-flea-gallery", "_blank")}
                >
                  View All Photos <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* ─── HOW IT WORKS ─── */}
          <section className="py-16 md:py-24 relative bg-secondary/30">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Simple Process</p>
                <h2 className="text-3xl md:text-5xl font-black">How It Works</h2>
              </motion.div>
              <div className="max-w-4xl mx-auto relative">
                <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-200 via-violet-200 to-amber-200 -translate-y-1/2 z-0" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative z-10">
                  {HOW_IT_WORKS.map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 50, scale: 0.85 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.2, type: "spring", stiffness: 80 }}
                      className="text-center"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05, y: -8 }}
                        className="rounded-3xl p-6 md:p-8 bg-card border border-border shadow-[0_15px_50px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden"
                      >
                        <div className="text-4xl md:text-5xl mb-4">{item.emoji}</div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent/20 to-primary/10 flex items-center justify-center mx-auto mb-3">
                          <span className="text-sm font-black text-accent">{item.step}</span>
                        </div>
                        <h3 className="text-lg font-black mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── PRICING MESSAGE ─── */}
          <section className="py-16 md:py-20 relative">
            <div className="container mx-auto px-4 text-center max-w-2xl">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                <div className="rounded-3xl p-8 md:p-10 bg-gradient-to-br from-rose-50 via-violet-50 to-amber-50 border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
                  <Palette className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h2 className="text-2xl md:text-3xl font-black mb-3">Caricatures Available Live 🎨</h2>
                  <p className="text-muted-foreground">Visit us at our stall to experience & get yours made instantly by professional artists!</p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ─── SOCIAL PROOF ─── */}
          <section className="py-16 md:py-24 relative bg-secondary/30">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 md:mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Happy Customers</p>
                <h2 className="text-3xl md:text-5xl font-black">Reactions That Speak ❤️</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
                {EVENT_IMAGES.slice(0, 3).map((img, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, type: "spring" }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="rounded-3xl overflow-hidden border border-border shadow-[0_15px_50px_-12px_rgba(0,0,0,0.06)]"
                  >
                    <img src={img} alt={`Customer reaction ${i + 1}`} className="w-full h-48 md:h-64 object-cover" loading="lazy" />
                    <div className="p-4 md:p-5 bg-card">
                      <div className="flex gap-0.5 mb-2">{Array.from({ length: 5 }).map((_, s) => <Star key={s} className="w-4 h-4 fill-current text-amber-400" />)}</div>
                      <p className="text-sm text-muted-foreground">"Amazing experience! Got our caricature done in minutes!"</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── TICKET BOOKING SECTION ─── */}
          <section className="py-16 md:py-20 relative">
            <div className="container mx-auto px-4 max-w-5xl">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 md:mb-12">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Get Entry</p>
                <h2 className="text-3xl md:text-5xl font-black">Book Your Entry Tickets 🎟️</h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] text-center"
                >
                  <img src="/images/lil-flea-logo.png" alt={config.event_name} className="h-12 mx-auto mb-4 opacity-80" />
                  <h3 className="text-xl font-black mb-2">Book on {config.event_name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">Official event website — secure your entry passes</p>
                  <Button
                    className="rounded-full gap-2 font-bold px-8 bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 shadow-lg hover:from-rose-500 hover:to-pink-600"
                    onClick={() => window.open(config.ticket_url, "_blank")}
                  >
                    <Ticket className="w-4 h-4" /> Book Tickets <ExternalLink className="w-3 h-3" />
                  </Button>
                </motion.div>

                {config.show_district && (
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -6, scale: 1.01 }}
                    className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-md">
                      <img src="/images/district-logo-coloured.png" alt="District by Zomato" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-xl font-black mb-1">Book on District App</h3>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <img src="/images/district-app.svg" alt="" className="h-4 opacity-60" /> by Zomato
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">Also available on the District app</p>
                    <Button
                      className="rounded-full gap-2 font-bold px-8 bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0 shadow-lg hover:from-violet-500 hover:to-purple-600"
                      onClick={() => window.open(config.district_app_url, "_blank")}
                    >
                      <Download className="w-4 h-4" /> Get App <ExternalLink className="w-3 h-3" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          {/* ─── FINAL CTA ─── */}
          <section className="py-16 md:py-24 relative bg-gradient-to-b from-secondary/30 to-background">
            <div className="container mx-auto px-4 text-center max-w-3xl">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                <h2 className="text-3xl md:text-5xl font-black mb-4">
                  Catch Us <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-500">LIVE</span> at {config.event_name}
                </h2>
                <p className="mb-8 md:mb-10 text-base md:text-lg text-muted-foreground">Before it ends! {config.dates} at {config.venue}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                  <Button size="lg" className="rounded-full gap-2 shadow-lg px-5 md:px-6 font-bold bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0" onClick={() => window.open(config.maps_url, "_blank")}>
                    <MapPin className="w-5 h-5" /> Get Directions
                  </Button>
                  <Button size="lg" className="rounded-full gap-2 px-5 md:px-6 font-bold bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0" onClick={() => window.open(config.ticket_url, "_blank")}>
                    <Ticket className="w-5 h-5" /> Book Tickets
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ─── BOOK US / CUSTOM ORDER — Buttons only, no form ─── */}
          <section id="book-us" className="py-16 md:py-24 relative">
            <div className="container mx-auto px-4 max-w-4xl">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-rose-50 via-amber-50 to-violet-50 border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] text-center">
                <h2 className="text-2xl md:text-4xl font-black mb-3">Want to Book Us for Your Event?</h2>
                <p className="text-muted-foreground text-base md:text-lg mb-8">Or order a custom caricature delivered to your home 🏠</p>

                {/* Contact */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                  <a href={`https://wa.me/${config.whatsapp_number}`} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold text-sm hover:shadow-md transition-shadow">
                    <Phone className="w-4 h-4" /> WhatsApp
                  </a>
                  <a href={`https://www.instagram.com/${config.instagram_id}/`} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 border border-pink-200 text-pink-700 font-semibold text-sm hover:shadow-md transition-shadow">
                    <Instagram className="w-4 h-4" /> @{config.instagram_id}
                  </a>
                  <a href={`mailto:${config.email}`} className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-semibold text-sm hover:shadow-md transition-shadow">
                    <Mail className="w-4 h-4" /> Email Us
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button
                    size="lg"
                    className="rounded-full gap-2 px-6 md:px-8 font-bold bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 shadow-lg hover:from-rose-500 hover:to-pink-600"
                    onClick={() => window.open("/book-event", "_self")}
                  >
                    <Calendar className="w-5 h-5" /> Event Booking
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-full gap-2 px-6 md:px-8 font-bold bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0 shadow-lg hover:from-violet-500 hover:to-purple-600"
                    onClick={() => window.open("/order", "_self")}
                  >
                    <Palette className="w-5 h-5" /> Custom Caricature Order
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-6 md:py-8 border-t border-border">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Creative Caricature Club. All rights reserved.</p>
              <p className="mt-1">Event collaboration with {config.event_name}</p>
            </div>
          </footer>
        </div>
      )}

      {/* Thank You Popup */}
      <AnimatePresence>
        {showThankYou && <ThankYouPopup config={config} onClose={() => setShowThankYou(false)} />}
      </AnimatePresence>
    </>
  );
};

export default LilFlea;
