import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminOfflineBanner = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="sticky top-0 z-[70] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(90deg, hsl(0 50% 45%), hsl(25 60% 50%))" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          You are offline. Data may not be updated.
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminOfflineBanner;
