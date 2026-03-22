import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 600);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 400);
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-background"
        >
          {/* Subtle gradient background */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.06) 0%, transparent 60%)",
          }} />

          {/* Animated line drawing */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <motion.circle cx="200" cy="200" r="120" fill="none" stroke="currentColor" strokeWidth="0.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} />
            <motion.circle cx="200" cy="200" r="80" fill="none" stroke="currentColor" strokeWidth="0.3"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, delay: 0.2 }} />
          </svg>

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={step >= 1 ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative z-10 mb-6"
          >
            <motion.div
              className="absolute -inset-3 rounded-full bg-primary/10"
              animate={step >= 2 ? { scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <img
              src="/logo.png"
              alt="Creative Caricature Club"
              className="w-24 h-24 rounded-full object-cover relative z-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
            />
          </motion.div>

          {/* Brand Name */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="text-2xl md:text-3xl font-bold relative z-10 text-foreground"
            style={{ fontFamily: "'Dancing Script', cursive" }}
          >
            Creative Caricature Club
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={step >= 3 ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="mt-3 z-10 text-[11px] tracking-[0.25em] uppercase font-medium text-muted-foreground"
          >
            Art • Events • Workshops
          </motion.p>

          {/* Minimal progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step >= 1 ? { opacity: 1 } : {}}
            className="mt-8 z-10"
          >
            <div className="h-0.5 rounded-full overflow-hidden bg-border" style={{ width: 120 }}>
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.2, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
