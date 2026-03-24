import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, ArrowLeft, Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { requestBrowserNotificationPermission } from "@/lib/webpush";

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedEnd?: string | null;
  isGlobal?: boolean;
}

const MaintenanceScreen = ({ title = "Under Maintenance", message = "We are performing scheduled maintenance. Please check back soon.", estimatedEnd, isGlobal }: MaintenanceScreenProps) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState("");
  const [notifyRequested, setNotifyRequested] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!estimatedEnd) return;
    const update = () => {
      const diff = new Date(estimatedEnd).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Coming back now...");
        setIsExpired(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [estimatedEnd]);

  // Auto-reload when timer expires
  useEffect(() => {
    if (isExpired) {
      const timeout = setTimeout(() => window.location.reload(), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isExpired]);

  const handleNotifyMe = async () => {
    const result = await requestBrowserNotificationPermission();
    if (result === "granted") {
      setNotifyRequested(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full bg-primary/5"
            style={{ width: `${20 + Math.random() * 60}px`, height: `${20 + Math.random() * 60}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -30, 0], scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }} />
        ))}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-warning/5 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.8, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 text-center max-w-lg mx-auto">
        <motion.div className="w-24 h-24 rounded-3xl bg-warning/15 flex items-center justify-center mx-auto mb-8 border border-warning/20"
          animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <AlertTriangle className="w-12 h-12 text-warning" />
          </motion.div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="font-calligraphy text-4xl md:text-5xl font-bold text-foreground mb-4">{title}</motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="text-muted-foreground font-body text-base md:text-lg mb-6 leading-relaxed">{message}</motion.p>

        {estimatedEnd && countdown && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-6">
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-2xl px-6 py-4 shadow-lg">
              <Clock className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Coming back in</p>
                <p className="text-2xl font-extrabold text-foreground tracking-tight">{countdown}</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-full max-w-xs mx-auto mb-8">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-primary via-warning to-primary rounded-full"
              animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ width: "50%" }} />
          </div>
        </motion.div>

        {/* Notify Me Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mb-4">
          {notifyRequested ? (
            <div className="inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
              <BellRing className="w-4 h-4" /> You'll be notified when we're back!
            </div>
          ) : (
            <Button variant="default" onClick={handleNotifyMe} className="rounded-full font-body gap-2">
              <Bell className="w-4 h-4" /> Notify me when it's back
            </Button>
          )}
        </motion.div>

        {!isGlobal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <Button variant="outline" onClick={() => navigate("/")} className="rounded-full font-body gap-2">
              <ArrowLeft className="w-4 h-4" /> Go to Homepage
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default MaintenanceScreen;
