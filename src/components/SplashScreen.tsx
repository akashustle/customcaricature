import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);
  
  // Don't show main splash on admin routes
  const isAdminRoute = typeof window !== "undefined" && ["/customcad75", "/admin-panel", "/admin-login", "/cccworkshop2006", "/workshop-admin-panel"].some(r => window.location.pathname.startsWith(r));

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1100);
    const t4 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 400);
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-background"
        >
          {/* Subtle warm radial glow */}
          <div className="absolute inset-0 bg-background" />

          {/* Floating dots */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/10"
              style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ y: [0, -12, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}

          {/* Logo */}
          <motion.div className="relative z-10 mb-6">
            <motion.div
              className="absolute -inset-3 rounded-full bg-primary/5"
              animate={step >= 2 ? { scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
            >
              <img
                src="/logo.png"
                alt="Creative Caricature Club"
                className="w-24 h-24 rounded-full object-cover relative z-10 border-2 border-border shadow-lg"
              />
            </motion.div>
          </motion.div>

          {/* Brand Name */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="relative z-10 text-3xl md:text-4xl font-bold text-foreground font-calligraphy"
          >
            Creative Caricature Club
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="mt-2 z-10 text-[11px] tracking-[0.3em] uppercase font-semibold text-muted-foreground font-body"
          >
            Art • Events • Workshops
          </motion.p>

          {/* Progress bar */}
          <motion.div initial={{ opacity: 0 }} animate={step >= 1 ? { opacity: 1 } : {}} className="mt-8 z-10">
            <div className="h-0.5 rounded-full overflow-hidden bg-border" style={{ width: 120 }}>
              <motion.div
                className="h-full rounded-full bg-primary/50"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
