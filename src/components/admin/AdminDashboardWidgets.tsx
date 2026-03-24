import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, DollarSign, TrendingUp, Clock, Star, Zap, ShoppingBag, MessageCircle, Globe, Activity, ArrowUp, ArrowDown, Eye, X } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminDashboardWidgets = () => {
  const [stats, setStats] = useState({
    totalOrders: 0, pendingOrders: 0, completedOrders: 0,
    totalEvents: 0, upcomingEvents: 0,
    totalCustomers: 0, newCustomersToday: 0,
    totalRevenue: 0, pendingRevenue: 0,
    totalEnquiries: 0, pendingEnquiries: 0,
    workshopUsers: 0, activeSessions: 0,
    todayOrders: 0, todayRevenue: 0, weekRevenue: 0,
  });
  const [drillData, setDrillData] = useState<{ title: string; rows: any[] } | null>(null);
  const [rawData, setRawData] = useState<{ orders: any[]; events: any[]; customers: any[]; enquiries: any[] }>({ orders: [], events: [], customers: [], enquiries: [] });

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const [orders, events, customers, enquiries, workshopUsers, sessions] = await Promise.all([
      supabase.from("orders").select("id, status, payment_status, amount, created_at, customer_name, customer_email, caricature_type"),
      supabase.from("event_bookings").select("id, status, payment_status, total_price, event_date, client_name, city"),
      supabase.from("profiles").select("user_id, full_name, email, created_at, city"),
      supabase.from("enquiries").select("id, status, name, mobile, created_at, enquiry_type"),
      supabase.from("workshop_users" as any).select("id"),
      supabase.from("admin_sessions").select("id").eq("is_active", true),
    ]);
    const od = orders.data || []; const ed = events.data || [];
    const cd = customers.data || []; const eq = (enquiries.data || []) as any[];
    setRawData({ orders: od, events: ed, customers: cd, enquiries: eq });
    const co = od.filter((o: any) => o.payment_status === "confirmed");
    const ce = ed.filter((e: any) => ["confirmed", "fully_paid"].includes(e.payment_status));
    const oRev = co.reduce((s: number, o: any) => s + o.amount, 0);
    const eRev = ce.reduce((s: number, e: any) => s + (e as any).total_price, 0);
    const pOR = od.filter((o: any) => o.payment_status !== "confirmed").reduce((s: number, o: any) => s + o.amount, 0);
    const pER = ed.filter((e: any) => !["confirmed", "fully_paid"].includes(e.payment_status)).reduce((s: number, e: any) => s + (e as any).total_price, 0);
    const tc = co.filter((o: any) => o.created_at?.startsWith(today));
    setStats({
      totalOrders: od.length, pendingOrders: od.filter((o: any) => o.status === "new" || o.status === "in_progress").length,
      completedOrders: od.filter((o: any) => o.status === "delivered").length,
      totalEvents: ed.length, upcomingEvents: ed.filter((e: any) => e.event_date >= today && e.status !== "cancelled").length,
      totalCustomers: cd.length, newCustomersToday: cd.filter((c: any) => c.created_at?.startsWith(today)).length,
      totalRevenue: oRev + eRev, pendingRevenue: pOR + pER,
      totalEnquiries: eq.length, pendingEnquiries: eq.filter((e: any) => e.status === "new").length,
      workshopUsers: ((workshopUsers.data || []) as any[]).length,
      activeSessions: (sessions.data || []).length,
      todayOrders: od.filter((o: any) => o.created_at?.startsWith(today)).length,
      todayRevenue: tc.reduce((s: number, o: any) => s + o.amount, 0),
      weekRevenue: co.filter((o: any) => new Date(o.created_at) >= weekAgo).reduce((s: number, o: any) => s + o.amount, 0),
    });
  };

  useEffect(() => {
    fetchStats();
    const ch = supabase.channel("admin-widgets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openDrill = (type: string) => {
    let title = ""; let rows: any[] = [];
    switch (type) {
      case "revenue": title = "Revenue Breakdown"; rows = rawData.orders.filter(o => o.payment_status === "confirmed").map(o => ({ Name: o.customer_name || o.customer_email, Amount: `₹${o.amount}`, Type: o.caricature_type, Date: new Date(o.created_at).toLocaleDateString() })); break;
      case "orders": title = "All Orders"; rows = rawData.orders.map(o => ({ Name: o.customer_name || "—", Amount: `₹${o.amount}`, Status: o.status, Payment: o.payment_status })); break;
      case "events": title = "All Events"; rows = rawData.events.map(e => ({ Client: e.client_name, City: e.city, Date: e.event_date, Status: e.status, Price: `₹${e.total_price}` })); break;
      case "customers": title = "All Customers"; rows = rawData.customers.map(c => ({ Name: c.full_name || "—", Email: c.email || "—", City: c.city || "—", Joined: new Date(c.created_at).toLocaleDateString() })); break;
      case "enquiries": title = "All Enquiries"; rows = rawData.enquiries.map(e => ({ Name: e.name, Mobile: e.mobile, Type: e.enquiry_type, Status: e.status })); break;
      default: return;
    }
    setDrillData({ title, rows });
  };

  const widgets: { icon: any; label: string; value: string | number; color: string; bg: string; glow: string; trend?: { value: string; up: boolean }; drill?: string }[] = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(stats.totalRevenue), color: "text-emerald-600", bg: "from-emerald-400 to-teal-500", glow: "shadow-emerald-200/60", trend: stats.weekRevenue > 0 ? { value: formatPrice(stats.weekRevenue) + " /wk", up: true } : undefined, drill: "revenue" },
    { icon: TrendingUp, label: "Pending Revenue", value: formatPrice(stats.pendingRevenue), color: "text-amber-600", bg: "from-amber-400 to-orange-500", glow: "shadow-amber-200/60", drill: "revenue" },
    { icon: Package, label: "Total Orders", value: stats.totalOrders, color: "text-blue-600", bg: "from-blue-400 to-indigo-500", glow: "shadow-blue-200/60", drill: "orders" },
    { icon: Zap, label: "Today's Orders", value: stats.todayOrders, color: "text-violet-600", bg: "from-violet-400 to-purple-500", glow: "shadow-violet-200/60", trend: stats.todayRevenue > 0 ? { value: formatPrice(stats.todayRevenue), up: true } : undefined },
    { icon: Clock, label: "Pending", value: stats.pendingOrders, color: "text-orange-600", bg: "from-orange-400 to-red-500", glow: "shadow-orange-200/60" },
    { icon: Star, label: "Delivered", value: stats.completedOrders, color: "text-green-600", bg: "from-green-400 to-emerald-500", glow: "shadow-green-200/60" },
    { icon: Calendar, label: "Total Events", value: stats.totalEvents, color: "text-indigo-600", bg: "from-indigo-400 to-blue-500", glow: "shadow-indigo-200/60", drill: "events" },
    { icon: Globe, label: "Upcoming", value: stats.upcomingEvents, color: "text-cyan-600", bg: "from-cyan-400 to-teal-500", glow: "shadow-cyan-200/60" },
    { icon: Users, label: "Customers", value: stats.totalCustomers, color: "text-pink-600", bg: "from-pink-400 to-rose-500", glow: "shadow-pink-200/60", trend: stats.newCustomersToday > 0 ? { value: `+${stats.newCustomersToday} today`, up: true } : undefined, drill: "customers" },
    { icon: MessageCircle, label: "Enquiries", value: `${stats.pendingEnquiries}/${stats.totalEnquiries}`, color: "text-teal-600", bg: "from-teal-400 to-cyan-500", glow: "shadow-teal-200/60", drill: "enquiries" },
    { icon: ShoppingBag, label: "Workshop", value: stats.workshopUsers, color: "text-purple-600", bg: "from-purple-400 to-violet-500", glow: "shadow-purple-200/60" },
    { icon: Activity, label: "Sessions", value: stats.activeSessions, color: "text-rose-600", bg: "from-rose-400 to-red-500", glow: "shadow-rose-200/60" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {widgets.map((w, i) => (
          <motion.div key={w.label} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.4, type: "spring", stiffness: 260, damping: 22 }}
            whileHover={{ y: -8, scale: 1.05, transition: { duration: 0.2 } }}
            onClick={() => w.drill && openDrill(w.drill)}
            className={`cursor-pointer group ${w.drill ? "" : "cursor-default"}`}>
            <div className={`relative overflow-hidden rounded-2xl bg-white border border-white/60 p-3.5 shadow-lg ${w.glow} hover:shadow-xl transition-all duration-300`}
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))", backdropFilter: "blur(20px)" }}>
              {/* Decorative gradient blob */}
              <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${w.bg} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${w.bg} flex items-center justify-center shadow-lg`}>
                    <w.icon className="w-5 h-5 text-white" />
                  </div>
                  {w.trend && (
                    <div className={`flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${w.trend.up ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {w.trend.up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                      {w.trend.value}
                    </div>
                  )}
                  {w.drill && !w.trend && <Eye className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
                <p className="text-xl font-extrabold text-foreground leading-tight tracking-tight">{w.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">{w.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Drilldown */}
      <Dialog open={!!drillData} onOpenChange={() => setDrillData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>{drillData?.title}</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader><TableRow>{drillData?.rows[0] && Object.keys(drillData.rows[0]).map(k => <TableHead key={k} className="text-xs">{k}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {(drillData?.rows || []).slice(0, 100).map((row, i) => (
                  <TableRow key={i}>{Object.values(row).map((v: any, j) => <TableCell key={j} className="text-xs">{String(v ?? "—")}</TableCell>)}</TableRow>
                ))}
                {(drillData?.rows || []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDashboardWidgets;
