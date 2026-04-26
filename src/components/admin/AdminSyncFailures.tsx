import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, Smartphone, Monitor, Apple } from "lucide-react";

/**
 * Admin: Sync Failures Report
 *
 * Aggregates the failed `sync-queue:*` actions logged by the client error
 * reporter (`admin_security_alerts.alert_type = 'client_error'`) into
 * date × device-type rollups so the team can spot patterns:
 *   • spikes on a specific day
 *   • broken Android builds vs iOS vs desktop-web
 *   • specific action types (orders / event bookings / image uploads)
 *
 * Pulls the last 14 days by default; rolls up client-side because the
 * dataset is small (one row per failure).
 */

interface AlertRow {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
}

const parseDevice = (description: string | null): string => {
  const m = description?.match(/\[device:([^\]]+)\]/);
  return m?.[1] || "unknown";
};

const parseActionType = (title: string): string => {
  // Format: "sync-queue:order.create: <message>"
  const m = title.match(/^sync-queue:([^:]+)/);
  return m?.[1] || "other";
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const DEVICE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  android:        { label: "Android",     icon: Smartphone, cls: "text-green-600" },
  ios:            { label: "iOS",         icon: Apple,      cls: "text-foreground" },
  capacitor:      { label: "Capacitor",   icon: Smartphone, cls: "text-primary" },
  "mobile-web":   { label: "Mobile Web",  icon: Smartphone, cls: "text-amber-600" },
  "desktop-web":  { label: "Desktop Web", icon: Monitor,    cls: "text-blue-600" },
  unknown:        { label: "Unknown",     icon: Monitor,    cls: "text-muted-foreground" },
};

const AdminSyncFailures = () => {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data } = await supabase
      .from("admin_security_alerts")
      .select("id, created_at, title, description")
      .eq("alert_type", "client_error")
      .like("title", "sync-queue:%")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data || []) as AlertRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  const summary = useMemo(() => {
    // dateKey -> deviceKey -> count
    const byDay: Record<string, Record<string, number>> = {};
    const byType: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    rows.forEach((r) => {
      const day = r.created_at.slice(0, 10);
      const device = parseDevice(r.description);
      const type = parseActionType(r.title);
      byDay[day] ??= {};
      byDay[day][device] = (byDay[day][device] || 0) + 1;
      byType[type] = (byType[type] || 0) + 1;
      byDevice[device] = (byDevice[device] || 0) + 1;
    });
    const days = Object.keys(byDay).sort().reverse();
    const devices = Array.from(new Set(rows.map((r) => parseDevice(r.description)))).sort();
    return { byDay, byType, byDevice, days, devices };
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Sync Failures Report
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            🎉 No sync failures in the selected window.
          </div>
        ) : (
          <>
            {/* Top summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border border-border p-3">
                <div className="text-2xl font-bold">{rows.length}</div>
                <div className="text-xs text-muted-foreground">Total failures</div>
              </div>
              {Object.entries(summary.byDevice).slice(0, 3).map(([d, n]) => {
                const meta = DEVICE_META[d] || DEVICE_META.unknown;
                const Icon = meta.icon;
                return (
                  <div key={d} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${meta.cls}`} />
                      <span className="text-2xl font-bold">{n}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{meta.label}</div>
                  </div>
                );
              })}
            </div>

            {/* By action type */}
            <div>
              <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">By action type</h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.byType).sort(([, a], [, b]) => b - a).map(([t, n]) => (
                  <Badge key={t} variant="outline" className="font-mono text-[10px]">{t} · {n}</Badge>
                ))}
              </div>
            </div>

            {/* Date × Device matrix */}
            <div>
              <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Date × Device</h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Date</th>
                      {summary.devices.map((d) => (
                        <th key={d} className="text-right px-3 py-2 font-semibold">
                          {(DEVICE_META[d] || DEVICE_META.unknown).label}
                        </th>
                      ))}
                      <th className="text-right px-3 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.days.map((day) => {
                      const total = Object.values(summary.byDay[day]).reduce((a, b) => a + b, 0);
                      return (
                        <tr key={day} className="border-t border-border">
                          <td className="px-3 py-2">{fmtDay(day)}</td>
                          {summary.devices.map((d) => (
                            <td key={d} className="px-3 py-2 text-right tabular-nums">
                              {summary.byDay[day][d] || 0}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent failures list */}
            <div>
              <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Recent failures</h4>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {rows.slice(0, 30).map((r) => (
                  <div key={r.id} className="rounded-md border border-border p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {(DEVICE_META[parseDevice(r.description)] || DEVICE_META.unknown).label}
                      </Badge>
                    </div>
                    <div className="font-medium mt-1 break-words">{r.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSyncFailures;
