import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Shield, Lock, Eye, RotateCcw, Trash2, Search, Download, RefreshCw,
  Terminal, Database, Activity, Clock, User, Monitor, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Filter, Loader2, Zap, Cpu, Globe,
} from "lucide-react";

const NEON_GREEN = "#00ff88";
const NEON_BLUE = "#00d4ff";
const NEON_PURPLE = "#a855f7";

const DatabaseEntryReversal = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, any>>({});
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteStep, setDeleteStep] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterPanel, setFilterPanel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(900);
  const PAGE_SIZE = 20;
  const channelRef = useRef<any>(null);

  // Scan line animation
  useEffect(() => {
    if (!authenticated) return;
    const iv = setInterval(() => setScanLine(p => (p + 1) % 100), 50);
    return () => clearInterval(iv);
  }, [authenticated]);

  // Session timeout
  useEffect(() => {
    if (!authenticated) return;
    const iv = setInterval(() => {
      setSessionTimer(p => {
        if (p <= 1) { setAuthenticated(false); return 900; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [authenticated]);

  // Lock timer
  useEffect(() => {
    if (!locked) return;
    const iv = setInterval(() => {
      setLockTimer(p => { if (p <= 1) { setLocked(false); setAttempts(0); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(iv);
  }, [locked]);

  // Realtime subscription for reversal_logs
  useEffect(() => {
    if (!authenticated) return;
    channelRef.current = supabase
      .channel("reversal-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reversal_logs" }, () => {
        fetchLogs();
      })
      .subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [authenticated]);

  const handleAccessVerify = useCallback(async () => {
    if (locked) return;
    if (attempts >= 3) { setLocked(true); setLockTimer(600); return; }
    setLoading(true);
    try {
      const normalizedCode = accessCode.replace(/[-\s]/g, "");
      if (normalizedCode === "01022006") {
        try {
          await supabase.from("reversal_access_logs" as any).insert({
            ip_address: "client", device: navigator.userAgent?.slice(0, 200) || "unknown", status: "success",
          });
        } catch {}
        setAuthenticated(true);
        setSessionTimer(900);
      } else {
        try {
          await supabase.from("reversal_access_logs" as any).insert({
            ip_address: "client", device: navigator.userAgent?.slice(0, 200) || "unknown", status: "fail",
          });
        } catch {}
        setAttempts(p => p + 1);
        toast({ title: `Invalid code (${2 - attempts} attempts left)`, variant: "destructive" });
      }
    } catch {}
    setLoading(false);
  }, [accessCode, locked, attempts]);

  const fetchLogs = useCallback(async () => {
    setRefreshing(true);
    try {
      let query = supabase.from("reversal_logs" as any).select("*", { count: "exact" })
        .order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (filterType !== "all") query = query.eq("entity_type", filterType);
      if (filterAction !== "all") query = query.eq("action_type", filterAction);
      if (filterPanel !== "all") query = query.eq("source_panel", filterPanel);
      if (searchQuery.trim()) query = query.or(`entity_type.ilike.%${searchQuery}%,performed_by.ilike.%${searchQuery}%,entity_id.ilike.%${searchQuery}%`);
      const { data, count } = await query as any;
      if (data) { setLogs(data); setTotalCount(count || 0); }
    } catch (err) { console.error("Fetch logs error:", err); }
    setRefreshing(false);
  }, [page, filterType, filterAction, filterPanel, searchQuery]);

  const fetchAccessLogs = useCallback(async () => {
    const { data } = await supabase.from("reversal_access_logs" as any).select("*").order("created_at", { ascending: false }).limit(50) as any;
    if (data) setAccessLogs(data);
  }, []);

  const fetchSnapshot = async (logId: string) => {
    const { data } = await supabase.from("reversal_snapshots" as any).select("*").eq("log_id", logId).order("created_at", { ascending: false }) as any;
    if (data) setSnapshots(prev => ({ ...prev, [logId]: data }));
  };

  // Fetch logs when authenticated or filters change
  useEffect(() => {
    if (authenticated) {
      fetchLogs();
      fetchAccessLogs();
    }
  }, [authenticated, page, filterType, filterAction, filterPanel, searchQuery, fetchLogs, fetchAccessLogs]);

  const handleRestore = async (logId: string) => {
    try {
      const { data } = await supabase.functions.invoke("reversal-restore", { body: { action: "restore", logId } });
      if (data?.success) { toast({ title: "✅ Data Restored Successfully" }); fetchLogs(); }
      else toast({ title: "Restore failed", description: data?.error || "Unknown error", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Restore error", description: err?.message, variant: "destructive" });
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteLogId) return;
    try {
      const { data } = await supabase.functions.invoke("reversal-restore", { body: { action: "permanent_delete", logId: deleteLogId, code: deleteCode } });
      if (data?.success) {
        toast({ title: "🗑️ Permanently Deleted" });
        setShowDeleteConfirm(false); setDeleteStep(0); setDeleteCode(""); setDeleteLogId(null);
        fetchLogs();
      } else toast({ title: "Delete failed - invalid code", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Delete error", description: err?.message, variant: "destructive" });
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) { toast({ title: "No data to export" }); return; }
    const headers = ["ID", "Entity Type", "Entity ID", "Action", "Source Panel", "Performed By", "Role", "Timestamp", "Device", "IP"];
    const escapeField = (f: any) => {
      const str = String(f ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = logs.map(l => [l.id, l.entity_type, l.entity_id, l.action_type, l.source_panel, l.performed_by, l.role, l.created_at, l.device_info, l.ip_address].map(escapeField));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `reversal_logs_${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "✅ CSV exported" });
  };

  const viewDetail = async (log: any) => {
    setSelectedLog(log);
    await fetchSnapshot(log.id);
    setShowDetail(true);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const actionColor = (a: string) => {
    if (a === "delete") return "text-red-400 bg-red-500/10 border-red-500/20";
    if (a === "create") return "text-green-400 bg-green-500/10 border-green-500/20";
    if (a === "update") return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (a === "restore") return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  };

  // Derive unique filter options from current data + allow broader selection
  const entityTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];
  const actionTypes = [...new Set(logs.map(l => l.action_type).filter(Boolean))];
  const panelTypes = [...new Set(logs.map(l => l.source_panel).filter(Boolean))];

  // ACCESS SCREEN
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)" }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(${NEON_GREEN}40 1px, transparent 1px), linear-gradient(90deg, ${NEON_GREEN}40 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <motion.div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-[120px] opacity-10" style={{ background: NEON_GREEN }}
          animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 6, repeat: Infinity }} />
        <motion.div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-[100px] opacity-10" style={{ background: NEON_BLUE }}
          animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 8, repeat: Infinity }} />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
          <div className="border border-[#1a1a2e] bg-[#0a0a14]/95 backdrop-blur-xl rounded-2xl p-8 shadow-[0_0_60px_rgba(0,255,136,0.05)]">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-[10px] text-white/20 ml-2 font-mono">recovery_console.exe</span>
            </div>
            <div className="text-center space-y-4">
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <Database className="w-12 h-12 mx-auto" style={{ color: NEON_GREEN }} />
              </motion.div>
              <h1 className="text-xl font-bold text-white font-mono tracking-wider">DATABASE RECOVERY CONSOLE</h1>
              <p className="text-xs text-white/30 font-mono">System Control Layer • v2.0</p>
              <motion.div className="flex items-center justify-center gap-2" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono" style={{ color: NEON_GREEN }}>SYSTEM ONLINE</span>
              </motion.div>
            </div>

            {locked ? (
              <div className="mt-6 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                <p className="text-red-400 font-mono text-sm">ACCESS LOCKED</p>
                <p className="text-white/30 font-mono text-xs">Retry in {formatTime(lockTimer)}</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAccessVerify()}
                    placeholder="Enter access code..."
                    className="pl-10 h-12 bg-[#0f0f1a] border-[#1a1a2e] text-white font-mono tracking-[0.3em] text-center rounded-xl focus:border-green-500/50 placeholder:text-white/15"
                    autoFocus />
                </div>
                <Button onClick={handleAccessVerify} disabled={loading || !accessCode}
                  className="w-full h-12 rounded-xl font-mono text-sm tracking-wider border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                  {loading ? "VERIFYING..." : "AUTHENTICATE"}
                </Button>
                <p className="text-[10px] text-white/20 text-center font-mono">{3 - attempts} attempts remaining</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // MAIN CONSOLE
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white relative overflow-hidden">
      <motion.div className="absolute left-0 right-0 h-[2px] pointer-events-none z-50 opacity-10"
        style={{ top: `${scanLine}%`, background: `linear-gradient(90deg, transparent, ${NEON_GREEN}, transparent)` }} />
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(${NEON_GREEN}40 1px, transparent 1px), linear-gradient(90deg, ${NEON_GREEN}40 1px, transparent 1px)`, backgroundSize: "50px 50px" }} />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a14]/98 backdrop-blur-xl border-b border-[#1a1a2e]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
              <Cpu className="w-5 h-5" style={{ color: NEON_GREEN }} />
            </motion.div>
            <div>
              <h1 className="text-sm font-bold font-mono tracking-wider" style={{ color: NEON_GREEN }}>DATABASE RECOVERY CONSOLE</h1>
              <p className="text-[10px] text-white/25 font-mono">System Control Layer</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f0f1a] border border-[#1a1a2e]">
              <Activity className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-white/40">Session: {formatTime(sessionTimer)}</span>
            </div>
            <Badge variant="outline" className="border-[#1a1a2e] text-white/40 font-mono text-[10px]">{totalCount} records</Badge>
            <Button size="sm" variant="ghost" onClick={() => { setAuthenticated(false); setAccessCode(""); }}
              className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 font-mono text-[10px]">LOGOUT</Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search logs..."
              className="pl-9 h-9 bg-[#0f0f1a] border-[#1a1a2e] text-white/80 font-mono text-xs rounded-lg focus:border-green-500/30" />
          </div>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-9 bg-[#0f0f1a] border-[#1a1a2e] text-white/60 font-mono text-xs rounded-lg">
              <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f0f1a] border-[#1a1a2e] text-white/80">
              <SelectItem value="all">All Types</SelectItem>
              {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-9 bg-[#0f0f1a] border-[#1a1a2e] text-white/60 font-mono text-xs rounded-lg">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f0f1a] border-[#1a1a2e] text-white/80">
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPanel} onValueChange={(v) => { setFilterPanel(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-9 bg-[#0f0f1a] border-[#1a1a2e] text-white/60 font-mono text-xs rounded-lg">
              <SelectValue placeholder="Panel" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f0f1a] border-[#1a1a2e] text-white/80">
              <SelectItem value="all">All Panels</SelectItem>
              {panelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => { fetchLogs(); fetchAccessLogs(); }}
            className="h-9 text-white/40 hover:text-white/70 font-mono text-xs border border-[#1a1a2e] hover:bg-[#0f0f1a]">
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" variant="ghost" onClick={exportCSV}
            className="h-9 text-white/40 hover:text-white/70 font-mono text-xs border border-[#1a1a2e] hover:bg-[#0f0f1a]">
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 pb-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Total Logs", value: totalCount, icon: Database, color: NEON_GREEN },
            { label: "Deletes", value: logs.filter(l => l.action_type === "delete").length, icon: Trash2, color: "#ef4444" },
            { label: "Updates", value: logs.filter(l => l.action_type === "update").length, icon: Activity, color: NEON_BLUE },
            { label: "Access Logs", value: accessLogs.length, icon: Globe, color: NEON_PURPLE },
          ].map((s) => (
            <motion.div key={s.label} whileHover={{ scale: 1.02 }}
              className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-white/25 font-mono">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="space-y-2">
          {refreshing && logs.length === 0 && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-green-500/40 mx-auto animate-spin" />
              <p className="text-white/20 font-mono text-xs mt-2">Loading logs...</p>
            </div>
          )}
          <AnimatePresence>
            {logs.map((log, idx) => (
              <motion.div key={log.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.02 }}
                className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-3 md:p-4 hover:border-[#2a2a3e] transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0f0f1a] border border-[#1a1a2e] flex items-center justify-center flex-shrink-0">
                      <Zap className="w-3.5 h-3.5 text-white/30" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-white/70 font-semibold">{log.entity_type}</span>
                        <Badge className={`text-[9px] font-mono border ${actionColor(log.action_type)}`}>{log.action_type}</Badge>
                        <Badge variant="outline" className="text-[9px] font-mono border-[#1a1a2e] text-white/30">{log.source_panel}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-white/25 font-mono flex-wrap">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.performed_by || "unknown"}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}</span>
                        {log.entity_id && <span className="text-white/15 truncate max-w-[120px]">ID: {log.entity_id?.slice(0, 8)}...</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => viewDetail(log)}
                      className="h-7 px-2 text-white/30 hover:text-white/70 hover:bg-[#0f0f1a] font-mono text-[10px]">
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRestore(log.id)}
                      className="h-7 px-2 text-green-400/40 hover:text-green-400 hover:bg-green-500/10 font-mono text-[10px]">
                      <RotateCcw className="w-3 h-3 mr-1" /> Restore
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDeleteLogId(log.id); setDeleteStep(1); setShowDeleteConfirm(true); }}
                      className="h-7 px-2 text-red-400/30 hover:text-red-400 hover:bg-red-500/10 font-mono text-[10px]">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!refreshing && logs.length === 0 && (
            <div className="text-center py-16">
              <Terminal className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/20 font-mono text-sm">No reversal logs found</p>
              <p className="text-white/10 font-mono text-xs mt-1">Actions will appear here as they're tracked</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="text-white/30 hover:text-white/60 font-mono text-xs border border-[#1a1a2e]">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-[10px] font-mono text-white/25">Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}</span>
            <Button size="sm" variant="ghost" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalCount}
              className="text-white/30 hover:text-white/60 font-mono text-xs border border-[#1a1a2e]">
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[#0a0a14] border-[#1a1a2e] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm" style={{ color: NEON_GREEN }}>
              <Database className="w-4 h-4 inline mr-2" />Log Detail — {selectedLog?.entity_type}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Entity Type", value: selectedLog.entity_type },
                  { label: "Entity ID", value: selectedLog.entity_id || "N/A" },
                  { label: "Action", value: selectedLog.action_type },
                  { label: "Source", value: selectedLog.source_panel },
                  { label: "Performed By", value: selectedLog.performed_by },
                  { label: "Role", value: selectedLog.role },
                  { label: "Timestamp", value: new Date(selectedLog.created_at).toLocaleString() },
                  { label: "Device", value: selectedLog.device_info?.slice(0, 50) || "N/A" },
                ].map(f => (
                  <div key={f.label} className="bg-[#0f0f1a] border border-[#1a1a2e] rounded-lg p-2.5">
                    <p className="text-[9px] text-white/25 font-mono uppercase">{f.label}</p>
                    <p className="text-xs text-white/70 font-mono mt-0.5 break-all">{f.value}</p>
                  </div>
                ))}
              </div>
              {snapshots[selectedLog.id]?.map((snap: any, i: number) => (
                <div key={i} className="space-y-2">
                  <p className="text-[10px] text-white/30 font-mono">Version {snap.version}</p>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-red-400/60 font-mono mb-1">PREVIOUS DATA</p>
                      <pre className="bg-[#0f0f1a] border border-red-500/10 rounded-lg p-3 text-[10px] text-white/50 font-mono overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
                        {snap.previous_data ? JSON.stringify(snap.previous_data, null, 2) : "null"}
                      </pre>
                    </div>
                    <div>
                      <p className="text-[9px] text-green-400/60 font-mono mb-1">NEW DATA</p>
                      <pre className="bg-[#0f0f1a] border border-green-500/10 rounded-lg p-3 text-[10px] text-white/50 font-mono overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
                        {snap.new_data ? JSON.stringify(snap.new_data, null, 2) : "null"}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleRestore(selectedLog.id)}
                  className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 font-mono text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Restore
                </Button>
                <Button size="sm" onClick={() => { setDeleteLogId(selectedLog.id); setDeleteStep(1); setShowDeleteConfirm(true); setShowDetail(false); }}
                  className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-mono text-xs">
                  <Trash2 className="w-3 h-3 mr-1" /> Permanent Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3-Step Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={(v) => { if (!v) { setDeleteStep(0); setDeleteCode(""); } setShowDeleteConfirm(v); }}>
        <AlertDialogContent className="bg-[#0a0a14] border-[#1a1a2e] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-red-400 flex items-center gap-2">
              {deleteStep === 1 && <><AlertTriangle className="w-5 h-5" /> Step 1: Confirm Deletion</>}
              {deleteStep === 2 && <><XCircle className="w-5 h-5" /> Step 2: Final Warning</>}
              {deleteStep === 3 && <><Lock className="w-5 h-5" /> Step 3: Enter Security Code</>}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-white/40 text-xs">
              {deleteStep === 1 && "This will permanently remove this log and all snapshots. This action CANNOT be undone."}
              {deleteStep === 2 && "⚠️ HIGH SEVERITY: You are about to permanently delete data. Are you certain?"}
              {deleteStep === 3 && "Enter the permanent deletion code to proceed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteStep === 3 && (
            <Input type="password" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value)}
              placeholder="Enter code: 01022006"
              className="bg-[#0f0f1a] border-red-500/20 text-white font-mono text-center tracking-[0.3em] focus:border-red-500/50"
              autoFocus />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#0f0f1a] border-[#1a1a2e] text-white/40 hover:text-white/60 font-mono text-xs"
              onClick={() => { setDeleteStep(0); setDeleteCode(""); }}>Cancel</AlertDialogCancel>
            {deleteStep < 3 ? (
              <AlertDialogAction onClick={(e) => { e.preventDefault(); setDeleteStep(p => p + 1); }}
                className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-mono text-xs">
                {deleteStep === 1 ? "Continue →" : "I'm Sure →"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handlePermanentDelete(); }}
                disabled={!deleteCode}
                className="bg-red-600 text-white hover:bg-red-700 font-mono text-xs">
                DELETE PERMANENTLY
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DatabaseEntryReversal;
