import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

/**
 * Shows an animated toast when custom caricature ordering is paused.
 * Call this instead of navigating to /order when caricatureOff is true.
 */
export const showCaricatureOffMessage = () => {
  toast("Custom Caricature Orders Paused 🎨", {
    description: "Due to overwhelming demand, custom ordering is temporarily paused. We'll be back soon — stay tuned!",
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    duration: 5000,
  });
};
