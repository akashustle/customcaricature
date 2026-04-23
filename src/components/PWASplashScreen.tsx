import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 3D animated PWA boot splash — shown ONLY when launched as installed PWA.
 * Detects display-mode: standalone and shows a brief immersive 3D scene
 * with the CCC logo + boost animation.
 */
const PWASplashScreen = () => {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only show in installed PWA context
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore iOS Safari
      window.navigator.standalone === true;

    // Only on cold-launch (sessionStorage flag prevents re-show on SPA nav)
    if (!isStandalone) return;
    if (sessionStorage.getItem("ccc_pwa_splash_done") === "1") return;

    setShow(true);
    sessionStorage.setItem("ccc_pwa_splash_done", "1");

    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => setPhase(3), 1900);
    const tEnd = setTimeout(() => setShow(false), 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tEnd);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, hsl(30 50% 96%), hsl(28 40% 90%) 50%, hsl(25 35% 85%) 100%)",
            perspective: "1200px",
          }}
        >
          {/* 3D rotating ring backdrop */}
          <motion.div
            className="absolute"
            style={{ width: 480, height: 480, transformStyle: "preserve-3d" }}
            animate={{ rotateY: 360, rotateX: 15 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                style={{
                  background: "hsla(35,55%,55%,0.6)",
                  transform: `rotateY(${i * 15}deg) translateZ(220px) translate(-50%,-50%)`,
                  boxShadow: "0 0 12px hsla(35,55%,55%,0.8)",
                }}
              />
            ))}
          </motion.div>

          {/* Boost particles streaking up */}
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.div
              key={`boost-${i}`}
              className="absolute"
              style={{
                left: `${15 + ((i * 13) % 70)}%`,
                bottom: -10,
                width: 2,
                height: 30,
                background:
                  "linear-gradient(to top, transparent, hsla(35,55%,60%,0.9), transparent)",
                borderRadius: 4,
              }}
              animate={{
                y: [-50, -window.innerHeight - 100],
                opacity: [0, 1, 0],
                scaleY: [0.5, 1.4, 0.5],
              }}
              transition={{
                duration: 1.4 + (i % 4) * 0.3,
                repeat: Infinity,
                delay: i * 0.08,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Logo with 3D pop + boost */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0, rotateY: -180, z: -300 }}
            animate={
              phase >= 3
                ? { scale: [1, 1.15, 4], rotateY: 0, z: 0, y: -200, opacity: [1, 1, 0] }
                : { scale: 1, rotateY: 0, z: 0 }
            }
            transition={
              phase >= 3
                ? { duration: 0.8, ease: [0.7, 0, 1, 0.4] }
                : { type: "spring", stiffness: 120, damping: 12, delay: 0.1 }
            }
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Glow halo */}
            <motion.div
              className="absolute inset-0 -m-12 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, hsla(35,55%,60%,0.55), transparent 65%)",
              }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Logo */}
            <img
              src="/logo.png"
              alt="CCC"
              className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-3xl object-cover"
              style={{
                boxShadow:
                  "0 30px 80px hsla(25,40%,20%,0.4), 0 0 100px hsla(35,55%,60%,0.6), inset 0 2px 12px hsla(0,0%,100%,0.3)",
                border: "3px solid hsla(35,55%,60%,0.4)",
              }}
            />
          </motion.div>

          {/* Title fade in */}
          <AnimatePresence>
            {phase >= 1 && phase < 3 && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-[22%] z-10 flex flex-col items-center"
              >
                <h1
                  className="font-calligraphy text-3xl sm:text-4xl text-center"
                  style={{
                    color: "hsl(25 25% 18%)",
                    textShadow: "0 4px 20px hsla(35,55%,60%,0.4)",
                  }}
                >
                  Creative Caricature Club
                </h1>
                {phase >= 2 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    className="mt-2 text-[10px] tracking-[0.4em] uppercase font-semibold"
                    style={{ color: "hsl(25 25% 32%)" }}
                  >
                    Launching…
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWASplashScreen;
