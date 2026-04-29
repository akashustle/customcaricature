import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Light, premium 3D PWA splash — layered parallax cards, typewriter calligraphy,
 * caricature image previews. Shown ONLY when launched as installed PWA.
 */

const TAGLINES = [
  "Hand-drawn caricatures",
  "By real artists, for real moments",
  "Welcome to the Club ✨",
];

// Inline SVG caricature thumbnails (no external assets, instant load)
const Face = ({ bg, accent }: { bg: string; accent: string }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <rect width="100" height="100" fill={bg} rx="12" />
    <circle cx="50" cy="46" r="26" fill="#fde68a" stroke={accent} strokeWidth="2.5" />
    <circle cx="40" cy="42" r="2.8" fill={accent} />
    <circle cx="60" cy="42" r="2.8" fill={accent} />
    <path d="M38 58 Q50 68 62 58" stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M28 33 Q35 22 50 24" stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

const Typewriter = ({ text, onDone }: { text: string; onDone?: () => void }) => {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        if (onDone) window.setTimeout(onDone, 700);
      }
    }, 55);
    return () => window.clearInterval(id);
  }, [text, onDone]);
  return (
    <span className="font-calligraphy" style={{ color: "hsl(25 35% 22%)" }}>
      {shown}
      <span className="inline-block w-[2px] h-[0.9em] align-middle ml-0.5 bg-amber-700 animate-pulse" />
    </span>
  );
};

const PWASplashScreen = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore iOS Safari
      window.navigator.standalone === true;
    if (!isStandalone) return;
    if (sessionStorage.getItem("ccc_pwa_splash_done") === "1") return;
    setShow(true);
    sessionStorage.setItem("ccc_pwa_splash_done", "1");
  }, []);

  useEffect(() => {
    if (!show) return;
    if (step >= TAGLINES.length) {
      const t = setTimeout(() => setShow(false), 600);
      return () => clearTimeout(t);
    }
  }, [show, step]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[100000] flex flex-col items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, hsl(40 85% 96%) 0%, hsl(28 75% 92%) 45%, hsl(20 70% 88%) 100%)",
          perspective: "1500px",
        }}
      >
        {/* Soft floating glow */}
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-50"
          style={{ background: "hsl(35 95% 75%)" }}
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full blur-3xl opacity-50"
          style={{ background: "hsl(330 85% 88%)" }}
          animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Layered 3D parallax cards */}
        <div className="relative" style={{ perspective: "1500px", transformStyle: "preserve-3d" }}>
          <motion.div
            initial={{ x: -120, y: 20, rotate: -18, opacity: 0 }}
            animate={{ x: -75, y: -10, rotate: -14, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute w-32 h-40 rounded-2xl overflow-hidden shadow-2xl"
            style={{ transform: "translateZ(-40px)", boxShadow: "0 20px 50px hsla(25,40%,30%,0.25)" }}
          >
            <Face bg="hsl(40 90% 90%)" accent="hsl(25 60% 30%)" />
          </motion.div>
          <motion.div
            initial={{ x: 120, y: 20, rotate: 18, opacity: 0 }}
            animate={{ x: 75, y: -10, rotate: 14, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute w-32 h-40 rounded-2xl overflow-hidden shadow-2xl"
            style={{ transform: "translateZ(-40px)", boxShadow: "0 20px 50px hsla(25,40%,30%,0.25)" }}
          >
            <Face bg="hsl(330 80% 92%)" accent="hsl(330 60% 35%)" />
          </motion.div>
          <motion.div
            initial={{ scale: 0.6, rotateY: -25, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 110, damping: 14, delay: 0.2 }}
            className="relative w-36 h-44 rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(45 95% 78%), hsl(28 90% 70%))",
              boxShadow: "0 30px 70px hsla(25,40%,30%,0.4), inset 0 -8px 16px hsla(25,40%,20%,0.15)",
              transform: "translateZ(0px)",
            }}
          >
            <Face bg="transparent" accent="hsl(25 60% 25%)" />
          </motion.div>
        </div>

        {/* Brand title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="font-calligraphy text-4xl sm:text-5xl mt-12 mb-3 text-center"
          style={{ color: "hsl(25 30% 20%)" }}
        >
          Creative Caricature Club
        </motion.h1>

        {/* Typewriter tagline (advances through 3 phrases) */}
        <div className="text-2xl sm:text-3xl text-center min-h-[1.4em] px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <Typewriter
                text={TAGLINES[Math.min(step, TAGLINES.length - 1)]}
                onDone={() => setStep((s) => s + 1)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Loader dots */}
        <div className="absolute bottom-12 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: "hsl(28 75% 45%)" }}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWASplashScreen;
