import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 150);
    const t2 = setTimeout(() => setStep(2), 600);
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
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(38 35% 97%) 0%, hsl(38 40% 93%) 40%, hsl(28 25% 92%) 70%, hsl(38 35% 95%) 100%)",
          }}
        >
          {/* Minimal decorative circles */}
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, hsl(22 78% 52% / 0.06) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[250px] h-[250px] rounded-full"
            style={{ background: "radial-gradient(circle, hsl(38 88% 50% / 0.08) 0%, transparent 70%)" }}
            animate={{ scale: [1.1, 1, 1.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative z-10 mb-6"
          >
            <motion.div
              className="absolute -inset-2 rounded-full"
              style={{ background: "conic-gradient(from 0deg, hsl(22 78% 52% / 0.15), hsl(38 88% 50% / 0.15), hsl(22 78% 52% / 0.15))" }}
              animate={step >= 2 ? { rotate: 360 } : {}}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <img
              src="/logo.png"
              alt="Creative Caricature Club"
              className="w-24 h-24 rounded-full object-cover relative z-10"
              style={{
                border: "3px solid hsl(22 78% 52% / 0.3)",
                boxShadow: "0 8px 30px hsl(28 14% 16% / 0.12)",
              }}
            />
          </motion.div>

          {/* Brand Name */}
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 120, damping: 12 }}
            className="text-3xl md:text-4xl font-bold relative z-10"
            style={{
              fontFamily: "'Dancing Script', cursive",
              background: "linear-gradient(135deg, hsl(28 14% 16%), hsl(22 78% 52%), hsl(38 88% 50%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Creative Caricature Club
          </motion.h1>

          {/* Tagline */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="mt-2 z-10 flex items-center gap-3"
          >
            <div className="w-6 h-px bg-primary/30 rounded-full" />
            <p className="text-xs tracking-[0.2em] uppercase font-semibold" style={{ color: "hsl(28 10% 48%)" }}>
              Art • Events • Workshops
            </p>
            <div className="w-6 h-px bg-primary/30 rounded-full" />
          </motion.div>

          {/* Progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step >= 1 ? { opacity: 1 } : {}}
            className="mt-8 z-10"
          >
            <div className="h-1 rounded-full overflow-hidden" style={{ width: 120, background: "hsl(34 18% 88% / 0.5)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(22 78% 52%), hsl(38 88% 50%))" }}
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
