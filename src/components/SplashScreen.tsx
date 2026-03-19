import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 800);
    const t3 = setTimeout(() => setStep(3), 1400);
    const t4 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 600);
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(145deg, #fdf8f3 0%, #f8eed8 40%, #fdf0e8 70%, #fdf8f3 100%)" }}
        >
          {/* Floating orbs */}
          <motion.div
            className="absolute w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(24 80% 55% / 0.15), transparent)", top: "10%", right: "10%" }}
            animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute w-48 h-48 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(30 60% 50% / 0.12), transparent)", bottom: "15%", left: "5%" }}
            animate={{ scale: [1.2, 1, 1.2], y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-32 h-32 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(38 85% 52% / 0.1), transparent)", top: "40%", left: "20%" }}
            animate={{ x: [0, 30, 0], y: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          {/* Particle dots */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: i % 3 === 0 ? "hsl(24 80% 55%)" : i % 3 === 1 ? "hsl(38 85% 52%)" : "hsl(30 10% 18%)",
                top: `${15 + Math.random() * 70}%`,
                left: `${10 + Math.random() * 80}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0, 1.5, 0], y: [0, -30, -60] }}
              transition={{ duration: 2.5, delay: 0.2 + i * 0.15, repeat: Infinity, repeatDelay: 1 }}
            />
          ))}

          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative"
          >
            <motion.div
              animate={step >= 2 ? { boxShadow: ["0 0 0 0 hsl(24 80% 55% / 0)", "0 0 40px 10px hsl(24 80% 55% / 0.2)", "0 0 0 0 hsl(24 80% 55% / 0)"] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-full"
            >
              <img
                src="/logo.png"
                alt="CCC"
                className="w-28 h-28 rounded-full object-cover"
                style={{
                  border: "4px solid hsl(24 80% 55% / 0.4)",
                  boxShadow: "0 8px 32px hsl(30 10% 18% / 0.15), inset 0 -2px 6px hsl(24 80% 55% / 0.1)",
                }}
              />
            </motion.div>
          </motion.div>

          {/* Brand name */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center mt-6"
          >
            <h1
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: "'Dancing Script', cursive", color: "hsl(30 10% 18%)" }}
            >
              Creative Caricature Club
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="mt-2 text-sm tracking-wide"
            style={{ fontFamily: "'Nunito', sans-serif", color: "hsl(30 8% 48%)" }}
          >
            Custom Caricatures • Live Events • Workshops
          </motion.p>

          {/* Progress bar */}
          <motion.div
            className="mt-8 h-1 rounded-full overflow-hidden"
            style={{ width: "120px", background: "hsl(35 18% 86%)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, hsl(24 80% 55%), hsl(38 85% 52%), hsl(30 10% 18%))" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
