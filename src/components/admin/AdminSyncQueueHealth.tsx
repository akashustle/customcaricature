/**
 * Admin "Sync Queue Health" widget.
 *
 * Aggregates the latest heartbeat per client_id from `sync_queue_health` and
 * shows admins the live picture of who's stuck offline, how many actions
 * are pending across the user base, and which devices are failing the most.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, AlertTriangle, Loader2, Smartphone, Monitor, Apple } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HealthRow {
  id: string;
  client_id: string;
  user_email: string | null;
  device_type: string;
  pending_count: number;
  failed_count: number;
  syncing_count: number;
  oldest_queued_at: string | null;
  last_error: string | null;
  reported_at: string;
}

const deviceIcon = (d: string) => {
  if (d.includes("ios")) return Apple;
  if (d.includes("android") || d.includes("capacitor")) return Smartphone;
  return Monitor;
};

const deviceLabel = (d: string) => {
  if (d === "capacitor-android") return "Android app";
  if (d === "capacitor-ios") return "iOS app";
  if (d === "capacitor") return "Native app";
  if (d === "web-android") return "Mobile web (Android)";
  if (d === "web-ios") return "Mobile web (iOS)";
  return "Desktop / web";
};

const AdminSyncQueueHealth = () => {
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Fetch the most recent ~500 heartbeats; we'll keep only the latest per client.
    const { data } = await supabase
      .from("sync_queue_health" as any)
      .select("id, client_id, user_email, device_type, pending_count, failed_count, syncing_count, oldest_queued_at, last_error, reported_at")
      .order("reported_at", { ascending: false })
      .limit(500);

    const seen = new Set<string>();
    const latest: HealthRow[] = [];
    (data as any[] | null || []).forEach((r) => {
      if (seen.has(r.client_id)) return;
      seen.add(r.client_id);
      latest.push(r);
    });
    setRows(latest);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // Only show clients with a non-zero backlog reported in the last 24h.
  const stuck = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return rows.filter(
      (r) =>
        new Date(r.reported_at).getTime() >= cutoff &&
        (r.pending_count + r.failed_count + r.syncing_count) > 0,
    );
  }, [rows]);

  const totals = useMemo(
    () => stuck.reduce(
      (acc, r) => ({
        pending: acc.pending + r.pending_count,
        failed: acc.failed + r.failed_count,
        syncing: acc.syncing + r.syncing_count,
      }),
      { pending: 0, failed: 0, syncing: 0 },
    ),
    [stuck],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Sync Queue Health
          </span>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Live picture of devices that still have offline actions waiting to upload.
          Updates every 30 seconds.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global totals */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-foreground">{totals.pending}</div>
          </div>
          <div className="rounded-lg border bg-amber-500/10 border-amber-500/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Syncing</div>
            <div className="text-2xl font-bold text-foreground">{totals.syncing}</div>
          </div>
          <div className="rounded-lg border bg-destructive/10 border-destructive/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-destructive">Failed</div>
            <div className="text-2xl font-bold text-foreground">{totals.failed}</div>
          </div>
        </div>

        {/* Per-client list */}
        {loading && rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
        ) : stuck.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            ✅ No stuck clients — everyone's queue is empty.
          </div>
        ) : (
          <div className="divide-y border rounded-lg overflow-hidden">
            {stuck.map((r) => {
              const Icon = deviceIcon(r.device_type);
              return (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-card">
                  <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {r.user_email || <span className="text-muted-foreground italic">guest</span>}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{deviceLabel(r.device_type)}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                      {r.pending_count > 0 && <span>📥 {r.pending_count} pending</span>}
                      {r.syncing_count > 0 && <span className="text-amber-600">⏳ {r.syncing_count} syncing</span>}
                      {r.failed_count > 0 && (
                        <span className="text-destructive inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {r.failed_count} failed
                        </span>
                      )}
                      <span>· {formatDistanceToNow(new Date(r.reported_at), { addSuffix: true })}</span>
                    </div>
                    {r.last_error && (
                      <div className="text-[11px] text-destructive/80 mt-1 truncate" title={r.last_error}>
                        {r.last_error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSyncQueueHealth;
