import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeQueue, drain, type SyncAction } from "@/lib/sync-queue";

/**
 * Floating sync-status pill — surfaces the offline action queue to the user.
 * Hides itself when the queue is empty.
 */
const SyncStatusBadge = () => {
  const [queue, setQueue] = useState<SyncAction[]>([]);

  useEffect(() => subscribeQueue(setQueue), []);

  const pending = queue.filter((a) => a.status === "queued" || a.status === "syncing");
  const failed = queue.filter((a) => a.status === "failed");
  const visible = pending.length + failed.length > 0;

  if (!visible) return null;

  const isSyncing = queue.some((a) => a.status === "syncing");
  const allFailed = pending.length === 0 && failed.length > 0;

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        onClick={() => void drain()}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 rounded-full bg-card/95 backdrop-blur-md border border-border px-3.5 py-2 shadow-lg text-xs font-medium hover:scale-105 transition-transform"
        aria-label="Sync status — tap to retry"
        data-testid="sync-status-badge"
      >
        {allFailed ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-destructive">{failed.length} failed</span>
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
      </motion.button>
    </AnimatePresence>
  );
};

export default SyncStatusBadge;
