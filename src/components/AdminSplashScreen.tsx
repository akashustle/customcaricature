import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AdminSplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show once per session
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
    }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1E3A5F 40%, #0EA5E9 100%)" }}
        >
          {/* Floating particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-white/10"
              style={{ left: `${10 + i * 12}%`, top: `${15 + (i % 4) * 20}%` }}
              animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}

          {/* Admin Icon */}
          <motion.div className="relative z-10 mb-5">
            <motion.div
              className="absolute -inset-4 rounded-3xl bg-white/5"
              animate={step >= 2 ? { scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
            >
              <img
                src="/admin-icon-512.png"
                alt="CCC Admin"
                className="w-20 h-20 rounded-2xl object-cover relative z-10 shadow-2xl"
                style={{ boxShadow: "0 0 40px rgba(14,165,233,0.3)" }}
              />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="relative z-10 text-2xl md:text-3xl font-black text-white tracking-tight"
          >
            CCC Admin
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.3 }}
            className="mt-1.5 z-10 text-[10px] tracking-[0.3em] uppercase font-semibold text-white/50"
          >
            Management Console
          </motion.p>

          {/* Progress */}
          <motion.div initial={{ opacity: 0 }} animate={step >= 1 ? { opacity: 1 } : {}} className="mt-8 z-10">
            <div className="h-0.5 rounded-full overflow-hidden bg-white/10" style={{ width: 100 }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #0EA5E9, #38BDF8)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminSplashScreen;
