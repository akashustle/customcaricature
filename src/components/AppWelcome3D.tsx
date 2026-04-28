import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppMode } from "@/hooks/useAppMode";
import { Palette, Sparkles, PartyPopper, ChevronRight, ArrowRight } from "lucide-react";

/**
 * 3-step 3D welcome experience shown ONLY in app mode (Capacitor / installed PWA),
 * exactly once per install. After step 3, users go to /register (or /login).
 *
 * Storyline: Art → Events → Book Now.
 * Each slide is a tilt-parallax 3D scene with floating layers, soft glow, and
 * spring-animated transitions to feel like a high-end native app.
 */

const STORAGE_KEY = "ccc_app_welcome_v3_done";

// Real event photos from the gallery — one per slide. Preloaded for instant
// paint so the flash cards never show a blank/loading state.
const EVENT_IMAGES = [
  "https://cqdxfvcyrvlttmkuaeda.supabase.co/storage/v1/object/public/gallery-images/scroll-events/76f20bf5-4d62-4ced-9359-f4afaf4649e1.jpeg",
  "https://cqdxfvcyrvlttmkuaeda.supabase.co/storage/v1/object/public/gallery-images/scroll-events/d1951e67-00b2-46dc-ab53-65f06eb306a2.jpeg",
  "https://cqdxfvcyrvlttmkuaeda.supabase.co/storage/v1/object/public/gallery-images/scroll-events/fe9b773c-bf6f-4c17-8e39-74168c0a99e8.jpeg",
];

// Auto-advance interval per slide (ms). Last slide auto-finishes to /register.
const AUTO_ADVANCE_MS = 3500;

interface SlideDef {
  id: string;
  badge: string;
  title: string;
  body: string;
  cta: string;
  icon: typeof Palette;
  bgFrom: string;
  bgTo: string;
  scene: (active: boolean) => JSX.Element;
}

const SLIDES: SlideDef[] = [
  {
    id: "art",
    badge: "Hand-drawn art",
    title: "Caricatures by real artists",
    body: "From quick portraits to wall-ready masterpieces — drawn live or delivered to your door.",
    cta: "Next",
    icon: Palette,
    bgFrom: "252 85% 62%",
    bgTo: "320 80% 75%",
    scene: (active) => <ArtScene active={active} photo={EVENT_IMAGES[0]} />,
  },
  {
    id: "events",
    badge: "Live events",
    title: "Book artists for your big day",
    body: "Weddings, corporate events, birthdays — your guests get a souvenir they'll keep forever.",
    cta: "Next",
    icon: PartyPopper,
    bgFrom: "285 80% 70%",
    bgTo: "215 90% 75%",
    scene: (active) => <EventScene active={active} photo={EVENT_IMAGES[1]} />,
  },
  {
    id: "book",
    badge: "Get started",
    title: "Book in seconds",
    body: "Create a free account to track orders, save addresses, and unlock member pricing.",
    cta: "Create account",
    icon: Sparkles,
    bgFrom: "258 70% 50%",
    bgTo: "340 85% 78%",
    scene: (active) => <BookScene active={active} photo={EVENT_IMAGES[2]} />,
  },
];

