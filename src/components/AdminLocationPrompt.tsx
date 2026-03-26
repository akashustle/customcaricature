import { useState, useEffect } from "react";
import { MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Shows a sticky bar on admin pages when location permission is not granted.
 * Clicking it triggers the browser's geolocation prompt.
 */
const AdminLocationPrompt = () => {
  const [status, setStatus] = useState<string>("prompt");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then(r => {
      setStatus(r.state);
      r.addEventListener("change", () => setStatus(r.state));
    }).catch(() => {});
  }, []);

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

  return (
    <AnimatePresence>
      {status !== "granted" && !dismissed && (
      <motion.div key="admin-loc-prompt"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="sticky top-0 z-[60] flex items-center justify-between px-4 py-2 text-xs"
        style={{ background: status === "denied" ? "linear-gradient(90deg, #dc2626, #ef4444)" : "linear-gradient(90deg, #0EA5E9, #38BDF8)" }}
      >
        <button onClick={requestLocation} className="flex items-center gap-2 text-white font-semibold flex-1">
          <MapPin className="w-3.5 h-3.5" />
          {status === "denied"
            ? "Location access denied — tap to retry or enable in browser settings"
            : "Tap here to allow location access for better security"
          }
        </button>
        <button onClick={() => setDismissed(true)} className="text-white/60 hover:text-white ml-2">
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminLocationPrompt;
