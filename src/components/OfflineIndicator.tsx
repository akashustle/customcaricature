import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Global offline/online status pill.
 * - Always shows when offline.
 * - Briefly shows "Back online" toast for 2.5s when reconnected.
 * Mount once, e.g. in App.tsx.
 */
const OfflineIndicator = () => {
  const online = useOnlineStatus();
  const [showOnlineFlash, setShowOnlineFlash] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowOnlineFlash(false);
    } else if (wasOffline) {
      setShowOnlineFlash(true);
      const t = setTimeout(() => setShowOnlineFlash(false), 2500);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline]);

  if (online && !showOnlineFlash) return null;

  return (
    <div className={`offline-banner ${online ? "online" : ""}`} role="status" aria-live="polite">
      {online ? (
        <>
          <Wifi className="w-3.5 h-3.5" /> Back online
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" /> Offline — showing cached data
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
