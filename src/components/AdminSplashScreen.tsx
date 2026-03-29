import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AdminSplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("admin_splash_shown")) {
      setShow(false);
      onComplete();
      return;
    }
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 400);
    const t3 = setTimeout(() => setStep(3), 900);
    const t4 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("admin_splash_shown", "true");
      setTimeout(onComplete, 300);
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(145deg, hsl(30 43% 97%), hsl(30 40% 94%), hsl(20 100% 96%))" }}
        >
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "linear-gradient(hsla(25,25%,32%,0.1) 1px, transparent 1px), linear-gradient(90deg, hsla(25,25%,32%,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />

          {/* Floating particles */}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4 + (i % 3) * 3,
                height: 4 + (i % 3) * 3,
                left: `${8 + i * 8.5}%`,
                top: `${10 + (i % 5) * 18}%`,
                background: `hsla(${i % 2 === 0 ? "25, 25%, 32%" : "35, 50%, 60%"}, ${0.12 + (i % 3) * 0.06})`
              }}
              animate={{ y: [0, -18, 0], opacity: [0.15, 0.5, 0.15], scale: [1, 1.2, 1] }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}

          {/* Glow rings */}
          <motion.div
            className="absolute w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle, hsla(35,50%,60%,0.2) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Logo with gear rotation */}
          <motion.div className="relative z-10 mb-6">
            {/* Rotating gear ring behind logo */}
            <motion.div
              className="absolute -inset-6 z-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              <svg viewBox="0 0 120 120" className="w-full h-full opacity-[0.12]">
                <path d="M60 8 L64 0 L68 8 L72 2 L74 10 L80 6 L80 14 L86 12 L84 20 L90 20 L88 28 L94 28 L90 34 L96 36 L92 42 L98 46 L92 50 L96 56 L90 58 L92 64 L86 64 L88 70 L82 70 L84 76 L78 74 L78 80 L72 78 L70 84 L66 80 L62 86 L60 80 L56 86 L54 80 L48 84 L48 78 L42 80 L42 74 L36 76 L38 70 L32 70 L34 64 L28 64 L30 58 L24 56 L28 50 L22 46 L28 42 L24 36 L30 34 L26 28 L32 28 L30 20 L36 20 L34 14 L40 14 L40 6 L46 10 L48 2 L52 8 L56 0 L60 8 Z"
                  fill="none" stroke="hsl(25 25% 32%)" strokeWidth="1.5"/>
              </svg>
            </motion.div>

            {/* Counter-rotating inner gear */}
            <motion.div
              className="absolute -inset-4 z-0"
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full opacity-[0.07]">
                <path d="M50 5 L53 0 L56 5 L60 2 L61 8 L66 6 L66 12 L70 10 L70 16 L74 16 L72 22 L76 22 L74 28 L78 30 L74 34 L78 38 L74 40 L76 46 L72 46 L74 52 L70 52 L70 58 L66 56 L66 62 L60 60 L58 64 L54 60 L52 66 L50 60 L48 66 L46 60 L42 64 L40 60 L36 62 L34 56 L30 58 L30 52 L26 52 L28 46 L24 46 L26 40 L22 38 L26 34 L22 30 L26 28 L24 22 L28 22 L26 16 L30 16 L30 10 L34 12 L34 6 L40 8 L40 2 L44 5 L47 0 L50 5 Z"
                  fill="none" stroke="hsl(18 40% 55%)" strokeWidth="1"/>
              </svg>
            </motion.div>

            {/* Pulse ring */}
            <motion.div
              className="absolute -inset-5 rounded-full border border-foreground/5"
              animate={step >= 2 ? { scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute -inset-3 rounded-full"
              style={{ background: "linear-gradient(135deg, hsla(35,50%,60%,0.2), hsla(30,40%,99%,0.5))" }}
              animate={step >= 2 ? { scale: [1, 1.12, 1], opacity: [0.3, 0.1, 0.3] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            />

            {/* Logo image */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <img
                src="/logo.png"
                alt="CCC"
                className="admin-logo-frame w-24 h-24 object-cover relative z-10"
                style={{ boxShadow: "0 0 50px hsla(35,50%,60%,0.3), 0 0 100px hsla(18,40%,55%,0.1)" }}
              />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ y: 25, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="relative z-10 text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "hsl(25 20% 18%)", fontFamily: "'Nunito', sans-serif" }}
          >
            CCC Admin
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.35 }}
            className="mt-2 z-10 text-[10px] tracking-[0.35em] uppercase font-semibold"
            style={{ color: "hsla(25, 20%, 18%, 0.45)" }}
          >
            Management Console
          </motion.p>

          {/* Loading bar */}
          <motion.div initial={{ opacity: 0 }} animate={step >= 1 ? { opacity: 1 } : {}} className="mt-10 z-10">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ width: 120, background: "hsla(25,20%,18%,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(25 25% 32%), hsl(18 40% 55%), hsl(35 50% 60%))" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>
          </motion.div>

          {/* Bottom branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={step >= 3 ? { opacity: 0.25 } : {}}
            className="absolute bottom-8 z-10 text-[9px] tracking-widest uppercase"
            style={{ color: "hsl(25 20% 18%)" }}
          >
            Creative Caricature Club™
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminSplashScreen;
