import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Skip splash if already visited this session
    const visited = sessionStorage.getItem("splash_shown");
    if (visited) {
      setShow(false);
      onComplete();
      return;
    }

    const t1 = setTimeout(() => setStep(1), 200);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1300);
    const t4 = setTimeout(() => setStep(4), 1800);
    const t5 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("splash_shown", "1");
      setTimeout(onComplete, 500);
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onComplete]);

  // SVG pencil stroke path for caricature feel
  const strokePath = "M10,80 Q52,10 80,80 T150,80";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)/0.5) 50%, hsl(var(--background)) 100%)" }}
        >
          {/* Floating abstract caricature shapes */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 6 + i * 3,
                height: 6 + i * 3,
                left: `${10 + i * 11}%`,
                top: `${15 + (i % 4) * 20}%`,
                background: `hsl(var(--primary) / ${0.06 + i * 0.02})`,
              }}
              animate={{
                y: [0, -20 - i * 3, 0],
                x: [0, (i % 2 === 0 ? 8 : -8), 0],
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}

          {/* Sketch stroke lines around logo area */}
          <motion.svg
            width="200" height="100"
            viewBox="0 0 200 100"
            className="absolute z-0 opacity-10"
            style={{ top: "calc(50% - 110px)" }}
          >
            <motion.path
              d={strokePath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={step >= 1 ? { pathLength: 1 } : {}}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            <motion.path
              d="M20,60 Q80,20 160,70"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={step >= 2 ? { pathLength: 1 } : {}}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </motion.svg>

          {/* Logo with sketch reveal */}
          <motion.div className="relative z-10 mb-5">
            {/* Pulsing ring */}
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{ border: "2px solid hsl(var(--primary) / 0.1)" }}
              animate={step >= 2 ? { scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute -inset-6 rounded-full"
              style={{ border: "1px solid hsl(var(--primary) / 0.05)" }}
              animate={step >= 2 ? { scale: [1.1, 1.3, 1.1], opacity: [0.2, 0, 0.2] } : {}}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
            />
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={step >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : {}}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative"
            >
              <motion.div
                animate={step >= 3 ? { y: [0, -4, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <img
                  src="/logo.png"
                  alt="Creative Caricature Club"
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover relative z-10 shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.3)]"
                  style={{ border: "3px solid hsl(var(--border))" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Brand Name - handwriting style reveal */}
          <motion.div className="relative z-10 overflow-hidden">
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
              transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-foreground font-calligraphy"
            >
              Creative Caricature Club
            </motion.h1>
            {/* Underline draw animation */}
            <motion.div
              className="h-[2px] mx-auto mt-1 rounded-full"
              style={{ background: "hsl(var(--primary) / 0.3)" }}
              initial={{ width: 0 }}
              animate={step >= 2 ? { width: "80%" } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="mt-3 z-10 text-[11px] tracking-[0.35em] uppercase font-semibold text-muted-foreground font-body"
          >
            Art • Events • Workshops
          </motion.p>

          {/* Brush stroke progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step >= 1 ? { opacity: 1 } : {}}
            className="mt-8 z-10 relative"
          >
            <div className="h-1 rounded-full overflow-hidden" style={{ width: 140, background: "hsl(var(--border))" }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.4))",
                }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={step >= 4 ? { opacity: 1 } : {}}
              className="text-[9px] text-muted-foreground/40 text-center mt-2 font-mono tracking-wider"
            >
              LOADING EXPERIENCE
            </motion.p>
          </motion.div>

          {/* Pencil sketch corner decorations */}
          <motion.svg
            className="absolute bottom-16 right-10 opacity-[0.06] z-0"
            width="80" height="80" viewBox="0 0 80 80"
          >
            <motion.circle
              cx="40" cy="40" r="30"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={step >= 2 ? { pathLength: 1 } : {}}
              transition={{ duration: 2 }}
            />
          </motion.svg>
          <motion.svg
            className="absolute top-20 left-8 opacity-[0.05] z-0"
            width="60" height="60" viewBox="0 0 60 60"
          >
            <motion.rect
              x="10" y="10" width="40" height="40" rx="8"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={step >= 1 ? { pathLength: 1 } : {}}
              transition={{ duration: 1.8, delay: 0.2 }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
