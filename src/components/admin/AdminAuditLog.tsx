import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSharedChannel } from "@/hooks/useSharedChannel";
import { ShieldCheck, RefreshCw, Activity, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditRow {
  id: number;
  created_at: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  row_pk: string | null;
  actor_id: string | null;
  actor_role: string | null;
  changed_columns: string[] | null;
  summary: string | null;
}

const PAGE_SIZE = 100;

const opTone = (op: AuditRow["operation"]) =>
  op === "INSERT"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : op === "DELETE"
      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-300";

const roleTone = (role: string | null) =>
  role === "admin"
    ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
    : role === "user"
      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
      : "bg-muted text-muted-foreground";

export default function AdminAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [opFilter, setOpFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async () => {
    setError(null);
    let q = supabase
      .from("admin_audit_log" as any)
      .select(
        "id, created_at, table_name, operation, row_pk, actor_id, actor_role, changed_columns, summary",
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (tableFilter !== "all") q = q.eq("table_name", tableFilter);
    if (opFilter !== "all") q = q.eq("operation", opFilter);
    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data || []) as unknown as AuditRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilter, opFilter]);

  // Realtime: prepend new rows as they arrive
  useSharedChannel(
    (payload) => {
      const row = payload.new as AuditRow;
      if (!row) return;
      if (tableFilter !== "all" && row.table_name !== tableFilter) return;
      if (opFilter !== "all" && row.operation !== opFilter) return;
      setRows((prev) => [row, ...prev].slice(0, PAGE_SIZE));
    },
    { table: "admin_audit_log", event: "INSERT" },
  );

  const tableOptions = useMemo(() => {
    const set = new Set<string>(rows.map((r) => r.table_name));
    return Array.from(set).sort();
  }, [rows]);

  const visible = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.summary?.toLowerCase().includes(q) ||
        r.table_name.toLowerCase().includes(q) ||
        r.row_pk?.toLowerCase().includes(q) ||
        r.actor_id?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-background to-muted/30 border-border/60">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Audit Log</h2>
            <p className="text-sm text-muted-foreground">
              Every content & status change is recorded here in real time. Use it to debug missed user updates.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger><SelectValue placeholder="Table" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {tableOptions.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger><SelectValue placeholder="Operation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All operations</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search summary, row id, actor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </Card>
      )}

      <Card className="overflow-hidden">
        <ScrollArea className="h-[60vh]">
          {loading && rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No audit entries yet.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {visible.map((r) => (
                <li key={r.id} className="p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start gap-3 flex-wrap">
                    <Badge variant="outline" className={opTone(r.operation)}>{r.operation}</Badge>
                    <Badge variant="outline">{r.table_name}</Badge>
                    {r.actor_role && (
                      <Badge variant="outline" className={roleTone(r.actor_role)}>
                        {r.actor_role}
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium break-words">{r.summary}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {r.row_pk && <span>row: <code className="font-mono">{r.row_pk.slice(0, 12)}</code></span>}
                    {r.actor_id && <span>actor: <code className="font-mono">{r.actor_id.slice(0, 8)}</code></span>}
                    {r.changed_columns && r.changed_columns.length > 0 && (
                      <span>fields: {r.changed_columns.join(", ")}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
