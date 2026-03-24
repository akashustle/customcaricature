import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Users, Eye, MousePointerClick, Clock, Globe, Monitor, Smartphone,
  Activity, BarChart3, ArrowUpRight, Search, Star,
  Zap, MapPin, Layers, RefreshCw, UserCheck, Download
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const W = ({ icon: Icon, label, value, sub, gradient, data }: { icon: any; label: string; value: string | number; sub?: string; gradient: string; data?: any[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => data && setOpen(true)}
        className="relative overflow-hidden rounded-2xl bg-white border border-white/60 p-4 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))" }}>
        <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-15 blur-xl group-hover:opacity-25 transition-opacity`} />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {data && <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
          <p className="text-2xl font-extrabold mt-3 text-foreground tracking-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase tracking-wider">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
        </div>
      </motion.div>
      {data && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader><DialogTitle>{label} Details</DialogTitle></DialogHeader>
            <Table>
              <TableHeader><TableRow>{Object.keys(data[0] || {}).map(k => <TableHead key={k} className="text-xs">{k}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{data.slice(0, 50).map((r, i) => <TableRow key={i}>{Object.values(r).map((v: any, j) => <TableCell key={j} className="text-xs">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</TableCell>)}</TableRow>)}</TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

const AdminWebsiteAnalytics = () => {
  const [actions, setActions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [a, p, s, dl, cs, ll] = await Promise.all([
      supabase.from("app_actions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("user_id, full_name, email, created_at, city, state").order("created_at", { ascending: false }).limit(500),
      supabase.from("admin_sessions").select("*").order("login_at", { ascending: false }).limit(200),
      supabase.from("app_downloads").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("ai_chat_sessions").select("id, guest_name, guest_email, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_live_locations").select("*").eq("is_online", true),
    ]);
    setActions(a.data || []);
    setProfiles(p.data || []);
    setSessions(s.data || []);
    setDownloads(dl.data || []);
    setChatSessions(cs.data || []);
    setLiveLocations((ll.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("web-analytics-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_actions" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_live_locations" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const stats = useMemo(() => {
    const todayActions = actions.filter(a => a.created_at?.startsWith(today));
    const weekActions = actions.filter(a => a.created_at >= weekAgo);
    const monthActions = actions.filter(a => a.created_at >= monthAgo);
    const todayUsers = new Set(todayActions.map(a => a.user_id).filter(Boolean)).size;
    const weekUsers = new Set(weekActions.map(a => a.user_id).filter(Boolean)).size;
    const monthUsers = new Set(monthActions.map(a => a.user_id).filter(Boolean)).size;
    const totalUsers = profiles.length;
    const todaySignups = profiles.filter(p => p.created_at?.startsWith(today)).length;
    const weekSignups = profiles.filter(p => p.created_at >= weekAgo).length;
    const monthSignups = profiles.filter(p => p.created_at >= monthAgo).length;
    const mobileActions = actions.filter(a => a.device_info && /mobile|android|iphone/i.test(a.device_info)).length;
    const desktopActions = actions.length - mobileActions;
    const pageViews = actions.filter(a => a.action_type === "page_view").length;
    const clicks = actions.filter(a => a.action_type === "click" || a.action_type === "button_click").length;
    const searches = actions.filter(a => a.action_type === "search").length;
    const uniqueScreens = new Set(actions.map(a => a.screen).filter(Boolean)).size;
    const topScreens = Object.entries(actions.reduce((acc: Record<string, number>, a) => {
      if (a.screen) acc[a.screen] = (acc[a.screen] || 0) + 1; return acc;
    }, {})).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10);
    const topActions = Object.entries(actions.reduce((acc: Record<string, number>, a) => {
      acc[a.action_type] = (acc[a.action_type] || 0) + 1; return acc;
    }, {})).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10);
    const liveUsers = liveLocations.length;

    return {
      todayActions: todayActions.length, weekActions: weekActions.length, monthActions: monthActions.length,
      todayUsers, weekUsers, monthUsers, totalUsers, todaySignups, weekSignups, monthSignups,
      mobileActions, desktopActions, pageViews, clicks, searches, uniqueScreens,
      topScreens, topActions, chatCount: chatSessions.length, activeSessions: sessions.filter(s => s.is_active).length,
      totalActions: actions.length, totalDownloads: downloads.length, liveUsers,
    };
  }, [actions, profiles, sessions, downloads, chatSessions, liveLocations]);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  // Only website tracking widgets — NO revenue/order-value/money metrics
  const widgets = [
    { icon: Activity, label: "Live Users Now", value: stats.liveUsers, sub: "Currently on website", gradient: "from-red-500 to-rose-500" },
    { icon: Eye, label: "Total Page Actions", value: stats.totalActions, sub: `${stats.todayActions} today`, gradient: "from-blue-500 to-indigo-500", data: actions.slice(0, 50) },
    { icon: Users, label: "Total Users", value: stats.totalUsers, sub: `${stats.todaySignups} new today`, gradient: "from-emerald-500 to-teal-500", data: profiles.slice(0, 50) },
    { icon: Zap, label: "Active Today", value: stats.todayUsers, sub: `${stats.weekUsers} this week`, gradient: "from-violet-500 to-purple-500" },
    { icon: UserCheck, label: "New Signups (Week)", value: stats.weekSignups, sub: `${stats.monthSignups} this month`, gradient: "from-pink-500 to-rose-500" },
    { icon: Smartphone, label: "Mobile Actions", value: stats.mobileActions, sub: `${Math.round((stats.mobileActions / Math.max(1, stats.totalActions)) * 100)}%`, gradient: "from-rose-500 to-pink-500" },
    { icon: Monitor, label: "Desktop Actions", value: stats.desktopActions, sub: `${Math.round((stats.desktopActions / Math.max(1, stats.totalActions)) * 100)}%`, gradient: "from-slate-500 to-gray-600" },
    { icon: MousePointerClick, label: "Total Clicks", value: stats.clicks, gradient: "from-orange-500 to-red-500" },
    { icon: Search, label: "Searches", value: stats.searches, gradient: "from-amber-500 to-orange-500" },
    { icon: Globe, label: "Unique Pages", value: stats.uniqueScreens, gradient: "from-teal-500 to-emerald-500" },
    { icon: BarChart3, label: "Week Actions", value: stats.weekActions, sub: `${stats.monthActions} month`, gradient: "from-purple-500 to-violet-500" },
    { icon: Clock, label: "Today Page Views", value: stats.pageViews, gradient: "from-blue-500 to-sky-500" },
    { icon: Star, label: "Active Sessions", value: stats.activeSessions, gradient: "from-amber-500 to-yellow-500" },
    { icon: Download, label: "App Downloads", value: stats.totalDownloads, gradient: "from-green-500 to-emerald-500" },
    { icon: MapPin, label: "Month Signups", value: stats.monthSignups, gradient: "from-violet-500 to-indigo-500" },
    { icon: Layers, label: "Chat Sessions", value: stats.chatCount, gradient: "from-sky-500 to-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Website Analytics</h2>
          <p className="text-sm text-muted-foreground">Real-time tracking · No revenue metrics here</p>
        </div>
        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
          <Activity className="w-3 h-3 animate-pulse" /> {stats.liveUsers} Live
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {widgets.map((w, i) => <W key={i} {...w} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-lg border-white/60 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Top Pages Visited</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topScreens.map(([screen, count], i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[200px]">{screen}</span>
                  <Badge variant="secondary" className="text-xs">{count as number}</Badge>
                </div>
              ))}
              {stats.topScreens.length === 0 && <p className="text-xs text-muted-foreground">No page data yet</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-lg border-white/60 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Top User Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topActions.map(([action, count], i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[200px]">{action}</span>
                  <Badge variant="secondary" className="text-xs">{count as number}</Badge>
                </div>
              ))}
              {stats.topActions.length === 0 && <p className="text-xs text-muted-foreground">No action data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-lg border-white/60 bg-white">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Recent Actions (Last 50)</CardTitle></CardHeader>
        <CardContent className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Screen</TableHead>
                <TableHead className="text-xs">Device</TableHead>
                <TableHead className="text-xs">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.slice(0, 50).map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{new Date(a.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</TableCell>
                  <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{a.action_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.screen || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{a.device_info || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.user_id ? a.user_id.slice(0, 8) + "…" : "Guest"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWebsiteAnalytics;
