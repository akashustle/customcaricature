import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PricingRevealProps {
  finalPrice: number;
  currency?: string;
  revealed: boolean;
  label?: string;
  showRange?: boolean;
  rangeMin?: number;
  rangeMax?: number;
  className?: string;
}

const PricingReveal = ({
  finalPrice,
  currency = "₹",
  revealed,
  label = "Your Price",
  showRange = false,
  rangeMin = 0,
  rangeMax = 0,
  className = "",
}: PricingRevealProps) => {
  const [displayPrice, setDisplayPrice] = useState(showRange ? rangeMax : finalPrice * 1.3);
  const [fluctuating, setFluctuating] = useState(!revealed);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Fluctuation effect when not revealed
  useEffect(() => {
    if (revealed) {
      setFluctuating(false);
      // Counting animation to final price
      const start = displayPrice;
      const end = finalPrice;
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * eased);
        setDisplayPrice(current);
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    } else {
      // Fluctuate between range or around final price
      const min = showRange ? rangeMin : finalPrice * 0.7;
      const max = showRange ? rangeMax : finalPrice * 1.4;
      
      intervalRef.current = setInterval(() => {
        const rand = Math.round(min + Math.random() * (max - min));
        // Round to nearest 500 for cleaner look
        setDisplayPrice(Math.round(rand / 500) * 500);
      }, 800);
      
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [revealed, finalPrice, showRange, rangeMin, rangeMax]);

  const formattedPrice = displayPrice.toLocaleString("en-IN");
  const isGreen = revealed;

  return (
    <div className={`text-center ${className}`}>
      <p className="text-xs text-muted-foreground font-sans mb-1">{label}</p>
      <motion.div
        className="relative"
        animate={!revealed ? { scale: [1, 1.02, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <motion.p
          className={`font-display text-4xl md:text-5xl font-bold transition-colors duration-500 ${
            isGreen
              ? "text-green-600 drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              : "text-primary"
          }`}
          style={isGreen ? {
            textShadow: "0 0 30px rgba(34,197,94,0.2), 0 4px 12px rgba(0,0,0,0.1)",
          } : {
            textShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          key={revealed ? "final" : "fluctuating"}
        >
          {currency}{formattedPrice}
        </motion.p>
        
        {!revealed && showRange && (
          <motion.p
            className="text-xs text-muted-foreground font-sans mt-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            Enter details to get exact pricing
          </motion.p>
        )}

        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-2"
          >
            <p className="text-xs font-sans text-green-600 font-semibold">
              ✨ Best price unlocked!
            </p>
          </motion.div>
        )}
      </motion.div>

      {!revealed && !showRange && (
        <motion.div
          className="flex items-center justify-center gap-1 mt-2"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </motion.div>
      )}
    </div>
  );
};

export default PricingReveal;
