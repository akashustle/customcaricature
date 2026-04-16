import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

const CONFETTI_COLORS = [
  "bg-yellow-400", "bg-pink-400", "bg-blue-400", "bg-green-400",
  "bg-purple-400", "bg-orange-400", "bg-red-400", "bg-cyan-400",
];

const PaymentSuccessOverlay = ({ show, onClose }: { show: boolean; onClose: () => void }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number; rotation: number }[]>([]);

  useEffect(() => {
    if (show) {
      setParticles(
        Array.from({ length: 40 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 4 + Math.random() * 8,
          delay: Math.random() * 1.5,
          rotation: Math.random() * 360,
        }))
      );
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ perspective: "1200px" }}
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
          />

          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className={`absolute rounded-sm ${p.color} pointer-events-none`}
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size * 0.6 }}
              initial={{ opacity: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [0, window.innerHeight * 1.1],
                rotate: [0, p.rotation + 720],
                x: [0, (Math.random() - 0.5) * 120],
              }}
              transition={{ duration: 3 + Math.random() * 2, delay: p.delay, ease: "easeIn" }}
            />
          ))}

          {/* Main card with 3D transform */}
          <motion.div
            initial={{ scale: 0.3, rotateX: 40, rotateY: -15, opacity: 0 }}
            animate={{ scale: 1, rotateX: 0, rotateY: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotateX: -20, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="relative w-full max-w-sm"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-background via-background to-muted/50 border border-border/60 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)]">
              {/* Glow ring */}
              <motion.div
                className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-green-500/20 blur-3xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-primary/20 blur-3xl"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              <div className="relative p-8 text-center space-y-5">
                {/* Success icon with 3D pulse */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.4, 1] }}
                  transition={{ delay: 0.3, duration: 0.7, type: "spring" }}
                  className="relative mx-auto"
                >
                  <motion.div
                    className="w-28 h-28 mx-auto rounded-full flex items-center justify-center relative"
                    style={{
                      background: "linear-gradient(135deg, #22c55e, #10b981, #059669)",
                      boxShadow: "0 0 40px rgba(34, 197, 94, 0.4), 0 0 80px rgba(34, 197, 94, 0.2), inset 0 -4px 12px rgba(0,0,0,0.15)",
                    }}
                    animate={{
                      boxShadow: [
                        "0 0 40px rgba(34, 197, 94, 0.4), 0 0 80px rgba(34, 197, 94, 0.2)",
                        "0 0 60px rgba(34, 197, 94, 0.6), 0 0 120px rgba(34, 197, 94, 0.3)",
                        "0 0 40px rgba(34, 197, 94, 0.4), 0 0 80px rgba(34, 197, 94, 0.2)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-white drop-shadow-lg" />
                  </motion.div>

                  {/* Sparkle ring */}
                  {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <motion.div
                      key={deg}
                      className="absolute top-1/2 left-1/2"
                      style={{ transform: `rotate(${deg}deg) translateY(-56px)` }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                      transition={{ delay: 0.6 + deg / 600, duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-clip-text text-transparent">
                    Payment Successful!
                  </h2>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                    Your booking is now fully paid & confirmed.<br />
                    Thank you for choosing us! ✨
                  </p>
                </motion.div>

                {/* Status badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring", bounce: 0.5 }}
                >
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-sm px-5 py-1.5 font-sans font-semibold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Fully Paid
                  </Badge>
                </motion.div>

                {/* Party icon */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="flex justify-center gap-3"
                >
                  <motion.div animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 1, repeat: Infinity }}>
                    <PartyPopper className="w-6 h-6 text-amber-500" />
                  </motion.div>
                  <motion.div animate={{ rotate: [10, -10, 10] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    <PartyPopper className="w-6 h-6 text-pink-500" />
                  </motion.div>
                </motion.div>

                {/* Close button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  <Button
                    onClick={onClose}
                    className="rounded-2xl font-sans px-8 h-11 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/25 border-0"
                  >
                    Done
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentSuccessOverlay;
