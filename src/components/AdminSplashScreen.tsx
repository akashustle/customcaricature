import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GUIDE_LINES = [
  "Welcome to Creative Caricature Club™ Admin Console",
  "Manage orders, artists & events from one place",
  "Track revenue, analytics & customer enquiries",
  "Assign artists, handle payouts & approve requests",
  "Monitor live chat, push notifications & support",
  "Full control — always secure, always fast",
  "Let's get you started…",
];

const TOTAL_DURATION = 15000;

const TypewriterLine = ({ text, onDone, delay = 0 }: { text: string; onDone?: () => void; delay?: number }) => {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, 38);
    return () => clearInterval(iv);
  }, [started, text, onDone]);

  if (!started) return null;

  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center font-calligraphy text-lg md:text-2xl leading-relaxed"
      style={{ color: "hsl(25 20% 18%)" }}
    >
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-[2px] h-5 ml-0.5 align-middle"
        style={{ background: "hsl(25 25% 32%)" }}
      />
    </motion.p>
  );
};

const AdminSplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState(0); // 0=logo intro, 1=typing, 2=outro
  const [currentLine, setCurrentLine] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("admin_splash_shown")) {
      setShow(false);
      onComplete();
      return;
    }

    // Phase 0: logo intro (2s)
    const t1 = setTimeout(() => setPhase(1), 2000);
    // End splash
    const tEnd = setTimeout(() => {
      setPhase(2);
      sessionStorage.setItem("admin_splash_shown", "true");
      setTimeout(() => {
        setShow(false);
        onComplete();
      }, 800);
    }, TOTAL_DURATION);

    // Progress bar
    const startTime = Date.now();
    const piv = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / TOTAL_DURATION) * 100, 100));
    }, 50);

    return () => {
      clearTimeout(t1);
      clearTimeout(tEnd);
      clearInterval(piv);
    };
  }, [onComplete]);

  const handleLineDone = useCallback(() => {
    setCompletedLines(prev => [...prev, GUIDE_LINES[currentLine]]);
    setTimeout(() => {
      setCurrentLine(prev => prev + 1);
    }, 400);
  }, [currentLine]);

  const handleSkip = () => {
    sessionStorage.setItem("admin_splash_shown", "true");
    setShow(false);
    onComplete();
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(145deg, hsl(30 43% 97%), hsl(30 40% 94%), hsl(25 35% 95%))" }}
        >
          {/* Animated grid */}
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(hsla(25,25%,32%,0.06) 1px, transparent 1px), linear-gradient(90deg, hsla(25,25%,32%,0.06) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
            animate={{ backgroundPosition: ["0px 0px", "50px 50px"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Large floating orbs */}
          {[
            { size: 400, x: "-10%", y: "-15%", color: "hsla(35,50%,60%,0.15)", dur: 15 },
            { size: 350, x: "70%", y: "60%", color: "hsla(25,25%,32%,0.08)", dur: 18 },
            { size: 300, x: "50%", y: "-20%", color: "hsla(18,40%,55%,0.10)", dur: 12 },
            { size: 250, x: "-5%", y: "70%", color: "hsla(35,50%,60%,0.12)", dur: 20 },
            { size: 180, x: "85%", y: "15%", color: "hsla(25,25%,32%,0.06)", dur: 16 },
          ].map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{ width: orb.size, height: orb.size, left: orb.x, top: orb.y, background: orb.color, filter: "blur(80px)" }}
              animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
            />
          ))}

          {/* Floating sparkle particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`p-${i}`}
              className="absolute rounded-full"
              style={{
                width: 3 + (i % 4) * 2,
                height: 3 + (i % 4) * 2,
                left: `${5 + (i * 4.7) % 90}%`,
                top: `${5 + (i * 5.3) % 90}%`,
                background: i % 3 === 0 ? "hsla(35,50%,60%,0.4)" : i % 3 === 1 ? "hsla(25,25%,32%,0.3)" : "hsla(18,40%,55%,0.35)",
              }}
              animate={{
                y: [0, -40 - (i % 3) * 20, 0],
                x: [0, (i % 2 === 0 ? 15 : -15), 0],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{ duration: 3 + (i % 4) * 1.5, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}

          {/* Radial light pulse */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, hsla(35,50%,60%,0.2) 0%, transparent 60%)" }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.05, 0.2] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          {/* Rotating ring */}
          <motion.div
            className="absolute w-[300px] h-[300px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              <circle cx="150" cy="150" r="140" fill="none" stroke="hsla(25,25%,32%,0.04)" strokeWidth="1" strokeDasharray="8 12" />
              <circle cx="150" cy="150" r="120" fill="none" stroke="hsla(35,50%,60%,0.06)" strokeWidth="0.5" strokeDasharray="4 8" />
            </svg>
          </motion.div>

          {/* ===== CONTENT ===== */}
          <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto px-6 w-full">

            {/* Logo entrance */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0, rotate: -30 }}
              animate={phase >= 0 ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.3 }}
            >
              {/* Glow behind logo */}
              <motion.div
                className="absolute -inset-8 rounded-full"
                style={{ background: "radial-gradient(circle, hsla(35,50%,60%,0.35), transparent 70%)" }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.15, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {/* Rotating gear */}
              <motion.div
                className="absolute -inset-8 z-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <svg viewBox="0 0 120 120" className="w-full h-full opacity-[0.08]">
                  <path
                    d="M60 8 L64 0 L68 8 L72 2 L74 10 L80 6 L80 14 L86 12 L84 20 L90 20 L88 28 L94 28 L90 34 L96 36 L92 42 L98 46 L92 50 L96 56 L90 58 L92 64 L86 64 L88 70 L82 70 L84 76 L78 74 L78 80 L72 78 L70 84 L66 80 L62 86 L60 80 L56 86 L54 80 L48 84 L48 78 L42 80 L42 74 L36 76 L38 70 L32 70 L34 64 L28 64 L30 58 L24 56 L28 50 L22 46 L28 42 L24 36 L30 34 L26 28 L32 28 L30 20 L36 20 L34 14 L40 14 L40 6 L46 10 L48 2 L52 8 L56 0 L60 8 Z"
                    fill="none" stroke="hsl(25 25% 32%)" strokeWidth="1.5"
                  />
                </svg>
              </motion.div>
              {/* Pulse ring */}
              <motion.div
                className="absolute -inset-4 rounded-full border"
                style={{ borderColor: "hsla(35,50%,60%,0.15)" }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <img
                src="/logo.png"
                alt="CCC"
                className="admin-logo-frame w-28 h-28 object-cover relative z-10"
                style={{ boxShadow: "0 0 60px hsla(35,50%,60%,0.35), 0 0 120px hsla(18,40%,55%,0.15)" }}
               loading="eager" decoding="async" fetchPriority="high" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={phase >= 0 ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
              className="text-3xl md:text-5xl font-black tracking-tight mb-2 text-center"
              style={{ color: "hsl(25 20% 18%)", fontFamily: "'Nunito', sans-serif" }}
            >
              CCC Admin
            </motion.h1>

            <motion.div
              initial={{ width: 0 }}
              animate={phase >= 0 ? { width: 80 } : {}}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="h-[2px] rounded-full mb-6"
              style={{ background: "linear-gradient(90deg, transparent, hsl(25 25% 32%), transparent)" }}
            />

            {/* Typewriter guide lines */}
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full space-y-3 min-h-[200px] flex flex-col items-center justify-center"
              >
                {/* Show completed lines faded */}
                {completedLines.map((line, i) => (
                  <motion.p
                    key={`done-${i}`}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0.35, y: -2 }}
                    transition={{ duration: 0.5 }}
                    className="text-center font-calligraphy text-base md:text-xl"
                    style={{ color: "hsl(25 20% 18%)" }}
                  >
                    {line}
                  </motion.p>
                ))}

                {/* Current typing line */}
                {currentLine < GUIDE_LINES.length && (
                  <TypewriterLine
                    key={`typing-${currentLine}`}
                    text={GUIDE_LINES[currentLine]}
                    onDone={handleLineDone}
                    delay={currentLine === 0 ? 300 : 0}
                  />
                )}
              </motion.div>
            )}

            {/* Progress bar */}
            <div className="mt-8 w-full max-w-[200px]">
              <div
                className="h-[3px] rounded-full overflow-hidden"
                style={{ background: "hsla(25,20%,18%,0.08)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, hsl(25 25% 32%), hsl(18 40% 55%), hsl(35 50% 60%))",
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            {/* Skip button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 3 }}
              whileHover={{ opacity: 1 }}
              onClick={handleSkip}
              className="mt-6 text-[11px] tracking-widest uppercase font-semibold transition-opacity"
              style={{ color: "hsl(25 20% 18%)" }}
            >
              Skip →
            </motion.button>
          </div>

          {/* Bottom branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 2 }}
            className="absolute bottom-6 z-10 text-[9px] tracking-[0.4em] uppercase font-semibold"
            style={{ color: "hsl(25 20% 18%)" }}
          >
            Creative Caricature Club™
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminSplashScreen;
