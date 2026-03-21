import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 200);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 400);
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(145deg, hsl(38 30% 96%) 0%, hsl(30 25% 91%) 50%, hsl(22 20% 88%) 100%)",
          }}
        >
          {/* Artistic sketch lines background */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 400 400">
            <motion.path d="M50,200 Q100,100 200,150 T350,200" fill="none" stroke="hsl(22 78% 52%)" strokeWidth="2"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} />
            <motion.path d="M100,300 Q200,200 300,280 T400,250" fill="none" stroke="hsl(38 88% 50%)" strokeWidth="1.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, delay: 0.3 }} />
            <motion.path d="M30,100 Q150,50 250,120 T380,80" fill="none" stroke="hsl(28 14% 40%)" strokeWidth="1"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.5 }} />
          </svg>

          {/* Pencil sketch circles */}
          <motion.div className="absolute w-[300px] h-[300px] rounded-full border-2 border-dashed"
            style={{ borderColor: "hsl(22 78% 52% / 0.08)" }}
            animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
          <motion.div className="absolute w-[200px] h-[200px] rounded-full border"
            style={{ borderColor: "hsl(38 88% 50% / 0.06)" }}
            animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />

          {/* Logo with pencil-sketch frame */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
            transition={{ type: "spring", stiffness: 150, damping: 12 }}
            className="relative z-10 mb-6"
          >
            {/* Artistic frame around logo */}
            <motion.div className="absolute -inset-3 rounded-full"
              style={{ border: "2px dashed hsl(22 78% 52% / 0.25)" }}
              animate={step >= 2 ? { rotate: 360, scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }} />
            <motion.div className="absolute -inset-6 rounded-full"
              style={{ border: "1px solid hsl(38 88% 50% / 0.1)" }}
              animate={step >= 2 ? { rotate: -360 } : {}}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
            
            {/* Pencil icon accents */}
            <motion.div className="absolute -top-2 -right-2 z-20"
              initial={{ opacity: 0, scale: 0 }}
              animate={step >= 2 ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3, type: "spring" }}>
              <span className="text-2xl">✏️</span>
            </motion.div>
            
            <img
              src="/logo.png"
              alt="Creative Caricature Club"
              className="w-24 h-24 rounded-full object-cover relative z-10"
              style={{
                border: "3px solid hsl(22 78% 52% / 0.4)",
                boxShadow: "0 12px 40px hsl(28 14% 16% / 0.15), 0 0 0 6px hsl(38 30% 96% / 0.5)",
              }}
            />
          </motion.div>

          {/* Brand Name with hand-drawn feel */}
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

          {/* Tagline with artistic flair */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="mt-3 z-10 flex items-center gap-3"
          >
            <motion.div className="w-8 h-px rounded-full" style={{ background: "hsl(22 78% 52% / 0.4)" }}
              initial={{ scaleX: 0 }} animate={step >= 3 ? { scaleX: 1 } : {}} transition={{ duration: 0.5 }} />
            <p className="text-xs tracking-[0.25em] uppercase font-semibold" style={{ color: "hsl(28 10% 45%)" }}>
              ✨ Art • Events • Workshops ✨
            </p>
            <motion.div className="w-8 h-px rounded-full" style={{ background: "hsl(22 78% 52% / 0.4)" }}
              initial={{ scaleX: 0 }} animate={step >= 3 ? { scaleX: 1 } : {}} transition={{ duration: 0.5 }} />
          </motion.div>

          {/* Artistic emoji accents */}
          <motion.div className="absolute top-[20%] left-[15%] text-3xl opacity-20"
            initial={{ opacity: 0 }} animate={{ opacity: 0.15, y: [0, -10, 0] }}
            transition={{ y: { duration: 3, repeat: Infinity }, opacity: { duration: 1 } }}>🎨</motion.div>
          <motion.div className="absolute bottom-[25%] right-[12%] text-3xl opacity-20"
            initial={{ opacity: 0 }} animate={{ opacity: 0.15, y: [0, -8, 0] }}
            transition={{ y: { duration: 4, repeat: Infinity, delay: 1 }, opacity: { duration: 1, delay: 0.5 } }}>🖌️</motion.div>
          <motion.div className="absolute top-[30%] right-[20%] text-2xl opacity-15"
            initial={{ opacity: 0 }} animate={{ opacity: 0.12, rotate: [0, 15, -15, 0] }}
            transition={{ rotate: { duration: 5, repeat: Infinity }, opacity: { duration: 1, delay: 0.8 } }}>😄</motion.div>

          {/* Progress - pencil sketch style */}
          <motion.div initial={{ opacity: 0 }} animate={step >= 1 ? { opacity: 1 } : {}} className="mt-8 z-10">
            <div className="h-1 rounded-full overflow-hidden" style={{ width: 140, background: "hsl(34 18% 85% / 0.5)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(22 78% 52%), hsl(38 88% 50%), hsl(22 78% 52%))" }}
                initial={{ width: "0%" }} animate={{ width: "100%" }}
                transition={{ duration: 2.2, ease: "easeInOut" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
