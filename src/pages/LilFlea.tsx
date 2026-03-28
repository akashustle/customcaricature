import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, Ticket, Phone, ChevronLeft, ChevronRight, X, Instagram, ExternalLink, Sparkles, Users, Palette, Heart, Star, Download, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";

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
  const soundRef = useRef<HTMLAudioElement | null>(null);

  // Wait for page to fully load before showing splash
  useEffect(() => {
    if (sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) {
      onComplete();
      return;
    }
    if (document.readyState === "complete") {
      setReady(true);
    } else {
      const onLoad = () => setReady(true);
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, [config.splash_enabled, onComplete]);

  useEffect(() => {
    if (!ready) return;
    // Play sound
    try {
      const soundUrl = config.splash_sound_url || "/sounds/lil-flea-splash.wav";
      soundRef.current = new Audio(soundUrl);
      soundRef.current.volume = 0.4;
      soundRef.current.play().catch(() => {});
    } catch {}

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
  }, [ready, onComplete, config.splash_sound_url]);

  if (!ready || sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) return null;

  const imgPositions = [
    { fromX: -300, fromY: 0, toX: 20, toY: 50, r: -12, d: 0 },
    { fromX: 300, fromY: 0, toX: 220, toY: 30, r: 8, d: 0.15 },
    { fromX: 0, fromY: -300, toX: 120, toY: 120, r: -6, d: 0.3 },
    { fromX: 0, fromY: 300, toX: 280, toY: 150, r: 10, d: 0.45 },
    { fromX: -300, fromY: 100, toX: 60, toY: 200, r: -15, d: 0.2 },
    { fromX: 300, fromY: -100, toX: 350, toY: 80, r: 5, d: 0.35 },
    { fromX: -200, fromY: -200, toX: 180, toY: 250, r: 12, d: 0.5 },
    { fromX: 200, fromY: 200, toX: 400, toY: 200, r: -8, d: 0.4 },
    { fromX: 0, fromY: 300, toX: 320, toY: 280, r: 6, d: 0.55 },
  ];

  return (
    <AnimatePresence>
      {phase < 6 && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
          style={{ background: "hsl(var(--background))", perspective: "1200px" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
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
              <div className="text-right">
                <span className="text-4xl">🎨</span>
                <div className="h-[40%] w-[1px] bg-primary-foreground/10 ml-auto mt-4" />
              </div>
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
              <div>
                <span className="text-4xl">✏️</span>
                <div className="h-[40%] w-[1px] bg-primary-foreground/10 mt-4" />
              </div>
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

            {/* Phase 2: Typewriter text */}
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-4"
                style={{ perspective: "800px" }}
              >
                <p className="text-xl md:text-3xl font-semibold mb-3 text-muted-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <Typewriter text={config.splash_line1} speed={55} />
                </p>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight text-foreground" style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "-0.02em" }}>
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

            {/* Phase 4: Flying images */}
            {phase >= 4 && phase < 5 && (
              <>
                {imgPositions.map((pos, i) => (
                  <motion.div
                    key={`fly-${i}`}
                    className="absolute"
                    style={{ width: "clamp(80px, 15vw, 160px)" }}
                    initial={{ x: pos.fromX, y: pos.fromY, opacity: 0, scale: 0.3, rotate: pos.r * 2 }}
                    animate={{ x: pos.toX - 200, y: pos.toY - 150, opacity: 0.9, scale: 1, rotate: pos.r }}
                    transition={{ duration: 0.7, delay: pos.d, type: "spring", stiffness: 80 }}
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2 + i * 0.2, repeat: Infinity }}
                      className="rounded-xl overflow-hidden shadow-xl border-2 border-background"
                      style={{ transform: `rotate(${pos.r}deg)` }}
                    >
                      <img src={EVENT_IMAGES[i % EVENT_IMAGES.length]} alt="" className="w-full aspect-square object-cover" loading="eager" />
                    </motion.div>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 }}
                  className="absolute inset-0 flex items-center justify-center z-10"
                >
                  <div className="px-8 py-4 rounded-2xl bg-background/90 backdrop-blur-md shadow-xl">
                    <p className="text-2xl md:text-4xl font-black text-center text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      ✨ Live Caricatures ✨
                    </p>
                  </div>
                </motion.div>
              </>
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

          {/* Skip button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2 }}
            whileHover={{ opacity: 1 }}
            onClick={() => {
              sessionStorage.setItem("lf_splash_done", "1");
              if (soundRef.current) { soundRef.current.pause(); }
              onComplete();
            }}
            className="absolute bottom-6 right-6 z-50 text-xs font-medium px-4 py-2 rounded-full bg-muted text-muted-foreground"
          >
            Skip →
          </motion.button>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 z-50 bg-muted/30">
            <motion.div
              className="h-full rounded-r-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 12, ease: "linear" }}
            />
          </div>
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
        {/* Front */}
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
          {/* 3D Shine effect */}
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, white/30 50%, transparent 60%)" }}
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
          />
        </div>

        {/* Back */}
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

/* ─── Infinite Scroll Row ─── */
const InfiniteScrollRow = ({ images, direction = "left", speed = 30 }: { images: string[]; direction?: "left" | "right"; speed?: number }) => {
  const doubled = [...images, ...images, ...images];
  return (
    <div className="overflow-hidden relative py-2">
      <motion.div
        className="flex gap-3"
        animate={{ x: direction === "left" ? ["0%", "-33.33%"] : ["-33.33%", "0%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((img, i) => (
          <div key={i} className="flex-shrink-0 w-40 md:w-52 h-28 md:h-36 rounded-2xl overflow-hidden shadow-md border border-border/30">
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
      >
        {!showNotify && !sent && (
          <>
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent/40 p-0.5 bg-background mx-auto mb-4">
              <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>Thank You! 🎨</h3>
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
            <h3 className="text-xl font-black text-foreground mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>Get Notified 🔔</h3>
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
  const navigate = useNavigate();
  const [splashDone, setSplashDone] = useState(!!sessionStorage.getItem("lf_splash_done"));
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const [showThankYou, setShowThankYou] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [form, setForm] = useState({ name: "", phone: "", event_type: "", date: "", message: "", email: "", instagram: "" });
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    const timer = setInterval(() => setCarouselIdx(i => (i + 1) % EVENT_IMAGES.length), 3500);
    return () => clearInterval(timer);
  }, []);

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  // Show thank you on page leave attempt (only once)
  useEffect(() => {
    if (!splashDone || !config.page_closed) return;
    const handler = () => {
      if (!sessionStorage.getItem("lf_thankyou_shown")) {
        setShowThankYou(true);
        sessionStorage.setItem("lf_thankyou_shown", "1");
      }
    };
    // Use beforeunload for leaving
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [splashDone, config.page_closed]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast({ title: "Please fill name and phone", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await supabase.from("enquiries").insert({
      name: form.name,
      mobile: form.phone,
      event_type: form.event_type || "General",
      event_date: form.date || null,
      source: "lil-flea-page",
      enquiry_type: "event",
      enquiry_number: `LF-${Date.now()}`,
      status: "new",
      email: form.email || null,
      instagram_id: form.instagram || null,
    } as any);
    toast({ title: "Booking request sent! ✅", description: "We'll contact you soon." });
    setForm({ name: "", phone: "", event_type: "", date: "", message: "", email: "", instagram: "" });
    setSubmitting(false);
  };

  const allImages = galleryImages.length > 0 ? galleryImages.map(g => g.image_url) : EVENT_IMAGES;
  const displayGallery = allImages.slice(0, 10);
  const row1 = allImages.slice(0, Math.ceil(allImages.length / 3));
  const row2 = allImages.slice(Math.ceil(allImages.length / 3), Math.ceil(allImages.length * 2 / 3));
  const row3 = allImages.slice(Math.ceil(allImages.length * 2 / 3));

  // If page is closed, show thank you
  if (config.page_closed && splashDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent/40 p-0.5 bg-background mx-auto mb-6">
            <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>Thank You! 🎨</h1>
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
        <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>

          {/* ─── HERO ─── */}
          <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <motion.div style={{ y: heroY }} className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
            </motion.div>

            {/* Vibrant gradient orbs */}
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

              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap items-center justify-center gap-3 text-sm mb-10">
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-secondary-foreground"><MapPin className="w-4 h-4 text-accent" /> {config.venue}</span>
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-secondary-foreground"><Calendar className="w-4 h-4 text-accent" /> {config.dates}</span>
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-secondary-foreground"><Clock className="w-4 h-4 text-accent" /> {config.time}</span>
              </motion.div>

              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="rounded-full gap-2 px-6 font-bold shadow-lg text-base bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 hover:from-rose-500 hover:to-pink-600"
                  onClick={() => window.open(config.ticket_url, "_blank")}
                >
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Button>
                <Button
                  size="lg"
                  className="rounded-full gap-2 px-6 font-bold shadow-lg text-base bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0 hover:from-violet-500 hover:to-purple-600"
                  onClick={() => window.open(config.maps_url, "_blank")}
                >
                  <MapPin className="w-5 h-5" /> Event Location
                </Button>
              </motion.div>
            </motion.div>

            <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-6 h-10 border-2 rounded-full flex items-start justify-center p-1.5 border-border/30">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-3 rounded-full bg-accent" />
            </motion.div>
          </section>

          {/* ─── 3D EXPERIENCE FLASH CARDS ─── */}
          <section className="py-24 relative">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Caricature Experience</p>
                <h2 className="text-3xl md:text-5xl font-black">On-Spot Caricatures with<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-500">Live Interaction</span></h2>
                <p className="text-muted-foreground mt-3 text-lg">With our professional artists — come to {config.event_name}!</p>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {EXPERIENCE_CARDS.map((card, i) => (
                  <FlashCard3D key={card.title} card={card} index={i} />
                ))}
              </div>
            </div>
          </section>

          {/* ─── OUR PREVIOUS LIL FLEA RECAPS ─── */}
          <section className="py-24 relative overflow-hidden bg-secondary/30">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Memories</p>
                <h2 className="text-3xl md:text-5xl font-black">Our Lil Flea Recaps 📸</h2>
                <p className="text-muted-foreground mt-3">Your caricature, sketched in 3–5 minutes — relive the magic!</p>
              </motion.div>

              <div className="relative max-w-5xl mx-auto">
                <div className="overflow-hidden rounded-3xl aspect-[16/10] border border-border shadow-[0_30px_80px_-15px_rgba(0,0,0,0.06)]">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={carouselIdx}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.6 }}
                      src={EVENT_IMAGES[carouselIdx]}
                      alt={`Live caricature event ${carouselIdx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </AnimatePresence>
                </div>
                <button onClick={() => setCarouselIdx(i => (i - 1 + EVENT_IMAGES.length) % EVENT_IMAGES.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-background/90 border border-border text-foreground shadow-md" aria-label="Previous"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setCarouselIdx(i => (i + 1) % EVENT_IMAGES.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-background/90 border border-border text-foreground shadow-md" aria-label="Next"><ChevronRight className="w-5 h-5" /></button>
                <div className="flex items-center justify-center gap-2 mt-5">
                  {EVENT_IMAGES.map((_, i) => (
                    <button key={i} onClick={() => setCarouselIdx(i)} className={`h-2 rounded-full transition-all duration-300 ${i === carouselIdx ? "w-8 bg-accent" : "w-2 bg-border"}`} aria-label={`Slide ${i + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── GALLERY — Infinite Auto-Scroll 3 Rows ─── */}
          <section className="py-24 relative">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Gallery</p>
                <h2 className="text-3xl md:text-5xl font-black">Our Lil Flea Memories 🖼️</h2>
              </motion.div>
              <div className="max-w-6xl mx-auto space-y-3">
                <InfiniteScrollRow images={row1.length > 0 ? row1 : EVENT_IMAGES.slice(0, 3)} direction="left" speed={35} />
                <InfiniteScrollRow images={row2.length > 0 ? row2 : EVENT_IMAGES.slice(3, 6)} direction="right" speed={40} />
                <InfiniteScrollRow images={row3.length > 0 ? row3 : EVENT_IMAGES.slice(6)} direction="left" speed={30} />
              </div>
              <div className="text-center mt-10">
                <Button
                  variant="outline"
                  className="rounded-full gap-2 border-accent/30 text-accent font-bold px-8"
                  onClick={() => {
                    // Open gallery in new tab
                    window.open("/lil-flea-gallery", "_blank");
                  }}
                >
                  View All Photos <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* ─── HOW IT WORKS ─── */}
          <section className="py-24 relative bg-secondary/30">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Simple Process</p>
                <h2 className="text-3xl md:text-5xl font-black">How It Works</h2>
              </motion.div>
              <div className="max-w-4xl mx-auto relative">
                {/* Connection line */}
                <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-200 via-violet-200 to-amber-200 -translate-y-1/2 z-0" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
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
                        whileHover={{ scale: 1.05, y: -8, rotateZ: 2 }}
                        className="rounded-3xl p-8 bg-card border border-border shadow-[0_15px_50px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden"
                      >
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: `linear-gradient(135deg, ${["rgba(244,114,182,0.06)", "rgba(139,92,246,0.06)", "rgba(251,191,36,0.06)"][i]} 0%, transparent 60%)` }}
                        />
                        <div className="text-5xl mb-4">{item.emoji}</div>
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
          <section className="py-20 relative">
            <div className="container mx-auto px-4 text-center max-w-2xl">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                <div className="rounded-3xl p-10 bg-gradient-to-br from-rose-50 via-violet-50 to-amber-50 border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]" style={{ perspective: "1000px" }}>
                  <motion.div whileHover={{ rotateY: 5, scale: 1.02 }} transition={{ type: "spring" }}>
                    <Palette className="w-12 h-12 text-accent mx-auto mb-4" />
                    <h2 className="text-2xl md:text-3xl font-black mb-3">Caricatures Available Live 🎨</h2>
                    <p className="text-muted-foreground">Visit us at our stall to experience & get yours made instantly by professional artists!</p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ─── SOCIAL PROOF ─── */}
          <section className="py-24 relative bg-secondary/30">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Happy Customers</p>
                <h2 className="text-3xl md:text-5xl font-black">Reactions That Speak ❤️</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                    <img src={img} alt={`Customer reaction ${i + 1}`} className="w-full h-64 object-cover" loading="lazy" />
                    <div className="p-5 bg-card">
                      <div className="flex gap-0.5 mb-2">{Array.from({ length: 5 }).map((_, s) => <Star key={s} className="w-4 h-4 fill-current text-amber-400" />)}</div>
                      <p className="text-sm text-muted-foreground">"Amazing experience! Got our caricature done in minutes!"</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── TICKET BOOKING SECTION ─── */}
          <section className="py-20 relative">
            <div className="container mx-auto px-4 max-w-5xl">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">Get Entry</p>
                <h2 className="text-3xl md:text-5xl font-black">Book Your Entry Tickets 🎟️</h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lil Flea Website */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="rounded-3xl p-8 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] text-center"
                  style={{ perspective: "1000px" }}
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

                {/* District App */}
                {config.show_district && (
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -6, scale: 1.01 }}
                    className="rounded-3xl p-8 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] text-center"
                    style={{ perspective: "1000px" }}
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
          <section className="py-24 relative bg-gradient-to-b from-secondary/30 to-background">
            <div className="container mx-auto px-4 text-center max-w-3xl">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                <h2 className="text-3xl md:text-5xl font-black mb-4">
                  Catch Us <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-violet-500">LIVE</span> at {config.event_name}
                </h2>
                <p className="mb-10 text-lg text-muted-foreground">Before it ends! {config.dates} at {config.venue}</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button size="lg" className="rounded-full gap-2 shadow-lg px-6 font-bold bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0" onClick={() => window.open(config.maps_url, "_blank")}>
                    <MapPin className="w-5 h-5" /> Get Directions
                  </Button>
                  <Button size="lg" className="rounded-full gap-2 px-6 font-bold bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0" onClick={() => window.open(config.ticket_url, "_blank")}>
                    <Ticket className="w-5 h-5" /> Book Tickets
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ─── EVENT BOOKING + CUSTOM CARICATURE ─── */}
          <section id="book-us" className="py-24 relative">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                  <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3 text-accent">For Your Events</p>
                  <h2 className="text-3xl md:text-4xl font-black mb-4">Event Booking & Custom Caricature Orders</h2>
                  <p className="text-muted-foreground mb-8">Bring the caricature experience to your next celebration or order a custom caricature.</p>
                  <div className="space-y-4">
                    <a href={`https://wa.me/${config.whatsapp_number}?text=Hi!%20I%20saw%20you%20at%20${encodeURIComponent(config.event_name)}%20and%20want%20to%20book`} target="_blank" rel="noopener" className="flex items-center gap-3 hover:opacity-80 transition-opacity text-foreground group">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center bg-green-50 border border-green-200 group-hover:shadow-md transition-shadow"><Phone className="w-5 h-5 text-green-500" /></div>
                      <span className="font-medium">Chat on WhatsApp</span>
                    </a>
                    <a href={`https://www.instagram.com/${config.instagram_id}/`} target="_blank" rel="noopener" className="flex items-center gap-3 hover:opacity-80 transition-opacity text-foreground group">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center bg-pink-50 border border-pink-200 group-hover:shadow-md transition-shadow"><Instagram className="w-5 h-5 text-pink-500" /></div>
                      <span className="font-medium">@{config.instagram_id}</span>
                    </a>
                    <a href={`mailto:${config.email}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-foreground group">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center bg-sky-50 border border-sky-200 group-hover:shadow-md transition-shadow"><Mail className="w-5 h-5 text-sky-500" /></div>
                      <span className="font-medium">{config.email}</span>
                    </a>
                  </div>
                </motion.div>

                <motion.form onSubmit={handleBookingSubmit} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4 rounded-3xl p-6 md:p-8 bg-card border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
                  <h3 className="font-bold text-lg mb-2">Send Booking Request</h3>
                  <Input placeholder="Your Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl h-12" required />
                  <Input placeholder="Phone Number *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-12" required />
                  <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-xl h-12" />
                  <Input placeholder="Instagram ID" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} className="rounded-xl h-12" />
                  <Input placeholder="Event Type (Wedding, Birthday...)" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className="rounded-xl h-12" />
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="rounded-xl h-12" />
                  <div className="flex gap-3">
                    <Button type="submit" disabled={submitting} className="flex-1 rounded-full font-bold bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0">
                      {submitting ? "Sending..." : "Event Booking"} <Send className="w-4 h-4 ml-1" />
                    </Button>
                    <Button type="submit" disabled={submitting} className="flex-1 rounded-full font-bold bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0">
                      Custom Order <Palette className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.form>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-8 border-t border-border">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Creative Caricature Club. All rights reserved.</p>
              <p className="mt-1">Event collaboration with {config.event_name}</p>
            </div>
          </footer>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-foreground/90 backdrop-blur-sm" onClick={() => setLightboxOpen(false)}>
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 z-10 text-background/60" aria-label="Close"><X className="w-8 h-8" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + displayGallery.length) % displayGallery.length); }} className="absolute left-4 z-10 text-background/60" aria-label="Previous"><ChevronLeft className="w-10 h-10" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % displayGallery.length); }} className="absolute right-4 z-10 text-background/60" aria-label="Next"><ChevronRight className="w-10 h-10" /></button>
            <motion.img key={lightboxIdx} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} src={displayGallery[lightboxIdx]} alt="Gallery preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
            <p className="absolute bottom-6 text-sm text-background/40">{lightboxIdx + 1} / {displayGallery.length}</p>
          </motion.div>
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
