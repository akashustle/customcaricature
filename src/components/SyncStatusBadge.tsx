import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { subscribeQueue, drain, retryFailed, type SyncAction } from "@/lib/sync-queue";

/**
 * Floating sync-status pill — surfaces the offline action queue to the user.
 *
 * - Hidden when the queue is empty.
 * - Pending: tap to force-drain.
 * - Has failures: shows a dedicated "Retry failed" pill alongside the count
 *   and a chevron that opens the full inspector at /sync-queue.
 */
const SyncStatusBadge = () => {
  const [queue, setQueue] = useState<SyncAction[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeQueue(setQueue);
    return () => { unsubscribe(); };
  }, []);

  const pending = queue.filter((a) => a.status === "queued" || a.status === "syncing");
  const failed = queue.filter((a) => a.status === "failed");
  if (pending.length + failed.length === 0) return null;

  const isSyncing = queue.some((a) => a.status === "syncing");
  const hasFailed = failed.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="fixed bottom-20 right-4 z-[60] flex items-center gap-2"
      >
        {hasFailed && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); retryFailed(); }}
            className="flex items-center gap-1.5 rounded-full bg-destructive text-destructive-foreground px-3 py-2 text-xs font-semibold shadow-lg hover:scale-105 transition-transform"
            aria-label={`Retry ${failed.length} failed actions`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry {failed.length} failed
          </button>
        )}

        <button
          type="button"
          onClick={() => (pending.length > 0 ? void drain() : navigate("/sync-queue"))}
          className="flex items-center gap-2 rounded-full bg-card/95 backdrop-blur-md border border-border px-3.5 py-2 shadow-lg text-xs font-medium hover:scale-105 transition-transform"
          aria-label="Sync status"
          data-testid="sync-status-badge"
        >
          {hasFailed && pending.length === 0 ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span>{failed.length} failed</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Syncing {pending.length}…</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-500" />
              <span>{pending.length} queued</span>
            </>
          )}
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default SyncStatusBadge;
