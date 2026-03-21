import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame } from "lucide-react";

interface UrgencyTimerProps {
  durationMinutes?: number;
  onExpire?: () => void;
  message?: string;
}

const UrgencyTimer = ({ durationMinutes = 10, onExpire, message = "Best offer expires in" }: UrgencyTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setExpired(true);
      onExpire?.();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 120; // Less than 2 minutes

  if (expired) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 rounded-xl bg-muted/50 border border-border text-center"
      >
        <p className="text-sm font-sans text-muted-foreground">Offer period ended. Prices may vary.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border text-center transition-colors duration-500 ${
        isUrgent
          ? "bg-destructive/5 border-destructive/30"
          : "bg-primary/5 border-primary/20"
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        {isUrgent ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
            <Flame className="w-4 h-4 text-destructive" />
          </motion.div>
        ) : (
          <Clock className="w-4 h-4 text-primary" />
        )}
        <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wider">{message}</p>
      </div>
      <div className="flex items-center justify-center gap-1">
        <motion.span
          key={minutes}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`font-display text-3xl font-bold tabular-nums ${isUrgent ? "text-destructive" : "text-primary"}`}
        >
          {String(minutes).padStart(2, "0")}
        </motion.span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className={`font-display text-3xl font-bold ${isUrgent ? "text-destructive" : "text-primary"}`}
        >
          :
        </motion.span>
        <motion.span
          key={seconds}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`font-display text-3xl font-bold tabular-nums ${isUrgent ? "text-destructive" : "text-primary"}`}
        >
          {String(seconds).padStart(2, "0")}
        </motion.span>
      </div>
      <p className="text-xs font-sans text-muted-foreground mt-2">
        🎉 Your guests will love this experience! Book now for the best rate.
      </p>
    </motion.div>
  );
};

export default UrgencyTimer;
