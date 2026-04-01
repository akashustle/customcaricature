import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, ArrowLeft, Bell, BellRing, LogIn, GraduationCap, UserPlus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { requestBrowserNotificationPermission } from "@/lib/webpush";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedEnd?: string | null;
  isGlobal?: boolean;
}

const WHATSAPP_NUMBER = "918369594271";

const MaintenanceScreen = ({ title = "Under Maintenance", message = "We are performing scheduled maintenance. Please check back soon.", estimatedEnd, isGlobal }: MaintenanceScreenProps) => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
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

  useEffect(() => {
    if (isExpired) {
      const timeout = setTimeout(() => window.location.reload(), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isExpired]);

  const handleNotifyMe = async () => {
    const result = await requestBrowserNotificationPermission();
    if (result === "granted") setNotifyRequested(true);
  };

  const allowRegistration = (settings as any).allow_registration_maintenance?.enabled;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Background animated shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full bg-primary/5"
            style={{ width: `${20 + Math.random() * 80}px`, height: `${20 + Math.random() * 80}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -40, 0], scale: [1, 1.3, 1], opacity: [0.05, 0.2, 0.05] }}
            transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 3 }} />
        ))}
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-warning/5 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.85, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 text-center max-w-lg mx-auto w-full">

        {/* Icon */}
        <motion.div className="w-20 h-20 rounded-3xl bg-warning/15 flex items-center justify-center mx-auto mb-6 border border-warning/20 shadow-lg"
          animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <AlertTriangle className="w-10 h-10 text-warning" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-3">{title}</motion.h1>

        {/* Message */}
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="text-muted-foreground font-body text-sm md:text-base mb-5 leading-relaxed max-w-md mx-auto">{message}</motion.p>

        {/* Countdown Timer */}
        {estimatedEnd && countdown && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-5">
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-2xl px-5 py-3 shadow-lg">
              <Clock className="w-4 h-4 text-primary" />
              <div className="text-left">
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Coming back in</p>
                <p className="text-xl font-extrabold text-foreground tracking-tight">{countdown}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full max-w-xs mx-auto mb-5">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-primary via-warning to-primary rounded-full"
              animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} style={{ width: "40%" }} />
          </div>
        </motion.div>

        {/* WhatsApp Event Booking CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mb-4">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20want%20to%20book%20an%20event%20caricature`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-lg">
            <MessageCircle className="w-4 h-4" />
            Want to book an event? WhatsApp us
          </a>
        </motion.div>

        {/* Login Buttons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-2 mb-4">
          <Button variant="default" onClick={() => navigate("/login")} className="rounded-full font-body gap-2 shadow-md">
            <LogIn className="w-4 h-4" /> Login
          </Button>
          <Button variant="outline" onClick={() => navigate("/customcad75")} className="rounded-full font-body gap-2">
            <LogIn className="w-4 h-4" /> Portal Login
          </Button>
          <Button variant="outline" onClick={() => navigate("/cccworkshop2006")} className="rounded-full font-body gap-2">
            <GraduationCap className="w-4 h-4" /> Workshop Login
          </Button>
          {allowRegistration && (
            <Button variant="secondary" onClick={() => navigate("/register")} className="rounded-full font-body gap-2">
              <UserPlus className="w-4 h-4" /> Register
            </Button>
          )}
        </motion.div>

        {/* Notify Me */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mb-4">
          {notifyRequested ? (
            <div className="inline-flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
              <BellRing className="w-3.5 h-3.5" /> You'll be notified when we're back!
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleNotifyMe} className="rounded-full font-body gap-2 text-xs">
              <Bell className="w-3.5 h-3.5" /> Notify me when it's back
            </Button>
          )}
        </motion.div>

        {!isGlobal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="rounded-full font-body gap-2 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Go to Homepage
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default MaintenanceScreen;