const AppWelcome3D = () => {
  const isAppMode = useAppMode();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [index, setIndex] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isAppMode) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    // Preload all event images so flash cards paint instantly when each slide enters
    EVENT_IMAGES.forEach((src) => { const img = new Image(); img.src = src; });
    setShow(true);
  }, [isAppMode]);

  // Subtle parallax tilt on touch/mouse move
  useEffect(() => {
    if (!show) return;
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setTilt({ x: x * 6, y: y * -6 });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [show]);

  if (!show) return null;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const finish = (target: "register" | "login") => {
    localStorage.setItem(STORAGE_KEY, "1");
    // Suppress the legacy onboarding so the welcome flow never shows twice
    localStorage.setItem("ccc_onboarding_done_v2", "done");
    setShow(false);
    setTimeout(() => navigate(target === "register" ? "/register" : "/login"), 60);
  };

  const next = () => {
    if (isLast) {
      finish("register");
    } else {
      setIndex((i) => i + 1);
    }
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    localStorage.setItem("ccc_onboarding_done_v2", "done");
    setShow(false);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden touch-none bg-background"
      style={{ height: "100dvh", perspective: "1400px" }}
    >
      {/* SOLID animated gradient backdrop — fully opaque, premium look */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id + "-bg"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, hsl(${slide.bgFrom}) 0%, hsl(${slide.bgTo}) 55%, hsl(240 40% 18%) 100%)`,
          }}
        />
      </AnimatePresence>

      {/* Drifting glow orbs — opaque so background never shows through */}
      <motion.div
        aria-hidden
        className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-70"
        style={{ background: `hsl(${slide.bgFrom})` }}
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full blur-3xl opacity-70"
        style={{ background: `hsl(${slide.bgTo})` }}
        animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Top bar — skip + dots */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between px-5 z-20"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <motion.span
              key={s.id}
              className="block h-1.5 rounded-full bg-white/90"
              animate={{ width: i === index ? 26 : 8, opacity: i === index ? 1 : 0.45 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
            />
          ))}
        </div>
        <button
          onClick={skip}
          className="text-white/80 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-white/10 active:scale-95 transition"
        >
          Skip
        </button>
      </div>

      {/* 3D scene */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <motion.div
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          }}
          className="w-full max-w-md aspect-[3/4] relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id + "-scene"}
              initial={{ opacity: 0, scale: 0.85, rotateY: -25 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.95, rotateY: 25 }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              {slide.scene(true)}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Glass info panel + CTA */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 px-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 22px)" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id + "-text"}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl backdrop-blur-2xl bg-white/15 border border-white/30 px-5 pt-5 pb-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/25 text-white text-[10px] font-semibold tracking-wider uppercase">
              <slide.icon className="w-3 h-3" />
              {slide.badge}
            </span>
            <h2 className="mt-2.5 text-white text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
              {slide.title}
            </h2>
            <p className="mt-1.5 text-white/85 text-[14px] leading-relaxed">
              {slide.body}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={next}
                className="flex-1 h-12 rounded-2xl bg-white text-neutral-900 font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
              >
                {slide.cta}
                {isLast ? <ArrowRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isLast && (
                <button
                  onClick={() => finish("login")}
                  className="h-12 px-4 rounded-2xl bg-white/20 border border-white/30 text-white font-medium text-[14px] active:scale-95 transition"
                >
                  Sign in
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ============== 3D Scenes — pure CSS/SVG, no external assets ============== */

const Card3D = ({
  children,
  z = 0,
  rotate = 0,
  delay = 0,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  z?: number;
  rotate?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30, rotateZ: rotate - 15 }}
    animate={{ opacity: 1, y: 0, rotateZ: rotate }}
    transition={{ delay, type: "spring", stiffness: 80, damping: 14 }}
    className={`absolute rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] ${className}`}
    style={{
      transform: `translateZ(${z}px) rotate(${rotate}deg)`,
      transformStyle: "preserve-3d",
      ...style,
    }}
  >
    {children}
  </motion.div>
);

const ArtScene = ({ active }: { active: boolean }) => (
  <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
    {/* Back paper */}
    <Card3D
      z={-60}
      rotate={-8}
      className="w-56 h-72 bg-white"
      style={{ left: "12%", top: "18%" }}
    >
      <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-neutral-300" />
    </Card3D>
    {/* Caricature card */}
    <Card3D
      z={20}
      rotate={3}
      delay={0.15}
      className="w-60 h-80 overflow-hidden"
      style={{
        right: "10%",
        top: "10%",
        background: "linear-gradient(135deg, #fff7ed 0%, #fde68a 100%)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <FaceDoodle />
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-semibold text-neutral-700">
        <span>HAND-DRAWN</span>
        <span>· LIVE</span>
      </div>
    </Card3D>
    {/* Brush */}
    <motion.div
      className="absolute"
      style={{ right: "8%", bottom: "12%", transformStyle: "preserve-3d", transform: "translateZ(80px)" }}
      animate={active ? { rotate: [0, 12, -8, 0], y: [0, -6, 0] } : {}}
      transition={{ duration: 4, repeat: Infinity }}
    >
      <div className="w-3 h-24 rounded-full bg-gradient-to-b from-amber-200 to-amber-700 shadow-lg" />
      <div className="w-4 h-6 -mt-1 rounded-b-full bg-neutral-800 shadow-lg" />
    </motion.div>
    {/* Floating sparkles */}
    {[...Array(6)].map((_, i) => (
      <motion.span
        key={i}
        className="absolute w-1.5 h-1.5 rounded-full bg-white"
        style={{
          left: `${20 + i * 11}%`,
          top: `${15 + (i * 13) % 60}%`,
          boxShadow: "0 0 8px rgba(255,255,255,0.9)",
        }}
        animate={{ y: [0, -12, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
);

const EventScene = ({ active }: { active: boolean }) => (
  <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
    {/* Stage card */}
    <Card3D
      z={-30}
      rotate={-3}
      className="w-72 h-56 overflow-hidden"
      style={{
        left: "8%",
        top: "22%",
        background: "linear-gradient(180deg, #1e1b4b 0%, #4c1d95 100%)",
      }}
    >
      {/* Spotlights */}
      <div className="absolute -top-4 left-6 w-16 h-32 bg-white/30 blur-xl rotate-12" />
      <div className="absolute -top-4 right-6 w-16 h-32 bg-white/30 blur-xl -rotate-12" />
      {/* Mini guest avatars */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {["#fbbf24", "#ec4899", "#06b6d4", "#10b981"].map((c, i) => (
          <motion.div
            key={i}
            className="w-7 h-7 rounded-full border-2 border-white"
            style={{ background: c }}
            animate={active ? { y: [0, -3, 0] } : {}}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </Card3D>
    {/* Confetti card */}
    <Card3D
      z={40}
      rotate={5}
      delay={0.2}
      className="w-44 h-44"
      style={{
        right: "10%",
        top: "12%",
        background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-5xl">🎉</div>
    </Card3D>
    {/* Mic mini-card */}
    <Card3D
      z={60}
      rotate={-10}
      delay={0.35}
      className="w-32 h-32 flex items-center justify-center"
      style={{ left: "22%", bottom: "10%", background: "white" }}
    >
      <div className="text-4xl">🎤</div>
    </Card3D>
  </div>
);

const BookScene = ({ active }: { active: boolean }) => (
  <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
    {/* Phone mockup */}
    <Card3D
      z={20}
      rotate={-4}
      className="w-52 h-[340px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)",
        border: "6px solid #1f1f2e",
        borderRadius: "32px",
      }}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-neutral-700" />
      <div className="absolute inset-x-3 top-8 space-y-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "70%" }}
          transition={{ delay: 0.4 }}
          className="h-3 rounded-full bg-violet-300"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "90%" }}
          transition={{ delay: 0.55 }}
          className="h-3 rounded-full bg-violet-200"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "55%" }}
          transition={{ delay: 0.7 }}
          className="h-3 rounded-full bg-violet-200"
        />
      </div>
      <div className="absolute inset-x-3 top-32 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 + i * 0.08 }}
            className="aspect-square rounded-xl bg-gradient-to-br from-violet-200 to-pink-200"
          />
        ))}
      </div>
      <motion.div
        className="absolute bottom-4 left-3 right-3 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white text-xs font-bold"
        animate={active ? { scale: [1, 1.04, 1] } : {}}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        BOOK NOW
      </motion.div>
    </Card3D>
    {/* Floating coin */}
    <motion.div
      className="absolute"
      style={{ right: "16%", top: "18%", transformStyle: "preserve-3d", transform: "translateZ(80px)" }}
      animate={active ? { rotateY: [0, 360], y: [0, -10, 0] } : {}}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-xl flex items-center justify-center text-amber-900 font-bold">
        ₹
      </div>
    </motion.div>
    <motion.div
      className="absolute"
      style={{ left: "14%", bottom: "20%", transformStyle: "preserve-3d", transform: "translateZ(60px)" }}
      animate={active ? { y: [0, -8, 0], rotate: [0, 8, 0] } : {}}
      transition={{ duration: 2.4, repeat: Infinity }}
    >
      <div className="px-3 py-1.5 rounded-full bg-white shadow-lg text-[11px] font-bold text-violet-700">
        ✓ Free signup
      </div>
    </motion.div>
  </div>
);

const FaceDoodle = () => (
  <svg viewBox="0 0 100 100" className="w-32 h-32">
    <circle cx="50" cy="48" r="32" fill="#fde68a" stroke="#78350f" strokeWidth="2.5" />
    <circle cx="40" cy="44" r="3" fill="#78350f" />
    <circle cx="60" cy="44" r="3" fill="#78350f" />
    <path d="M38 60 Q50 70 62 60" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M28 35 Q35 22 50 25" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

export default AppWelcome3D;
