import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Premium 4–5s cinematic splash, shown on EVERY full page reload.
 * Skipped only on admin / workshop-admin / lil-flea routes.
 * Mobile-first responsive.
 */
const SKIP_ROUTES = [
  "/customcad75",
  "/admin-panel",
  "/admin-login",
  "/cccworkshop2006",
  "/workshop-admin-panel",
  "/lil-flea",
];

const TOTAL_DURATION = 4200;

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0); // 0 logo, 1 title, 2 tagline

  const isSkipRoute =
    typeof window !== "undefined" &&
    SKIP_ROUTES.some((r) => window.location.pathname.startsWith(r));

  useEffect(() => {
    if (isSkipRoute) {
      setShow(false);
      onComplete();
      return;
    }

    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const tEnd = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 600);
    }, TOTAL_DURATION);

    const start = Date.now();
    const piv = setInterval(() => {
      const e = Date.now() - start;
      setProgress(Math.min((e / TOTAL_DURATION) * 100, 100));
    }, 40);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tEnd);
      clearInterval(piv);
    };
  }, [isSkipRoute, onComplete]);

  const handleSkip = () => {
    setShow(false);
    setTimeout(onComplete, 200);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at top, hsl(30 43% 97%), hsl(30 40% 94%) 50%, hsl(25 35% 92%) 100%)",
          }}
        >
          {/* Animated grid */}
          <motion.div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(hsla(25,25%,32%,0.05) 1px, transparent 1px), linear-gradient(90deg, hsla(25,25%,32%,0.05) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
            animate={{ backgroundPosition: ["0px 0px", "44px 44px"] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />

          {/* Floating gradient orbs */}
          {[
            { size: 380, x: "-12%", y: "-18%", c: "hsla(35,55%,60%,0.18)", d: 14 },
            { size: 320, x: "72%", y: "62%", c: "hsla(25,25%,32%,0.10)", d: 17 },
            { size: 260, x: "55%", y: "-22%", c: "hsla(18,45%,55%,0.12)", d: 12 },
            { size: 240, x: "-8%", y: "70%", c: "hsla(35,55%,60%,0.14)", d: 19 },
          ].map((o, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: o.size,
                height: o.size,
                left: o.x,
                top: o.y,
                background: o.c,
                filter: "blur(70px)",
              }}
              animate={{ y: [0, -25, 0], x: [0, 12, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: o.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
            />
          ))}

          {/* Sparkle particles */}
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.div
              key={`sp-${i}`}
              className="absolute rounded-full"
              style={{
                width: 3 + (i % 4) * 2,
                height: 3 + (i % 4) * 2,
                left: `${5 + (i * 5.1) % 90}%`,
                top: `${5 + (i * 5.7) % 90}%`,
                background:
                  i % 3 === 0
                    ? "hsla(35,55%,60%,0.5)"
                    : i % 3 === 1
                    ? "hsla(25,25%,32%,0.35)"
                    : "hsla(18,45%,55%,0.4)",
              }}
              animate={{
                y: [0, -45 - (i % 3) * 18, 0],
                x: [0, i % 2 === 0 ? 14 : -14, 0],
                opacity: [0, 0.85, 0],
                scale: [0.5, 1.4, 0.5],
              }}
              transition={{ duration: 3 + (i % 4) * 1.4, repeat: Infinity, delay: i * 0.35 }}
            />
          ))}

          {/* Radial pulse */}
          <motion.div
            className="absolute w-[420px] h-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsla(35,55%,60%,0.22) 0%, transparent 60%)",
            }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.25, 0.05, 0.25] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          />

          {/* Rotating decorative ring */}
          <motion.div
            className="absolute w-[280px] h-[280px] sm:w-[340px] sm:h-[340px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              <circle
                cx="150"
                cy="150"
                r="140"
                fill="none"
                stroke="hsla(25,25%,32%,0.07)"
                strokeWidth="1"
                strokeDasharray="6 10"
              />
              <circle
                cx="150"
                cy="150"
                r="115"
                fill="none"
                stroke="hsla(35,55%,60%,0.10)"
                strokeWidth="0.6"
                strokeDasharray="3 6"
              />
            </svg>
          </motion.div>

          {/* CONTENT */}
          <div className="relative z-10 flex flex-col items-center max-w-[90vw] px-4">
            {/* Logo */}
            <motion.div
              className="relative mb-6 sm:mb-8"
              initial={{ scale: 0, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 140, damping: 13, delay: 0.2 }}
            >
              <motion.div
                className="absolute -inset-6 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, hsla(35,55%,60%,0.4), transparent 70%)",
                }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity }}
              />
              <motion.div
                className="absolute -inset-3 rounded-full border"
                style={{ borderColor: "hsla(35,55%,60%,0.25)" }}
                animate={{ scale: [1, 1.45, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
              <img
                src="/logo.png"
                alt="Creative Caricature Club"
                className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2"
                style={{
                  borderColor: "hsla(25,25%,32%,0.2)",
                  boxShadow:
                    "0 0 60px hsla(35,55%,60%,0.4), 0 0 120px hsla(18,45%,55%,0.18), inset 0 0 24px hsla(0,0%,100%,0.4)",
                }}
                width={112}
                height={112}
              />
            </motion.div>

            {/* Title */}
            <AnimatePresence>
              {phase >= 1 && (
                <motion.h1
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="font-calligraphy text-3xl sm:text-5xl md:text-6xl text-center leading-tight"
                  style={{
                    color: "hsl(25 20% 18%)",
                    textShadow: "0 2px 20px hsla(35,55%,60%,0.25)",
                  }}
                >
                  Creative Caricature Club
                  <span style={{ color: "hsl(35 55% 50%)" }}>™</span>
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Divider */}
            <motion.div
              initial={{ width: 0 }}
              animate={phase >= 1 ? { width: 90 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-[2px] rounded-full my-4"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(25 25% 32%), transparent)",
              }}
            />

            {/* Tagline */}
            <AnimatePresence>
              {phase >= 2 && (
                <motion.p
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-[10px] sm:text-xs tracking-[0.4em] uppercase font-semibold text-center"
                  style={{ color: "hsl(25 25% 32%)" }}
                >
                  Art • Events • Workshops
                </motion.p>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <div className="mt-8 sm:mt-10 w-[180px] sm:w-[220px]">
              <div
                className="h-[3px] rounded-full overflow-hidden"
                style={{ background: "hsla(25,20%,18%,0.08)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(25 25% 32%), hsl(18 45% 55%), hsl(35 55% 60%))",
                    width: `${progress}%`,
                  }}
                />
              </div>
              <p
                className="mt-2 text-center text-[9px] tracking-[0.3em] uppercase"
                style={{ color: "hsla(25,20%,18%,0.4)" }}
              >
                {progress < 100 ? "Loading experience…" : "Ready"}
              </p>
            </div>

            {/* Skip */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              transition={{ delay: 1.8 }}
              whileHover={{ opacity: 1 }}
              onClick={handleSkip}
              className="mt-5 text-[10px] tracking-[0.3em] uppercase font-semibold transition-opacity"
              style={{ color: "hsl(25 20% 18%)" }}
            >
              Skip →
            </motion.button>
          </div>

          {/* Bottom branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-4 sm:bottom-6 z-10 text-[8px] sm:text-[9px] tracking-[0.4em] uppercase font-semibold"
            style={{ color: "hsl(25 20% 18%)" }}
          >
            Est. Mumbai • India
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
