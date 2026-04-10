import { useState, useEffect } from "react";
import { MapPin, X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Shows a sticky bar on admin pages when location permission is not granted.
 * If denied AND admin_location_required is enabled, shows a full-screen blocking overlay.
 * Can be turned off from admin settings.
 */
const AdminLocationPrompt = () => {
  const [status, setStatus] = useState<string>("prompt");
  const [dismissed, setDismissed] = useState(false);
  const { settings } = useSiteSettings();
  const locationRequired = (settings as any).admin_location_required?.enabled === true;

  useEffect(() => {
    if (!locationRequired || !navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then(r => {
      setStatus(r.state);
      r.addEventListener("change", () => setStatus(r.state));
    }).catch(() => {});
  }, [locationRequired]);

  if (!locationRequired) return null;

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("granted");
        try {
          localStorage.setItem("ccc_user_location", JSON.stringify({
            lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now()
          }));
        } catch {}
      },
      () => setStatus("denied"),
      { timeout: 5000, enableHighAccuracy: false }
    );
  };

  if (status === "denied") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: "linear-gradient(135deg, hsl(0 40% 15%), hsl(15 50% 12%))" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center"
        >
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Location Access Required</h2>
          <p className="text-white/60 text-sm max-w-xs">
            Location access is required for admin operations. Please enable it in your browser settings and reload.
          </p>
        </div>
        <button
          onClick={requestLocation}
          className="px-6 py-2.5 bg-white text-red-900 text-sm font-bold rounded-full hover:bg-white/90 transition-all"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="text-white/40 text-xs underline hover:text-white/60"
        >
          Reload page
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {status !== "granted" && !dismissed && (
      <motion.div key="admin-loc-prompt"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="sticky top-0 z-[60] flex items-center justify-between px-4 py-2 text-xs"
        style={{ background: "linear-gradient(90deg, #0EA5E9, #38BDF8)" }}
      >
        <button onClick={requestLocation} className="flex items-center gap-2 text-white font-semibold flex-1">
          <MapPin className="w-3.5 h-3.5" />
          Tap here to allow location access for better security
        </button>
        <button onClick={() => setDismissed(true)} className="text-white/60 hover:text-white p-1 ml-2">
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminLocationPrompt;
