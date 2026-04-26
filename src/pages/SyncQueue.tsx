import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, CloudOff, Loader2, Trash2, Inbox,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import {
  subscribeQueue, drain, retryAction, retryFailed, discardAction,
  type SyncAction, type SyncActionType,
} from "@/lib/sync-queue";

/**
 * User-facing screen that lists every queued action (orders, bookings, image
 * uploads, signups) with its current sync state. Each row offers manual retry
 * or discard, and the header has a "Retry all failed" + "Sync now" action.
 */

const TYPE_LABEL: Record<SyncActionType, string> = {
  "auth.signup": "Account signup",
  "order.create": "Caricature order",
  "event.book": "Event booking",
  "image.upload": "Photo upload",
  "profile.update": "Profile update",
};

const STATUS_META = {
  queued:  { label: "Queued",   icon: CloudOff,    cls: "text-amber-500"  },
  syncing: { label: "Syncing",  icon: Loader2,     cls: "text-primary animate-spin" },
  synced:  { label: "Synced",   icon: CheckCircle2,cls: "text-green-600"  },
  failed:  { label: "Failed",   icon: AlertCircle, cls: "text-destructive"},
} as const;

const formatPayloadSummary = (a: SyncAction): string => {
  const p = a.payload || {};
  switch (a.type) {
    case "order.create":  return `${p.customer_name || "—"} • ₹${p.amount ?? "—"} • ${p.order_type || ""}`;
    case "event.book":    return `${p.client_name || "—"} • ${p.event_date || ""} • ${p.city || ""}`;
    case "image.upload":  return `${p.bucket || ""}/${(p.path || "").split("/").pop() || ""}`;
    case "auth.signup":   return p.email || p.metadata?.full_name || "—";
    case "profile.update":return p.full_name || p.email || "—";
    default:              return "";
  }
};

const timeAgo = (ts: number) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

/** Routes that make sense for a "view details" deep-link per action type. */
const detailLink = (a: SyncAction): { href: string; label: string } | null => {
  switch (a.type) {
    case "order.create":  return { href: "/track-order", label: "Track this order" };
    case "event.book":    return { href: "/dashboard", label: "Open my dashboard" };
    case "image.upload":  {
      // Image uploads are linked to a parent order via relatedId — surface that.
      return { href: "/track-order", label: "Open related order" };
    }
    case "auth.signup":   return { href: "/login", label: "Try login" };
    case "profile.update":return { href: "/dashboard", label: "Open my profile" };
    default:              return null;
  }
};

const SyncQueue = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<SyncAction[]>([]);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = subscribeQueue(setQueue);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      unsub();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const grouped = useMemo(() => ({
    failed:  queue.filter((a) => a.status === "failed"),
    syncing: queue.filter((a) => a.status === "syncing"),
    queued:  queue.filter((a) => a.status === "queued"),
    synced:  queue.filter((a) => a.status === "synced"),
  }), [queue]);
  const ordered: SyncAction[] = [...grouped.failed, ...grouped.syncing, ...grouped.queued, ...grouped.synced];

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <>
      <SEOHead title="Sync Queue" description="Status of your queued offline actions." canonical="/sync-queue" noindex />
      <div className="min-h-screen bg-background pb-24">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3 max-w-3xl">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg font-bold truncate">Sync Queue</h1>
              <p className="text-xs text-muted-foreground">
                {online ? "Online" : "Offline"} · {queue.length} item{queue.length === 1 ? "" : "s"}
              </p>
            </div>
            {grouped.failed.length > 0 && (
              <Button size="sm" variant="destructive" onClick={() => retryFailed()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry failed
              </Button>
            )}
            <Button size="sm" onClick={() => void drain()} disabled={!online}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync now
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
          {ordered.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="font-semibold text-foreground">All caught up</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Nothing pending. Anything you create offline will appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {ordered.map((a) => {
            const meta = STATUS_META[a.status];
            const Icon = meta.icon;
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${meta.cls}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{TYPE_LABEL[a.type]}</span>
                          <span className={`text-[10px] uppercase tracking-wider font-bold ${meta.cls}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-muted-foreground">· {timeAgo(a.createdAt)}</span>
                          {a.attempts > 0 && (
                            <span className="text-xs text-muted-foreground">· {a.attempts} attempt{a.attempts === 1 ? "" : "s"}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {formatPayloadSummary(a)}
                        </p>
                        {a.lastError && (
                          <p className="text-xs text-destructive mt-1.5 break-words">
                            {a.lastError}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {(a.status === "failed" || a.status === "queued") && (
                          <Button size="sm" variant="outline" onClick={() => retryAction(a.id)}>
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {(a.status === "failed" || a.status === "synced") && (
                          <Button size="sm" variant="ghost" onClick={() => discardAction(a.id)} aria-label="Remove">
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </main>
      </div>
    </>
  );
};

export default SyncQueue;
