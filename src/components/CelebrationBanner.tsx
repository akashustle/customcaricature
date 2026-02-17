import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJIS = ["✨", "🎉", "🌸", "💐", "🎊", "🌺", "🌟", "💫", "🎶", "🥳"];

const CelebrationBanner = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => {
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number; delay: number }[]>([]);

  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(p);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 p-4 text-center">
      {/* Falling particles */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-lg pointer-events-none select-none"
          style={{ left: `${p.x}%`, top: -20 }}
          animate={{ y: [0, 200], opacity: [1, 0], rotate: [0, 360] }}
          transition={{ duration: 3, delay: p.delay, repeat: Infinity, repeatDelay: 2 }}
        >
          {p.emoji}
        </motion.span>
      ))}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <p className="font-display text-lg font-bold text-foreground relative z-10">{message}</p>
      </motion.div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-xs text-muted-foreground mt-2 relative z-10 underline">
          Dismiss
        </button>
      )}
    </div>
  );
};

export default CelebrationBanner;
