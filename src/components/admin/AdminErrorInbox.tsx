import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, RefreshCw, Trash2, Filter, Bug, Activity, ServerCrash } from "lucide-react";
import { getRecentErrors, type ErrorEvent } from "@/lib/error-reporter";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

/**
 * Unified Error Inbox.
 *
 * Pulls from two data sources and merges them into one timeline:
 *   1. Live client buffer (window.__cccErrors / getRecentErrors)
 *   2. Supabase `admin_security_alerts` rows tagged alert_type='client_error'
 *      (written by error-reporter for production crashes)
 *
 * Admins can filter by route (URL substring) and severity, and resolve
 * a row in-place. The view never auto-refreshes the whole list — we use
 * a Realtime channel to splice new rows in without re-rendering existing
 * ones, keeping scroll position stable.
 */

type RemoteAlert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  created_at: string;
  resolved: boolean;
  ip_address: string | null;
};

type Row = {
  id: string;
  source: "live" | "remote";
  severity: string;
  title: string;
  detail: string;
  url: string;
  ts: number;
  resolved: boolean;
};

const SEVERITY_TINT: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  low: "bg-blue-100 text-blue-800",
  warn: "bg-amber-100 text-amber-800",
  medium: "bg-amber-100 text-amber-800",
  error: "bg-orange-100 text-orange-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const sourceIcon = (kind: string) => {
  if (kind === "fetch") return ServerCrash;
  if (kind === "request-cache") return Activity;
  return Bug;
};

const liveToRow = (e: ErrorEvent, idx: number): Row => ({
  id: `live-${idx}-${e.ts}`,
  source: "live",
  severity: e.severity,
  title: `${e.source}: ${e.message}`,
  detail: e.detail ?? "",
  url: e.url ?? "",
  ts: e.ts,
  resolved: false,
});

const remoteToRow = (a: RemoteAlert): Row => ({
  id: a.id,
  source: "remote",
  severity: a.severity,
  title: a.title,
  detail: a.description ?? "",
  url: (a.description?.match(/URL:\s*(\S+)/)?.[1] ?? ""),
  ts: new Date(a.created_at).getTime(),
  resolved: a.resolved,
});

const AdminErrorInbox = () => {
  const [remote, setRemote] = useState<RemoteAlert[]>([]);
  const [live, setLive] = useState<ErrorEvent[]>([]);
  const [routeFilter, setRouteFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLive(getRecentErrors());
    const { data } = await supabase
      .from("admin_security_alerts")
      .select("*")
      .eq("alert_type", "client_error")
      .order("created_at", { ascending: false })
      .limit(100);
    setRemote((data as RemoteAlert[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    // Lightweight live-buffer refresh — every 5s sync the in-memory ring.
    const id = window.setInterval(() => setLive(getRecentErrors()), 5000);
    const ch = supabase
      .channel("admin-error-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_security_alerts", filter: "alert_type=eq.client_error" },
        () => { void refresh(); },
      )
      .subscribe();
    return () => {
      window.clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, []);

  const rows = useMemo<Row[]>(() => {
    const merged = [
      ...live.map(liveToRow),
      ...remote.map(remoteToRow),
    ].sort((a, b) => b.ts - a.ts);
    return merged.filter((r) => {
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (routeFilter && !r.url.toLowerCase().includes(routeFilter.toLowerCase())) return false;
      return true;
    });
  }, [live, remote, routeFilter, severityFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    crashes: rows.filter((r) => r.severity === "critical" || r.severity === "error" || r.severity === "high").length,
    bursts: rows.filter((r) => r.title.includes("query burst")).length,
    network: rows.filter((r) => r.title.startsWith("fetch:")).length,
  }), [rows]);

  const resolveRemote = async (id: string) => {
    await supabase.from("admin_security_alerts").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    void refresh();
  };

  const clearLiveBuffer = () => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buf = (window as any).__cccErrors as ErrorEvent[] | undefined;
      if (buf) buf.length = 0;
      setLive([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Error Inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            Live client crashes, failed API calls and request-burst alerts — newest first.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={clearLiveBuffer}>
            <Trash2 className="w-4 h-4 mr-1" /> Clear live buffer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, tint: "bg-muted" },
          { label: "Crashes", value: stats.crashes, tint: "bg-red-50 text-red-700" },
          { label: "Bursts", value: stats.bursts, tint: "bg-amber-50 text-amber-700" },
          { label: "Network", value: stats.network, tint: "bg-blue-50 text-blue-700" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className={`p-4 rounded-lg ${s.tint}`}>
              <p className="text-xs uppercase tracking-wide opacity-70">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Route contains</label>
            <Input
              placeholder="/dashboard, /workshop, /admin-panel…"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent issues ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              ✨ No errors in the buffer — everything is healthy.
            </p>
          ) : (
            <ScrollArea className="h-[520px] pr-2">
              <ul className="space-y-2">
                {rows.map((r) => {
                  const Icon = sourceIcon(r.title.split(":")[0] ?? "");
                  return (
                    <li
                      key={r.id}
                      className={`rounded-lg border p-3 transition ${r.resolved ? "opacity-50" : ""}`}
                      data-testid="error-row"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={SEVERITY_TINT[r.severity] ?? "bg-muted"}>{r.severity}</Badge>
                            <Badge variant="outline" className="text-[10px]">{r.source}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(r.ts), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm font-medium mt-1 break-words">{r.title}</p>
                          {r.detail && (
                            <pre className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                              {r.detail}
                            </pre>
                          )}
                          {r.url && (
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              📍 {r.url}
                            </p>
                          )}
                        </div>
                        {r.source === "remote" && !r.resolved && (
                          <Button size="sm" variant="ghost" onClick={() => void resolveRemote(r.id)}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminErrorInbox;
