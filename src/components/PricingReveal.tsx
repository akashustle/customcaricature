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
  urgencyMessage?: string;
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
  urgencyMessage,
}: PricingRevealProps) => {
  const [displayPrice, setDisplayPrice] = useState(showRange ? rangeMax : finalPrice * 1.3);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (revealed) {
      const start = displayPrice;
      const end = finalPrice;
      const duration = 1800;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
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
      const min = showRange ? rangeMin : finalPrice * 0.7;
      const max = showRange ? rangeMax : finalPrice * 1.4;
      
      intervalRef.current = setInterval(() => {
        const rand = Math.round(min + Math.random() * (max - min));
        setDisplayPrice(Math.round(rand / 100) * 100);
      }, 600);
      
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [revealed, finalPrice, showRange, rangeMin, rangeMax]);

  const formattedPrice = displayPrice.toLocaleString("en-IN");

  return (
    <div className={`text-center ${className}`}>
      <p className="text-xs text-muted-foreground font-sans mb-1">{label}</p>
      <motion.div
        className="relative"
        animate={!revealed ? { scale: [1, 1.02, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        {/* 3D Green highlight box when revealed */}
        {revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -inset-3 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(142 76% 36% / 0.08), hsl(142 76% 36% / 0.15), hsl(142 76% 36% / 0.05))",
              boxShadow: "0 8px 32px hsl(142 76% 36% / 0.15), 0 2px 8px hsl(142 76% 36% / 0.1), inset 0 1px 0 hsl(142 76% 90% / 0.3)",
              border: "1px solid hsl(142 76% 36% / 0.2)",
            }}
          />
        )}

        {/* Non-revealed: amber/orange pulsing highlight */}
        {!revealed && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -inset-3 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(38 92% 50% / 0.06), hsl(22 78% 52% / 0.1), hsl(38 92% 50% / 0.04))",
              border: "1px solid hsl(38 92% 50% / 0.15)",
            }}
          />
        )}

        <motion.p
          className={`font-display text-4xl md:text-5xl font-bold transition-colors duration-500 relative z-10 ${
            revealed
              ? "text-green-600"
              : "text-primary"
          }`}
          style={revealed ? {
            textShadow: "0 0 40px hsl(142 76% 36% / 0.3), 0 4px 16px hsl(0 0% 0% / 0.1), 0 8px 24px hsl(142 76% 36% / 0.15)",
            filter: "drop-shadow(0 2px 4px hsl(142 76% 36% / 0.2))",
          } : {
            textShadow: "0 4px 12px hsl(0 0% 0% / 0.08)",
          }}
          key={revealed ? "final" : "fluctuating"}
        >
          {currency}{formattedPrice}
        </motion.p>
        
        {!revealed && showRange && (
          <motion.div
            className="relative z-10"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <p className="text-xs text-muted-foreground font-sans mt-1">
              {urgencyMessage || "Enter details to get exact pricing"}
            </p>
          </motion.div>
        )}

        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-2 relative z-10"
          >
            <p className="text-xs font-sans text-green-600 font-semibold">
              ✨ Best price unlocked! Grab this offer now!
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
