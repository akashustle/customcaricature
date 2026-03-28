import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, Ticket, Phone, ChevronLeft, ChevronRight, X, Instagram, ExternalLink, Sparkles, Users, Palette, Heart, Star, Download } from "lucide-react";
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
  maps_url: "https://maps.app.goo.gl/JioWorldGardenBKC",
  whatsapp_number: "919819731040",
  show_district: true,
  splash_line1: "We're Coming to",
  splash_line2: "The Lil Flea!",
  splash_line3: "Come, Visit Our Stall",
  splash_line4: "See You There! 🎨",
  splash_enabled: true,
};

type EventConfig = typeof DEFAULT_CONFIG;

/* ─── Typewriter Component ─── */
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
          transition={{ duration: 0.6, repeat: Infinity }}
          className="inline-block w-[3px] h-[1em] bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
};

/* ─── Immersive Splash Screen (10-12s video-like) ─── */
const LilFleaSplash = ({ onComplete, config }: { onComplete: () => void; config: EventConfig }) => {
  const [phase, setPhase] = useState(0);
  // 0 = gate closed, 1 = gate opening + logo, 2 = typewriter line1+2, 3 = date/time,
  // 4 = flowing images, 5 = final message, 6 = exit

  useEffect(() => {
    if (sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) {
      onComplete();
      return;
    }
    const timers = [
      setTimeout(() => setPhase(1), 300),     // gate opens
      setTimeout(() => setPhase(2), 2000),     // typewriter starts
      setTimeout(() => setPhase(3), 4500),     // date/time
      setTimeout(() => setPhase(4), 6000),     // images flow
      setTimeout(() => setPhase(5), 9500),     // final message
      setTimeout(() => setPhase(6), 12000),    // exit
      setTimeout(() => {
        sessionStorage.setItem("lf_splash_done", "1");
        onComplete();
      }, 12800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete, config.splash_enabled]);

  if (sessionStorage.getItem("lf_splash_done") || !config.splash_enabled) return null;

  // Image positions for flowing phase
  const imagePositions = [
    { x: "-100%", y: "10%", toX: "5%", toY: "8%", rotate: -15, delay: 0 },
    { x: "200%", y: "25%", toX: "70%", toY: "15%", rotate: 12, delay: 0.15 },
    { x: "30%", y: "-100%", toX: "25%", toY: "60%", rotate: -8, delay: 0.3 },
    { x: "60%", y: "200%", toX: "55%", toY: "55%", rotate: 10, delay: 0.45 },
    { x: "-100%", y: "70%", toX: "10%", toY: "40%", rotate: -5, delay: 0.6 },
    { x: "200%", y: "50%", toX: "75%", toY: "45%", rotate: 8, delay: 0.2 },
    { x: "45%", y: "-100%", toX: "40%", toY: "25%", rotate: -12, delay: 0.5 },
    { x: "-100%", y: "40%", toX: "15%", toY: "70%", rotate: 6, delay: 0.35 },
    { x: "200%", y: "80%", toX: "60%", toY: "75%", rotate: -10, delay: 0.55 },
  ];

  return (
    <AnimatePresence>
      {phase < 6 && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden"
          style={{ background: "hsl(30 43% 97%)", perspective: "1200px" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Subtle warm pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "radial-gradient(circle at 25% 25%, hsl(25 25% 32% / 0.15) 1px, transparent 1px), radial-gradient(circle at 75% 75%, hsl(18 40% 55% / 0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />

          {/* Floating warm particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`p-${i}`}
              className="absolute rounded-full"
              style={{
                width: 3 + (i % 4) * 2,
                height: 3 + (i % 4) * 2,
                background: i % 2 === 0 ? "hsl(25 25% 32% / 0.15)" : "hsl(18 40% 55% / 0.12)",
                left: `${5 + i * 4.5}%`,
                top: `${8 + (i % 6) * 15}%`,
              }}
              animate={{ y: [0, -20, 0], opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}

          {/* ── Phase 0-1: GATE OPENING ── */}
          {/* Left gate door */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 z-30"
            style={{
              background: "linear-gradient(135deg, hsl(25 25% 32%), hsl(25 20% 22%))",
              transformOrigin: "left center",
              boxShadow: "10px 0 40px rgba(0,0,0,0.3)",
            }}
            initial={{ rotateY: 0 }}
            animate={phase >= 1 ? { rotateY: -85 } : {}}
            transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
          >
            {/* Gate decoration */}
            <div className="absolute inset-0 flex items-center justify-end pr-8">
              <div className="text-right">
                <div className="w-16 h-16 rounded-full border-2 border-primary-foreground/20 flex items-center justify-center ml-auto mb-4">
                  <span className="text-2xl">🎨</span>
                </div>
                <div className="h-[60%] w-[1px] bg-primary-foreground/10 ml-auto" />
              </div>
            </div>
          </motion.div>

          {/* Right gate door */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 z-30"
            style={{
              background: "linear-gradient(225deg, hsl(25 25% 32%), hsl(25 20% 22%))",
              transformOrigin: "right center",
              boxShadow: "-10px 0 40px rgba(0,0,0,0.3)",
            }}
            initial={{ rotateY: 0 }}
            animate={phase >= 1 ? { rotateY: 85 } : {}}
            transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="absolute inset-0 flex items-center justify-start pl-8">
              <div>
                <div className="w-16 h-16 rounded-full border-2 border-primary-foreground/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">✏️</span>
                </div>
                <div className="h-[60%] w-[1px] bg-primary-foreground/10" />
              </div>
            </div>
          </motion.div>

          {/* Gate center seam line */}
          <motion.div
            className="absolute top-0 bottom-0 left-1/2 w-[2px] z-40"
            style={{ background: "hsl(25 25% 32% / 0.3)" }}
            animate={phase >= 1 ? { opacity: 0, scaleY: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          />

          {/* ── Phase 1: CCC LOGO (behind gates) ── */}
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.6, type: "spring", stiffness: 120, damping: 15 }}
              className="relative"
            >
              {/* Glow ring */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(18 40% 55% / 0.2) 0%, transparent 70%)" }}
                animate={phase >= 1 ? { scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] } : {}}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute -inset-6 rounded-full border border-foreground/5"
                animate={phase >= 1 ? { scale: [1, 1.4, 1], opacity: [0.15, 0, 0.15] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div
                className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-[3px] p-1"
                style={{
                  borderColor: "hsl(18 40% 55% / 0.4)",
                  boxShadow: "0 0 60px hsl(18 40% 55% / 0.2), 0 0 120px hsl(25 25% 32% / 0.1)",
                  background: "hsl(30 43% 97%)",
                }}
              >
                <img
                  src="/logo.png"
                  alt="Creative Caricature Club"
                  className="w-full h-full rounded-full object-cover"
                  width={144}
                  height={144}
                />
              </div>
            </motion.div>
          </div>

          {/* ── Phase 2: TYPEWRITER TEXT ── */}
          {phase >= 2 && phase < 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6"
            >
              {/* Logo shrinks to top */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: -80 }}
                transition={{ duration: 0.5 }}
                className="mb-4"
              >
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-2 p-0.5"
                  style={{ borderColor: "hsl(18 40% 55% / 0.3)", background: "hsl(30 43% 97%)" }}
                >
                  <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
                </div>
              </motion.div>

              <div className="text-center" style={{ perspective: "800px" }}>
                <motion.div
                  initial={{ rotateX: 20, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <p className="text-lg md:text-2xl font-semibold mb-2" style={{ color: "hsl(25 20% 18% / 0.6)", fontFamily: "'Nunito', sans-serif" }}>
                    <Typewriter text={config.splash_line1 || DEFAULT_CONFIG.splash_line1} speed={60} />
                  </p>
                  <h1
                    className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight"
                    style={{ color: "hsl(25 20% 18%)", fontFamily: "'Dancing Script', cursive" }}
                  >
                    <Typewriter text={config.splash_line2 || DEFAULT_CONFIG.splash_line2} delay={1200} speed={80} />
                  </h1>
                </motion.div>

                {/* Date & Time - Phase 3 */}
                {phase >= 3 && (
                  <motion.div
                    initial={{ y: 30, opacity: 0, rotateX: 15 }}
                    animate={{ y: 0, opacity: 1, rotateX: 0 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    className="mt-6 space-y-2"
                  >
                    <p className="text-base md:text-xl font-medium" style={{ color: "hsl(18 40% 55%)", fontFamily: "'Dancing Script', cursive" }}>
                      <Typewriter text={config.splash_line3 || DEFAULT_CONFIG.splash_line3} speed={50} />
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
                        style={{ background: "hsl(25 25% 32% / 0.08)", color: "hsl(25 25% 32%)" }}
                      >
                        <Calendar className="w-4 h-4" /> {config.dates}
                      </motion.span>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
                        style={{ background: "hsl(18 40% 55% / 0.08)", color: "hsl(18 40% 55%)" }}
                      >
                        <Clock className="w-4 h-4" /> {config.time}
                      </motion.span>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7, type: "spring" }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
                        style={{ background: "hsl(25 25% 32% / 0.06)", color: "hsl(25 20% 18% / 0.7)" }}
                      >
                        <MapPin className="w-4 h-4" /> {config.venue}
                      </motion.span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Phase 4: FLOWING IMAGES ── */}
          {phase >= 4 && phase < 5 && (
            <div className="absolute inset-0 z-25">
              {imagePositions.map((pos, i) => (
                <motion.div
                  key={`img-${i}`}
                  className="absolute"
                  style={{
                    left: pos.toX,
                    top: pos.toY,
                    width: "clamp(100px, 18vw, 200px)",
                    perspective: "600px",
                  }}
                  initial={{
                    x: pos.x,
                    y: pos.y,
                    opacity: 0,
                    scale: 0.3,
                    rotateZ: pos.rotate * 2,
                    rotateY: pos.rotate,
                  }}
                  animate={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    rotateZ: pos.rotate,
                    rotateY: 0,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: pos.delay,
                    type: "spring",
                    stiffness: 80,
                    damping: 15,
                  }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5 + i * 0.2, repeat: Infinity }}
                    className="rounded-xl overflow-hidden shadow-xl"
                    style={{
                      border: "3px solid hsl(30 43% 97%)",
                      boxShadow: "0 10px 40px hsl(25 25% 32% / 0.15), 0 4px 12px hsl(25 25% 32% / 0.1)",
                      transform: `rotateZ(${pos.rotate}deg)`,
                    }}
                  >
                    <img
                      src={EVENT_IMAGES[i % EVENT_IMAGES.length]}
                      alt=""
                      className="w-full aspect-square object-cover"
                      loading="eager"
                    />
                  </motion.div>
                </motion.div>
              ))}

              {/* Center text over images */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <div
                  className="px-8 py-4 rounded-2xl"
                  style={{
                    background: "hsl(30 43% 97% / 0.9)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 10px 40px hsl(25 25% 32% / 0.1)",
                  }}
                >
                  <p
                    className="text-xl md:text-3xl font-black text-center"
                    style={{ color: "hsl(25 20% 18%)", fontFamily: "'Dancing Script', cursive" }}
                  >
                    ✨ Live Caricatures ✨
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Phase 5: FINAL MESSAGE ── */}
          {phase >= 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6"
              style={{ background: "hsl(30 43% 97% / 0.95)" }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 12 }}
                className="mb-6"
              >
                <div
                  className="w-20 h-20 rounded-full overflow-hidden border-2 p-0.5"
                  style={{ borderColor: "hsl(18 40% 55% / 0.4)", background: "hsl(30 43% 97%)" }}
                >
                  <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" />
                </div>
              </motion.div>
              <motion.h2
                initial={{ y: 30, opacity: 0, rotateX: 20 }}
                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-3xl md:text-5xl font-black text-center leading-tight"
                style={{ color: "hsl(25 20% 18%)", fontFamily: "'Dancing Script', cursive" }}
              >
                <Typewriter text={config.splash_line4 || DEFAULT_CONFIG.splash_line4} speed={70} />
              </motion.h2>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 120 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="h-[3px] rounded-full mt-6"
                style={{ background: "linear-gradient(90deg, hsl(25 25% 32%), hsl(18 40% 55%))" }}
              />
            </motion.div>
          )}

          {/* Skip button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2 }}
            whileHover={{ opacity: 1 }}
            onClick={() => {
              sessionStorage.setItem("lf_splash_done", "1");
              onComplete();
            }}
            className="absolute bottom-6 right-6 z-50 text-xs font-medium px-4 py-2 rounded-full"
            style={{ background: "hsl(25 25% 32% / 0.1)", color: "hsl(25 20% 18% / 0.5)" }}
          >
            Skip →
          </motion.button>

          {/* Progress bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 z-50" style={{ background: "hsl(25 25% 32% / 0.05)" }}>
            <motion.div
              className="h-full rounded-r-full"
              style={{ background: "linear-gradient(90deg, hsl(25 25% 32%), hsl(18 40% 55%))" }}
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
  { title: "Single Caricature", desc: "Your personality in a fun sketch", icon: Sparkles, color: "hsl(25 25% 32%)" },
  { title: "Couple Caricature", desc: "A memorable sketch for two", icon: Heart, color: "hsl(18 40% 55%)" },
  { title: "Family Caricature", desc: "The whole family, one portrait", icon: Users, color: "hsl(25 25% 32%)" },
  { title: "Color & B&W", desc: "Vibrant or classic — your choice", icon: Palette, color: "hsl(18 40% 55%)" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Visit Our Stall", desc: "Find us at the event — look for the big Caricature sign!" },
  { step: "02", title: "Sit & Get Sketched", desc: "Relax while our artist captures your likeness in minutes" },
  { step: "03", title: "Take It Home", desc: "Walk away with a unique, hand-drawn caricature memento" },
];

/* ─── 3D Flip Card ─── */
const FlipCard = ({ card, index }: { card: typeof EXPERIENCE_CARDS[0]; index: number }) => {
  const [flipped, setFlipped] = useState(false);
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateY: -15 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, type: "spring", stiffness: 100 }}
      className="h-52 cursor-pointer group"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-end border"
          style={{
            backfaceVisibility: "hidden",
            background: `linear-gradient(145deg, hsl(30 43% 97%), hsl(30 40% 94%))`,
            borderColor: "hsl(30 18% 88%)",
            boxShadow: "0 15px 50px hsl(25 25% 32% / 0.08), 0 4px 12px hsl(25 25% 32% / 0.05)",
          }}
        >
          <div
            className="absolute top-4 right-4 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{ background: `${card.color} / 0.1)`.replace(")", "") }}
          >
            <Icon className="w-6 h-6" style={{ color: card.color }} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: "hsl(25 20% 18%)" }}>{card.title}</h3>
          <p className="text-sm mt-1" style={{ color: "hsl(25 10% 50%)" }}>Tap to learn more</p>
          {/* Shine */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, hsl(30 43% 97% / 0.6) 50%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-center border"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "hsl(30 40% 99%)",
            borderColor: "hsl(30 18% 88%)",
            boxShadow: "0 15px 50px hsl(25 25% 32% / 0.08)",
          }}
        >
          <Icon className="w-10 h-10 mb-3" style={{ color: card.color }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: "hsl(25 20% 18%)" }}>{card.title}</h3>
          <p className="text-sm" style={{ color: "hsl(25 10% 50%)" }}>{card.desc}</p>
        </div>
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
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [form, setForm] = useState({ name: "", phone: "", event_type: "", date: "", message: "" });
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
    } as any);
    toast({ title: "Booking request sent! ✅", description: "We'll contact you soon." });
    setForm({ name: "", phone: "", event_type: "", date: "", message: "" });
    setSubmitting(false);
  };

  const allImages = galleryImages.length > 0 ? galleryImages.map(g => g.image_url) : EVENT_IMAGES;
  const displayGallery = allImages.slice(0, 10);

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

      {/* Splash Screen */}
      {!splashDone && <LilFleaSplash onComplete={handleSplashComplete} config={config} />}

      {/* Page Content (shown after splash) */}
      {splashDone && (
        <div className="min-h-screen" style={{ background: "hsl(30 43% 97%)", color: "hsl(25 20% 18%)" }}>

          {/* ─── HERO ─── */}
          <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <motion.div style={{ y: heroY }} className="absolute inset-0">
              <img src="/images/lil-flea/lf-3.jpeg" alt={`Live caricature at ${config.event_name}`} className="w-full h-full object-cover opacity-15" loading="eager" width={1200} height={800} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(30 43% 97% / 0.7), hsl(30 43% 97% / 0.3), hsl(30 43% 97%))" }} />
            </motion.div>

            {/* Warm glow orbs */}
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-20 left-10 w-72 h-72 rounded-full blur-[120px]" style={{ background: "hsl(18 40% 55%)" }} />
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} className="absolute bottom-20 right-10 w-60 h-60 rounded-full blur-[100px]" style={{ background: "hsl(25 25% 32%)" }} />

            <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center px-4 max-w-4xl mx-auto">
              {/* Logos */}
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-center gap-4 mb-8 flex-wrap">
                <div className="w-16 h-16 rounded-full border-2 overflow-hidden shadow-lg p-0.5" style={{ borderColor: "hsl(18 40% 55% / 0.3)", background: "hsl(30 43% 97%)", boxShadow: "0 8px 30px hsl(25 25% 32% / 0.1)" }}>
                  <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" width={64} height={64} />
                </div>
                <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="text-xl" style={{ color: "hsl(18 40% 55% / 0.4)" }}>✦</motion.span>
                <img src="/images/lil-flea-logo.png" alt={config.event_name} className="h-9 md:h-11 opacity-70" width={100} height={44} />
              </motion.div>

              <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, type: "spring" }} className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {config.hero_title.includes("Live") ? (
                  <>
                    {config.hero_title.split("Live")[0]}
                    <span className="relative inline-block" style={{ color: "hsl(18 40% 55%)" }}>
                      Live
                      <motion.span animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -inset-2 blur-xl rounded-lg" style={{ background: "hsl(18 40% 55% / 0.15)" }} />
                    </span>
                    {config.hero_title.split("Live")[1]}
                  </>
                ) : config.hero_title}
              </motion.h1>

              <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="text-lg md:text-xl mb-3" style={{ color: "hsl(25 10% 50%)" }}>
                {config.hero_subtitle}
              </motion.p>

              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap items-center justify-center gap-3 text-sm mb-10">
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ background: "hsl(25 25% 32% / 0.06)", color: "hsl(25 25% 32%)" }}>
                  <MapPin className="w-4 h-4" style={{ color: "hsl(18 40% 55%)" }} /> {config.venue}
                </span>
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ background: "hsl(25 25% 32% / 0.06)", color: "hsl(25 25% 32%)" }}>
                  <Calendar className="w-4 h-4" style={{ color: "hsl(18 40% 55%)" }} /> {config.dates}
                </span>
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ background: "hsl(25 25% 32% / 0.06)", color: "hsl(25 25% 32%)" }}>
                  <Clock className="w-4 h-4" style={{ color: "hsl(18 40% 55%)" }} /> {config.time}
                </span>
              </motion.div>

              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="rounded-full gap-2 px-6 font-bold shadow-lg text-base"
                  style={{ background: "hsl(25 25% 32%)", color: "hsl(30 43% 97%)", boxShadow: "0 8px 30px hsl(25 25% 32% / 0.2)" }}
                  onClick={() => window.open(config.maps_url, "_blank")}
                >
                  <MapPin className="w-5 h-5" /> Visit Our Stall
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full gap-2 px-6 font-bold text-base"
                  style={{ borderColor: "hsl(18 40% 55% / 0.3)", color: "hsl(18 40% 55%)" }}
                  onClick={() => window.open(config.ticket_url, "_blank")}
                >
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Button>
              </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-6 h-10 border-2 rounded-full flex items-start justify-center p-1.5" style={{ borderColor: "hsl(25 25% 32% / 0.2)" }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-3 rounded-full" style={{ background: "hsl(18 40% 55%)" }} />
            </motion.div>
          </section>

          {/* ─── TICKET STRIP ─── */}
          <section className="relative z-10 py-4" style={{ background: "linear-gradient(90deg, hsl(25 25% 32%), hsl(18 40% 55%))" }}>
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-lg" style={{ color: "hsl(30 43% 97%)" }}>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <Ticket className="w-5 h-5" />
                </motion.div>
                <span>Limited Entry — Book Your Tickets Now!</span>
              </div>
              <Button className="rounded-full font-bold gap-2 shadow-lg" style={{ background: "hsl(30 43% 97%)", color: "hsl(25 25% 32%)" }} onClick={() => window.open(config.ticket_url, "_blank")}>
                Book on {config.event_name} <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </section>

          {/* ─── 3D EXPERIENCE CARDS ─── */}
          <section className="py-24 relative">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3" style={{ color: "hsl(18 40% 55%)" }}>What We Offer</p>
                <h2 className="text-3xl md:text-5xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>The Caricature Experience</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {EXPERIENCE_CARDS.map((card, i) => (
                  <FlipCard key={card.title} card={card} index={i} />
                ))}
              </div>
            </div>
          </section>

          {/* ─── LIVE CAROUSEL ─── */}
          <section className="py-24 relative overflow-hidden" style={{ background: "hsl(30 40% 94%)" }}>
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3" style={{ color: "hsl(18 40% 55%)" }}>Live at the Event</p>
                <h2 className="text-3xl md:text-5xl font-black mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Watch It Come Alive</h2>
                <p style={{ color: "hsl(25 10% 50%)" }}>Your caricature, sketched in 3–5 minutes</p>
              </motion.div>

              <div className="relative max-w-4xl mx-auto">
                <div className="overflow-hidden rounded-3xl aspect-[16/10] border" style={{ borderColor: "hsl(30 18% 88%)", boxShadow: "0 30px 80px hsl(25 25% 32% / 0.08)" }}>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={carouselIdx}
                      initial={{ opacity: 0, scale: 1.1, rotateY: 10 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      exit={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                      transition={{ duration: 0.6 }}
                      src={EVENT_IMAGES[carouselIdx]}
                      alt={`Live caricature event ${carouselIdx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width={800}
                      height={500}
                    />
                  </AnimatePresence>
                </div>
                <button onClick={() => setCarouselIdx(i => (i - 1 + EVENT_IMAGES.length) % EVENT_IMAGES.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center border" style={{ background: "hsl(30 43% 97% / 0.9)", borderColor: "hsl(30 18% 88%)", color: "hsl(25 20% 18%)" }} aria-label="Previous"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setCarouselIdx(i => (i + 1) % EVENT_IMAGES.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center border" style={{ background: "hsl(30 43% 97% / 0.9)", borderColor: "hsl(30 18% 88%)", color: "hsl(25 20% 18%)" }} aria-label="Next"><ChevronRight className="w-5 h-5" /></button>
                <div className="flex items-center justify-center gap-2 mt-5">
                  {EVENT_IMAGES.map((_, i) => (
                    <button key={i} onClick={() => setCarouselIdx(i)} className="h-2 rounded-full transition-all duration-300" style={{ width: i === carouselIdx ? 32 : 8, background: i === carouselIdx ? "hsl(18 40% 55%)" : "hsl(25 25% 32% / 0.15)" }} aria-label={`Slide ${i + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── GALLERY ─── */}
          <section className="py-24 relative">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3" style={{ color: "hsl(18 40% 55%)" }}>Our Work</p>
                <h2 className="text-3xl md:text-5xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>Gallery</h2>
              </motion.div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl mx-auto">
                {displayGallery.map((img, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30, rotateX: 15 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.08, y: -8, rotateY: 5 }}
                    className="rounded-2xl overflow-hidden cursor-pointer aspect-square border relative group"
                    style={{ borderColor: "hsl(30 18% 88%)", boxShadow: "0 10px 40px hsl(25 25% 32% / 0.06)" }}
                    onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
                  >
                    <img src={typeof img === "string" ? img : img} alt={`Caricature ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" width={300} height={300} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
              {allImages.length > 10 && (
                <div className="text-center mt-10">
                  <Button variant="outline" className="rounded-full gap-2" style={{ borderColor: "hsl(18 40% 55% / 0.3)", color: "hsl(18 40% 55%)" }} onClick={() => navigate("/gallery/events")}>View Full Gallery <ArrowRight className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          </section>

          {/* ─── HOW IT WORKS ─── */}
          <section className="py-24 relative" style={{ background: "hsl(30 40% 94%)" }}>
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3" style={{ color: "hsl(18 40% 55%)" }}>Simple Process</p>
                <h2 className="text-3xl md:text-5xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>How It Works</h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {HOW_IT_WORKS.map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, type: "spring" }}
                    className="text-center relative group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05, rotateZ: 2 }}
                      className="rounded-2xl p-8 border relative overflow-hidden"
                      style={{ background: "hsl(30 43% 97%)", borderColor: "hsl(30 18% 88%)", boxShadow: "0 10px 40px hsl(25 25% 32% / 0.05)" }}
                    >
                      <div className="text-5xl font-black absolute top-2 right-4" style={{ color: "hsl(18 40% 55% / 0.08)" }}>{item.step}</div>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(18 40% 55% / 0.08)" }}>
                        <span className="text-2xl font-black" style={{ color: "hsl(18 40% 55%)" }}>{item.step}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-sm" style={{ color: "hsl(25 10% 50%)" }}>{item.desc}</p>
                    </motion.div>
                    {i < 2 && <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-xl" style={{ color: "hsl(18 40% 55% / 0.3)" }}>→</div>}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── PRICING MESSAGE ─── */}
          <section className="py-20 relative">
            <div className="container mx-auto px-4 max-w-2xl text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl p-8 md:p-12 border relative overflow-hidden"
                style={{ background: "hsl(30 40% 99%)", borderColor: "hsl(18 40% 55% / 0.15)", boxShadow: "0 30px 80px hsl(25 25% 32% / 0.06)" }}
              >
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -right-20 w-40 h-40 rounded-full" style={{ background: "hsl(18 40% 55% / 0.04)" }} />
                <Palette className="w-12 h-12 mx-auto mb-4" style={{ color: "hsl(18 40% 55%)" }} />
                <h2 className="text-2xl md:text-3xl font-black mb-3">Caricatures Available Live 🎨</h2>
                <p className="mb-6" style={{ color: "hsl(25 10% 50%)" }}>Visit us at {config.event_name} to experience & get yours made instantly. No appointment needed!</p>
                <Button size="lg" className="rounded-full gap-2 shadow-lg font-bold" style={{ background: "hsl(25 25% 32%)", color: "hsl(30 43% 97%)" }} onClick={() => window.open(config.ticket_url, "_blank")}>
                  <Ticket className="w-5 h-5" /> Book Tickets for {config.event_name}
                </Button>
              </motion.div>
            </div>
          </section>

          {/* ─── EVENT BOOKING FORM ─── */}
          <section className="py-24 relative" id="book-us" style={{ background: "hsl(30 40% 94%)" }}>
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                  <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3" style={{ color: "hsl(18 40% 55%)" }}>For Your Events</p>
                  <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>Book Us for Weddings & Events</h2>
                  <p className="mb-8" style={{ color: "hsl(25 10% 50%)" }}>Bring the caricature experience to your next celebration.</p>
                  <div className="space-y-4">
                    <a href={`https://wa.me/${config.whatsapp_number}?text=Hi!%20I%20saw%20you%20at%20${encodeURIComponent(config.event_name)}%20and%20want%20to%20book`} target="_blank" rel="noopener" className="flex items-center gap-3 hover:opacity-80 transition-opacity" style={{ color: "hsl(25 20% 18%)" }}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center border" style={{ background: "hsl(142 71% 45% / 0.08)", borderColor: "hsl(142 71% 45% / 0.2)" }}><Phone className="w-5 h-5" style={{ color: "hsl(142 71% 45%)" }} /></div>
                      Chat on WhatsApp
                    </a>
                    <a href="https://www.instagram.com/creativecaricatureclub/" target="_blank" rel="noopener" className="flex items-center gap-3 hover:opacity-80 transition-opacity" style={{ color: "hsl(25 20% 18%)" }}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center border" style={{ background: "hsl(330 80% 55% / 0.08)", borderColor: "hsl(330 80% 55% / 0.2)" }}><Instagram className="w-5 h-5" style={{ color: "hsl(330 80% 55%)" }} /></div>
                      Follow on Instagram
                    </a>
                  </div>
                </motion.div>

                <motion.form onSubmit={handleBookingSubmit} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4 rounded-3xl p-6 md:p-8 border" style={{ background: "hsl(30 43% 97%)", borderColor: "hsl(30 18% 88%)", boxShadow: "0 20px 60px hsl(25 25% 32% / 0.06)" }}>
                  <Input placeholder="Your Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl h-12" required />
                  <Input placeholder="Phone Number *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-12" required />
                  <Input placeholder="Event Type (Wedding, Birthday...)" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className="rounded-xl h-12" />
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="rounded-xl h-12" />
                  <Button type="submit" disabled={submitting} size="lg" className="w-full rounded-full text-base font-bold" style={{ background: "hsl(25 25% 32%)", color: "hsl(30 43% 97%)" }}>
                    {submitting ? "Sending..." : "Send Booking Request"}
                  </Button>
                </motion.form>
              </div>
            </div>
          </section>

          {/* ─── SOCIAL PROOF ─── */}
          <section className="py-24 relative">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="uppercase tracking-[0.3em] text-xs font-semibold mb-3" style={{ color: "hsl(18 40% 55%)" }}>Happy Customers</p>
                <h2 className="text-3xl md:text-5xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>Reactions That Speak</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {EVENT_IMAGES.slice(0, 3).map((img, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40, rotateY: 10 }}
                    whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, type: "spring" }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="rounded-3xl overflow-hidden border"
                    style={{ borderColor: "hsl(30 18% 88%)", boxShadow: "0 15px 50px hsl(25 25% 32% / 0.06)" }}
                  >
                    <img src={img} alt={`Customer reaction ${i + 1}`} className="w-full h-64 object-cover" loading="lazy" width={400} height={256} />
                    <div className="p-5" style={{ background: "hsl(30 40% 99%)" }}>
                      <div className="flex gap-0.5 mb-2">{Array.from({ length: 5 }).map((_, s) => <Star key={s} className="w-4 h-4 fill-current" style={{ color: "hsl(35 90% 55%)" }} />)}</div>
                      <p className="text-sm" style={{ color: "hsl(25 10% 50%)" }}>"Amazing experience! Got our caricature done in minutes!"</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── DISTRICT APP SECTION ─── */}
          {config.show_district && (
            <section className="py-20 relative" style={{ background: "hsl(30 40% 94%)" }}>
              <div className="container mx-auto px-4 max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  className="rounded-3xl p-8 md:p-10 border relative overflow-hidden flex flex-col md:flex-row items-center gap-8"
                  style={{ background: "hsl(30 43% 97%)", borderColor: "hsl(30 18% 88%)", boxShadow: "0 20px 60px hsl(25 25% 32% / 0.06)" }}
                >
                  <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl" style={{ background: "hsl(18 40% 55% / 0.05)" }} />

                  <div className="flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.05, rotateY: 10 }}
                      className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shadow-xl"
                      style={{ boxShadow: "0 10px 40px hsl(25 25% 32% / 0.1)" }}
                    >
                      <img src="/images/district-logo.png" alt="District by Zomato" className="w-full h-full object-cover" width={112} height={112} />
                    </motion.div>
                  </div>

                  <div className="text-center md:text-left flex-1">
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <img src="/images/district-app.svg" alt="District" className="h-5 opacity-80" />
                      <span className="text-sm" style={{ color: "hsl(25 10% 50%)" }}>by Zomato</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black mb-2">
                      Also Book via <span style={{ color: "hsl(18 40% 55%)" }}>District App</span>
                    </h3>
                    <p className="text-sm mb-5" style={{ color: "hsl(25 10% 50%)" }}>
                      Get your entry tickets for {config.event_name} through the District by Zomato app too!
                    </p>
                    <Button
                      className="rounded-full gap-2 font-bold shadow-lg"
                      style={{ background: "hsl(18 40% 55%)", color: "hsl(30 43% 97%)" }}
                      onClick={() => window.open(config.district_app_url, "_blank")}
                    >
                      <Download className="w-4 h-4" /> Get District App
                    </Button>
                  </div>
                </motion.div>
              </div>
            </section>
          )}

          {/* ─── FINAL CTA ─── */}
          <section className="py-24 relative">
            <div className="container mx-auto px-4 text-center max-w-3xl">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Catch Us <span style={{ color: "hsl(18 40% 55%)" }}>LIVE</span> at {config.event_name}
                </h2>
                <p className="mb-10 text-lg" style={{ color: "hsl(25 10% 50%)" }}>Before it ends! {config.dates} at {config.venue}</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button size="lg" className="rounded-full gap-2 shadow-lg px-6 font-bold" style={{ background: "hsl(25 25% 32%)", color: "hsl(30 43% 97%)" }} onClick={() => window.open(config.maps_url, "_blank")}>
                    <MapPin className="w-5 h-5" /> Get Directions
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full gap-2 px-6 font-bold" style={{ borderColor: "hsl(18 40% 55% / 0.3)", color: "hsl(18 40% 55%)" }} onClick={() => window.open(config.ticket_url, "_blank")}>
                    <Ticket className="w-5 h-5" /> Book Tickets
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full gap-2 px-6 font-bold" style={{ borderColor: "hsl(25 25% 32% / 0.2)", color: "hsl(25 25% 32%)" }} onClick={() => document.getElementById("book-us")?.scrollIntoView({ behavior: "smooth" })}>
                    Book Us <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-8 border-t" style={{ borderColor: "hsl(30 18% 88%)" }}>
            <div className="container mx-auto px-4 text-center text-sm" style={{ color: "hsl(25 10% 50%)" }}>
              <p>© {new Date().getFullYear()} Creative Caricature Club. All rights reserved.</p>
              <p className="mt-1">Event collaboration with {config.event_name}</p>
            </div>
          </footer>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center" style={{ background: "hsl(25 20% 18% / 0.95)" }} onClick={() => setLightboxOpen(false)}>
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 z-10" style={{ color: "hsl(30 43% 97% / 0.6)" }} aria-label="Close"><X className="w-8 h-8" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + displayGallery.length) % displayGallery.length); }} className="absolute left-4 z-10" style={{ color: "hsl(30 43% 97% / 0.6)" }} aria-label="Previous"><ChevronLeft className="w-10 h-10" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % displayGallery.length); }} className="absolute right-4 z-10" style={{ color: "hsl(30 43% 97% / 0.6)" }} aria-label="Next"><ChevronRight className="w-10 h-10" /></button>
            <motion.img key={lightboxIdx} initial={{ opacity: 0, scale: 0.85, rotateY: 15 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} src={displayGallery[lightboxIdx]} alt="Gallery preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
            <p className="absolute bottom-6 text-sm" style={{ color: "hsl(30 43% 97% / 0.4)" }}>{lightboxIdx + 1} / {displayGallery.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LilFlea;
