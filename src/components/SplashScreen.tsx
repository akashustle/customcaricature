import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 200);
    const t2 = setTimeout(() => setStep(2), 800);
    const t3 = setTimeout(() => setStep(3), 1400);
    const t4 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 30% 20%, hsl(22 90% 95%) 0%, hsl(38 30% 96%) 30%, hsl(280 20% 96%) 60%, hsl(210 30% 95%) 100%)",
          }}
        >
          {/* Animated paint strokes */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500" preserveAspectRatio="none">
            <motion.path d="M0,250 Q80,180 160,220 T320,200 T500,250" fill="none" stroke="hsl(22 78% 52% / 0.08)" strokeWidth="40" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} />
            <motion.path d="M0,300 Q120,340 250,280 T500,320" fill="none" stroke="hsl(280 50% 60% / 0.05)" strokeWidth="30" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, delay: 0.3 }} />
            <motion.path d="M50,100 Q200,60 350,130 T500,80" fill="none" stroke="hsl(38 88% 50% / 0.06)" strokeWidth="20" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.6 }} />
          </svg>

          {/* Floating color dots */}
          {[
            { color: "hsl(22 78% 52%)", size: 8, x: "20%", y: "25%", delay: 0 },
            { color: "hsl(280 50% 60%)", size: 6, x: "75%", y: "20%", delay: 0.5 },
            { color: "hsl(38 88% 50%)", size: 10, x: "65%", y: "70%", delay: 1 },
            { color: "hsl(152 55% 40%)", size: 5, x: "15%", y: "65%", delay: 0.8 },
            { color: "hsl(340 55% 58%)", size: 7, x: "80%", y: "50%", delay: 0.3 },
          ].map((dot, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{ width: dot.size, height: dot.size, backgroundColor: dot.color, left: dot.x, top: dot.y, opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0], scale: [0, 1.5, 0], y: [0, -30, -60] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: dot.delay, ease: "easeOut" }}
            />
          ))}

          {/* Spinning artistic ring */}
          <motion.div className="absolute w-[280px] h-[280px] rounded-full"
            style={{ border: "2px dashed hsl(22 78% 52% / 0.12)" }}
            animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} />
          <motion.div className="absolute w-[220px] h-[220px] rounded-full"
            style={{ border: "1.5px solid hsl(280 50% 60% / 0.08)" }}
            animate={{ rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative z-10 mb-5"
          >
            {/* Glow */}
            <motion.div className="absolute -inset-4 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(22 78% 52% / 0.15) 0%, transparent 70%)" }}
              animate={step >= 2 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }} />

            {/* Pencil accent */}
            <motion.div className="absolute -top-3 -right-3 z-20 text-2xl"
              initial={{ opacity: 0, scale: 0, rotate: -45 }}
              animate={step >= 2 ? { opacity: 1, scale: 1, rotate: 0 } : {}}
              transition={{ delay: 0.2, type: "spring" }}>
              ✏️
            </motion.div>
            <motion.div className="absolute -bottom-2 -left-3 z-20 text-xl"
              initial={{ opacity: 0, scale: 0 }}
              animate={step >= 2 ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.4, type: "spring" }}>
              🎨
            </motion.div>

            <img
              src="/logo.png"
              alt="Creative Caricature Club"
              className="w-28 h-28 rounded-full object-cover relative z-10"
              style={{
                border: "4px solid hsl(22 78% 52% / 0.5)",
                boxShadow: "0 16px 50px hsl(22 78% 52% / 0.2), 0 0 0 8px hsl(38 30% 96% / 0.6)",
              }}
            />
          </motion.div>

          {/* Brand Name */}
          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 120, damping: 12 }}
            className="text-3xl md:text-4xl font-bold relative z-10"
            style={{
              fontFamily: "'Dancing Script', cursive",
              background: "linear-gradient(135deg, hsl(28 14% 16%), hsl(22 78% 52%), hsl(280 50% 60%), hsl(38 88% 50%))",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: step >= 2 ? "gradient-shift 4s ease infinite" : "none",
            }}
          >
            Creative Caricature Club
          </motion.h1>

          {/* Tagline */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="mt-4 z-10 flex items-center gap-3"
          >
            <motion.div className="w-10 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, transparent, hsl(22 78% 52% / 0.5))" }}
              initial={{ scaleX: 0 }} animate={step >= 3 ? { scaleX: 1 } : {}} transition={{ duration: 0.6 }} />
            <p className="text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: "hsl(28 10% 45%)" }}>
              Art • Events • Workshops
            </p>
            <motion.div className="w-10 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, hsl(22 78% 52% / 0.5), transparent)" }}
              initial={{ scaleX: 0 }} animate={step >= 3 ? { scaleX: 1 } : {}} transition={{ duration: 0.6 }} />
          </motion.div>

          {/* Mini caricature faces */}
          <motion.div className="flex gap-3 mt-6 z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={step >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}>
            {["😄", "🤩", "😎", "🥳", "😂"].map((emoji, i) => (
              <motion.span key={i} className="text-xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}>
                {emoji}
              </motion.span>
            ))}
          </motion.div>

          {/* Progress */}
          <motion.div initial={{ opacity: 0 }} animate={step >= 1 ? { opacity: 1 } : {}} className="mt-8 z-10">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 160, background: "hsl(34 18% 85% / 0.5)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(22 78% 52%), hsl(280 50% 60%), hsl(38 88% 50%))" }}
                initial={{ width: "0%" }} animate={{ width: "100%" }}
                transition={{ duration: 2.6, ease: "easeInOut" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
