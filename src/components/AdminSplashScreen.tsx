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
    }, 2200);
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
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1E3A5F 40%, #0EA5E9 100%)" }}
        >
          {/* Animated grid lines */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />

          {/* Floating particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4 + (i % 3) * 3,
                height: 4 + (i % 3) * 3,
                left: `${8 + i * 7.5}%`,
                top: `${10 + (i % 5) * 18}%`,
                background: `rgba(14, 165, 233, ${0.15 + (i % 3) * 0.1})`
              }}
              animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.3, 1] }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}

          {/* Glow rings */}
          <motion.div
            className="absolute w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)" }}
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.05, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
          />

          {/* Admin Icon with pulse ring */}
          <motion.div className="relative z-10 mb-6">
            <motion.div
              className="absolute -inset-5 rounded-full border border-white/10"
              animate={step >= 2 ? { scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute -inset-3 rounded-full bg-white/5"
              animate={step >= 2 ? { scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <img
                src="/admin-favicon.jpeg"
                alt="CCC Admin"
                className="w-24 h-24 rounded-full object-cover relative z-10 shadow-2xl ring-2 ring-white/20"
                style={{ boxShadow: "0 0 60px rgba(14,165,233,0.4), 0 0 120px rgba(14,165,233,0.15)" }}
              />
            </motion.div>
          </motion.div>

          {/* Title with text reveal */}
          <motion.h1
            initial={{ y: 25, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="relative z-10 text-3xl md:text-4xl font-black text-white tracking-tight"
          >
            CCC Admin
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.35 }}
            className="mt-2 z-10 text-[10px] tracking-[0.35em] uppercase font-semibold text-white/40"
          >
            Management Console
          </motion.p>

          {/* Loading bar */}
          <motion.div initial={{ opacity: 0 }} animate={step >= 1 ? { opacity: 1 } : {}} className="mt-10 z-10">
            <div className="h-[3px] rounded-full overflow-hidden bg-white/10" style={{ width: 120 }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #0EA5E9, #38BDF8, #7DD3FC)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
              />
            </div>
          </motion.div>

          {/* Bottom branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={step >= 3 ? { opacity: 0.25 } : {}}
            className="absolute bottom-8 z-10 text-[9px] text-white tracking-widest uppercase"
          >
            Creative Caricature Club
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminSplashScreen;
