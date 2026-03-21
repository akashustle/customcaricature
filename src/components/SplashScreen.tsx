import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = {
  terracotta: "hsl(22 78% 52%)",
  gold: "hsl(38 88% 50%)",
  brown: "hsl(28 14% 16%)",
  cream: "hsl(38 35% 95%)",
  coral: "hsl(12 72% 62%)",
  teal: "hsl(175 55% 45%)",
  purple: "hsl(280 55% 55%)",
};

// Fun caricature-style shapes
const CaricatureBlob = ({ delay, x, y, color, size }: { delay: number; x: string; y: string; color: string; size: number }) => (
  <motion.div
    className="absolute rounded-full"
    style={{ left: x, top: y, width: size, height: size, background: color, filter: "blur(1px)" }}
    initial={{ scale: 0, rotate: -45 }}
    animate={{
      scale: [0, 1.2, 1, 1.1, 1],
      rotate: [-45, 15, -10, 5, 0],
      y: [0, -15, 5, -8, 0],
    }}
    transition={{ duration: 2, delay, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
  />
);

const PencilStroke = ({ delay, startX, endX, y }: { delay: number; startX: number; endX: number; y: string }) => (
  <motion.div
    className="absolute h-[3px] rounded-full"
    style={{
      left: startX,
      top: y,
      background: `linear-gradient(90deg, ${COLORS.terracotta}, ${COLORS.gold})`,
      transformOrigin: "left center",
    }}
    initial={{ width: 0, opacity: 0 }}
    animate={{ width: endX - startX, opacity: [0, 0.7, 0.4] }}
    transition={{ duration: 1.2, delay, ease: "easeOut" }}
  />
);

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 200);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(() => setStep(4), 1800);
    const t5 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, hsl(22 78% 52% / 0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, hsl(38 88% 50% / 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, hsl(280 55% 55% / 0.05) 0%, transparent 60%),
              linear-gradient(145deg, #fdf8f3 0%, #f8eed8 30%, #fef0e2 60%, #fdf8f3 100%)
            `,
          }}
        >
          {/* Vibrant decorative blobs */}
          <CaricatureBlob delay={0.1} x="8%" y="12%" color="hsl(22 78% 52% / 0.2)" size={80} />
          <CaricatureBlob delay={0.3} x="78%" y="8%" color="hsl(38 88% 50% / 0.18)" size={60} />
          <CaricatureBlob delay={0.5} x="85%" y="65%" color="hsl(280 55% 55% / 0.12)" size={50} />
          <CaricatureBlob delay={0.2} x="5%" y="70%" color="hsl(175 55% 45% / 0.15)" size={70} />
          <CaricatureBlob delay={0.7} x="45%" y="85%" color="hsl(12 72% 62% / 0.14)" size={45} />
          <CaricatureBlob delay={0.4} x="60%" y="15%" color="hsl(22 78% 52% / 0.1)" size={35} />

          {/* Pencil strokes */}
          <PencilStroke delay={0.8} startX={50} endX={200} y="25%" />
          <PencilStroke delay={1.0} startX={250} endX={380} y="78%" />
          <PencilStroke delay={1.2} startX={150} endX={320} y="90%" />

          {/* Floating sparkle dots */}
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3 + Math.random() * 4,
                height: 3 + Math.random() * 4,
                background: [COLORS.terracotta, COLORS.gold, COLORS.coral, COLORS.teal, COLORS.purple][i % 5],
                top: `${10 + Math.random() * 80}%`,
                left: `${5 + Math.random() * 90}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.8, 0],
                y: [0, -40, -80],
              }}
              transition={{ duration: 2.5, delay: 0.3 + i * 0.12, repeat: Infinity, repeatDelay: 1.5 }}
            />
          ))}

          {/* Rotating ring decoration */}
          <motion.div
            className="absolute w-[300px] h-[300px] rounded-full border-2 border-dashed"
            style={{ borderColor: "hsl(22 78% 52% / 0.12)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute w-[220px] h-[220px] rounded-full border-2 border-dashed"
            style={{ borderColor: "hsl(38 88% 50% / 0.1)" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />

          {/* Main Logo with bounce-in */}
          <motion.div
            initial={{ scale: 0, rotate: -180, y: 50 }}
            animate={step >= 1 ? { scale: 1, rotate: 0, y: 0 } : {}}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="relative z-10"
          >
            {/* Glow ring */}
            <motion.div
              className="absolute -inset-3 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, ${COLORS.terracotta}40, ${COLORS.gold}40, ${COLORS.purple}20, ${COLORS.teal}20, ${COLORS.terracotta}40)`,
                filter: "blur(12px)",
              }}
              animate={step >= 2 ? { rotate: 360 } : {}}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            {/* Pulsing halo */}
            <motion.div
              className="absolute -inset-5 rounded-full"
              animate={step >= 2 ? {
                boxShadow: [
                  `0 0 0 0 hsl(22 78% 52% / 0)`,
                  `0 0 30px 15px hsl(22 78% 52% / 0.15)`,
                  `0 0 0 0 hsl(22 78% 52% / 0)`,
                ],
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <img
              src="/logo.png"
              alt="Creative Caricature Club"
              className="w-32 h-32 rounded-full object-cover relative z-10"
              style={{
                border: `4px solid hsl(22 78% 52% / 0.5)`,
                boxShadow: `0 12px 40px hsl(28 14% 16% / 0.2), 0 0 0 8px hsl(38 88% 50% / 0.08)`,
              }}
            />
          </motion.div>

          {/* Brand Name — Caricaturist style */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.8 }}
            animate={step >= 2 ? { y: 0, opacity: 1, scale: 1 } : {}}
            transition={{ type: "spring", stiffness: 150, damping: 15 }}
            className="text-center mt-7 z-10"
          >
            <h1
              className="text-4xl md:text-5xl font-bold"
              style={{
                fontFamily: "'Dancing Script', cursive",
                background: `linear-gradient(135deg, ${COLORS.brown}, ${COLORS.terracotta}, ${COLORS.gold})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 4px hsl(28 14% 16% / 0.1))",
              }}
            >
              Creative Caricature Club
            </h1>
          </motion.div>

          {/* Tagline with typewriter effect */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-3 z-10 flex items-center gap-2"
          >
            <motion.span
              className="inline-block w-8 h-[2px] rounded-full"
              style={{ background: COLORS.terracotta }}
              initial={{ width: 0 }}
              animate={step >= 3 ? { width: 32 } : {}}
              transition={{ duration: 0.5 }}
            />
            <p
              className="text-sm tracking-[0.15em] uppercase font-semibold"
              style={{ fontFamily: "'Nunito', sans-serif", color: "hsl(28 10% 42%)" }}
            >
              Art • Events • Workshops
            </p>
            <motion.span
              className="inline-block w-8 h-[2px] rounded-full"
              style={{ background: COLORS.gold }}
              initial={{ width: 0 }}
              animate={step >= 3 ? { width: 32 } : {}}
              transition={{ duration: 0.5 }}
            />
          </motion.div>

          {/* Vibrant progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step >= 1 ? { opacity: 1 } : {}}
            className="mt-8 z-10"
          >
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ width: 160, background: "hsl(34 18% 86% / 0.6)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${COLORS.terracotta}, ${COLORS.gold}, ${COLORS.coral}, ${COLORS.teal})`,
                  backgroundSize: "200% 100%",
                }}
                initial={{ width: "0%" }}
                animate={{ width: "100%", backgroundPosition: ["0% 0%", "100% 0%"] }}
                transition={{ duration: 2.4, ease: "easeInOut" }}
              />
            </div>
          </motion.div>

          {/* Version badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step >= 4 ? { opacity: 0.5 } : {}}
            className="absolute bottom-6 z-10"
          >
            <p className="text-xs font-sans" style={{ color: "hsl(28 10% 55%)" }}>
              Powered by CCC Platform
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
