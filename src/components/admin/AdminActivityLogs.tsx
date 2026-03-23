import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Activity, Search, Filter, ChevronDown, ChevronUp, Clock, User, Monitor, Globe } from "lucide-react";

type ActivityLog = {
  id: string; admin_id: string; admin_name: string; action_type: string;
  module: string; target_id: string | null; old_value: any; new_value: any;
  description: string | null; ip_address: string | null; device_info: string | null;
  created_at: string;
};

const MODULE_COLORS: Record<string, string> = {
  orders: "bg-blue-100 text-blue-800",
  events: "bg-purple-100 text-purple-800",
  payments: "bg-green-100 text-green-800",
  customers: "bg-amber-100 text-amber-800",
  artists: "bg-pink-100 text-pink-800",
  content: "bg-cyan-100 text-cyan-800",
  settings: "bg-gray-100 text-gray-800",
  auth: "bg-red-100 text-red-800",
  general: "bg-muted text-muted-foreground",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-blue-100 text-blue-800",
  logout: "bg-gray-100 text-gray-800",
  view: "bg-sky-100 text-sky-800",
};

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNames, setAdminNames] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();
    const ch = supabase.channel("activity-logs-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_activity_logs" }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase.from("admin_activity_logs" as any)
      .select("*").order("created_at", { ascending: false }).limit(500);
    if (data) {
      setLogs(data as any);
      const names = [...new Set((data as any[]).map((l: any) => l.admin_name))];
      setAdminNames(names);
    }
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (moduleFilter !== "all" && l.module !== moduleFilter) return false;
    if (actionFilter !== "all" && l.action_type !== actionFilter) return false;
    if (adminFilter !== "all" && l.admin_name !== adminFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.description?.toLowerCase().includes(q) || l.admin_name.toLowerCase().includes(q) || l.module.toLowerCase().includes(q));
    }
    return true;
  });

  const modules = [...new Set(logs.map(l => l.module))];
  const actions = [...new Set(logs.map(l => l.action_type))];

  const formatDate = (d: string) => new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading activity logs...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Activity Logs
        </h2>
        <Badge variant="outline" className="font-sans">{filtered.length} entries</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9 text-sm" />
            </div>
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="h-9 text-sm"><User className="w-3 h-3 mr-1" /><SelectValue placeholder="Admin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Admins</SelectItem>
                {adminNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-9 text-sm"><Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No activity logs found</p></CardContent></Card>
        ) : filtered.map(log => (
          <Card key={log.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-sm font-semibold font-sans">{log.admin_name}</span>
                    <Badge className={`text-[9px] border-none ${ACTION_COLORS[log.action_type] || "bg-muted text-muted-foreground"}`}>
                      {log.action_type}
                    </Badge>
                    <Badge className={`text-[9px] border-none ${MODULE_COLORS[log.module] || "bg-muted text-muted-foreground"}`}>
                      {log.module}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans truncate">{log.description || "No description"}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</span>
                  {expandedId === log.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </div>
              
              {expandedId === log.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs font-sans">
                  {log.ip_address && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="w-3 h-3" /> IP: {log.ip_address}
                    </div>
                  )}
                  {log.device_info && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Monitor className="w-3 h-3" /> {log.device_info}
                    </div>
                  )}
                  {log.target_id && (
                    <div className="text-muted-foreground">Target: {log.target_id}</div>
                  )}
                  {(log.old_value || log.new_value) && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {log.old_value && (
                        <div className="bg-red-50 rounded-lg p-2">
                          <p className="font-semibold text-red-700 mb-1">Old Value</p>
                          <pre className="text-[10px] whitespace-pre-wrap break-all text-red-600">{JSON.stringify(log.old_value, null, 2)}</pre>
                        </div>
                      )}
                      {log.new_value && (
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="font-semibold text-green-700 mb-1">New Value</p>
                          <pre className="text-[10px] whitespace-pre-wrap break-all text-green-600">{JSON.stringify(log.new_value, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminActivityLogs;
