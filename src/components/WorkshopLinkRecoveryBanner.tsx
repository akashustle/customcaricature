/**
 * Recovery banner shown when workshop account linking has failed even after
 * the hook's automatic retries. Gives the user a clear "what happened + try
 * again" UI instead of a silent failure.
 */
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  show: boolean;
  retrying: boolean;
  message?: string | null;
  onRetry: () => void;
};

const WorkshopLinkRecoveryBanner = ({ show, retrying, message, onRetry }: Props) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative overflow-hidden rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
            {retrying ? (
              <Loader2 className="w-5 h-5 text-destructive animate-spin" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-destructive">
              {retrying ? "Reconnecting your workshop account…" : "Couldn't link your workshop account"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {message || "We tried a few times in the background. Tap retry to try again."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={retrying}
            className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WorkshopLinkRecoveryBanner;
