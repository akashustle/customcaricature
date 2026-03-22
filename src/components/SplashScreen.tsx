import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 150);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1300);
    const t4 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 40% 30%, #fdf8f3 0%, #f7f0e6 40%, #f0e8dc 70%, #ebe3d8 100%)",
          }}
        >
          {/* Hand-drawn sketch lines background */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 600" preserveAspectRatio="none">
            {/* Pencil sketch strokes */}
            <motion.path
              d="M50,300 C100,250 150,320 200,280 S300,260 350,290 S450,250 550,300"
              fill="none" stroke="#a08462" strokeWidth="1.5" strokeLinecap="round" opacity="0.12"
              strokeDasharray="8 4"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
            />
            <motion.path
              d="M80,200 Q200,150 300,190 T520,170"
              fill="none" stroke="#a08462" strokeWidth="1" strokeLinecap="round" opacity="0.08"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.3 }}
            />
            <motion.path
              d="M100,420 Q250,460 400,410 T550,440"
              fill="none" stroke="#7a6a58" strokeWidth="0.8" strokeLinecap="round" opacity="0.06"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.5 }}
            />
            
            {/* Hand-drawn frame around center */}
            <motion.rect
              x="180" y="160" width="240" height="280" rx="20"
              fill="none" stroke="#b08d57" strokeWidth="1.2" opacity="0.1"
              strokeDasharray="6 3"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 3, ease: "easeInOut" }}
            />
            
            {/* Squiggly decorative lines */}
            <motion.path
              d="M120,140 C130,130 140,140 150,130 S170,140 180,130"
              fill="none" stroke="#e8643c" strokeWidth="1.5" strokeLinecap="round" opacity="0.15"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 1.2 }}
            />
            <motion.path
              d="M420,450 C430,440 440,450 450,440 S470,450 480,440"
              fill="none" stroke="#b08d57" strokeWidth="1.5" strokeLinecap="round" opacity="0.12"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            />
          </svg>

          {/* Floating artistic elements */}
          {[
            { emoji: "✏️", x: "12%", y: "20%", delay: 0.8, size: 20 },
            { emoji: "🎨", x: "82%", y: "25%", delay: 1.0, size: 22 },
            { emoji: "🖌️", x: "18%", y: "72%", delay: 1.3, size: 18 },
            { emoji: "✨", x: "78%", y: "68%", delay: 1.1, size: 16 },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: item.x, top: item.y, fontSize: item.size }}
              initial={{ opacity: 0, scale: 0, rotate: -30 }}
              animate={step >= 2 ? { opacity: 0.7, scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: item.delay }}
            >
              <motion.span
                animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                className="inline-block"
              >
                {item.emoji}
              </motion.span>
            </motion.div>
          ))}

          {/* Hand-drawn circular frame */}
          <motion.div className="relative z-10 mb-5">
            {/* Sketchy ring */}
            <svg className="absolute -inset-5 w-[calc(100%+40px)] h-[calc(100%+40px)]" viewBox="0 0 140 140">
              <motion.circle
                cx="70" cy="70" r="62"
                fill="none" stroke="#b08d57" strokeWidth="1.5" opacity="0.3"
                strokeDasharray="4 3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <motion.circle
                cx="70" cy="70" r="56"
                fill="none" stroke="#e8643c" strokeWidth="0.8" opacity="0.15"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, delay: 0.3, ease: "easeInOut" }}
              />
            </svg>

            {/* Warm glow */}
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(176,141,87,0.15) 0%, transparent 70%)" }}
              animate={step >= 2 ? { scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            />

            {/* Logo with 3D shadow */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 160, damping: 14 }}
            >
              <img
                src="/logo.png"
                alt="Creative Caricature Club"
                className="w-28 h-28 rounded-full object-cover relative z-10"
                style={{
                  border: "3px solid #b08d57",
                  boxShadow: "0 8px 30px rgba(176,141,87,0.25), 0 0 0 6px rgba(253,248,243,0.8), inset 0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
            </motion.div>

            {/* Pencil accent */}
            <motion.div
              className="absolute -top-2 -right-3 z-20 text-xl"
              initial={{ opacity: 0, scale: 0, rotate: -60 }}
              animate={step >= 2 ? { opacity: 1, scale: 1, rotate: -15 } : {}}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              ✏️
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-3 z-20 text-lg"
              initial={{ opacity: 0, scale: 0 }}
              animate={step >= 2 ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5, type: "spring" }}
            >
              🎨
            </motion.div>
          </motion.div>

          {/* Brand Name with hand-drawn underline */}
          <motion.div className="relative z-10">
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
              className="text-3xl md:text-4xl font-bold"
              style={{
                fontFamily: "'Dancing Script', cursive",
                color: "#3a2e22",
              }}
            >
              Creative Caricature Club
            </motion.h1>
            {/* Hand-drawn underline */}
            <svg className="w-full h-3 mt-1" viewBox="0 0 300 12" preserveAspectRatio="none">
              <motion.path
                d="M10,6 C50,2 100,10 150,5 S250,8 290,4"
                fill="none" stroke="#b08d57" strokeWidth="2" strokeLinecap="round" opacity="0.4"
                initial={{ pathLength: 0 }}
                animate={step >= 2 ? { pathLength: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </svg>
          </motion.div>

          {/* Tagline with artistic dividers */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="mt-3 z-10 flex items-center gap-3"
          >
            <motion.div
              className="w-8 h-[1.5px] rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, #b08d57)" }}
              initial={{ scaleX: 0 }}
              animate={step >= 3 ? { scaleX: 1 } : {}}
              transition={{ duration: 0.5 }}
            />
            <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: "#8a7a6a" }}>
              Art • Events • Workshops
            </p>
            <motion.div
              className="w-8 h-[1.5px] rounded-full"
              style={{ background: "linear-gradient(90deg, #b08d57, transparent)" }}
              initial={{ scaleX: 0 }}
              animate={step >= 3 ? { scaleX: 1 } : {}}
              transition={{ duration: 0.5 }}
            />
          </motion.div>

          {/* Mini caricature faces with bounce */}
          <motion.div
            className="flex gap-2.5 mt-5 z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={step >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            {["😄", "🤩", "😎", "🥳", "😂"].map((emoji, i) => (
              <motion.span
                key={i}
                className="text-lg"
                initial={{ scale: 0 }}
                animate={step >= 3 ? { scale: 1 } : {}}
                transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300 }}
              >
                <motion.span
                  className="inline-block"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                >
                  {emoji}
                </motion.span>
              </motion.span>
            ))}
          </motion.div>

          {/* Artistic progress bar */}
          <motion.div initial={{ opacity: 0 }} animate={step >= 1 ? { opacity: 1 } : {}} className="mt-7 z-10">
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ width: 140, background: "rgba(176,141,87,0.15)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #b08d57, #e8643c, #b08d57)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.4, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
