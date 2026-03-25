import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, DollarSign, TrendingUp, Clock, Star, Zap, ShoppingBag, MessageCircle, Globe, Activity, ArrowUp, ArrowDown, Eye, Sparkles } from "lucide-react";
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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  const widgets: { icon: any; label: string; value: string | number; gradient: string; iconBg: string; trend?: { value: string; up: boolean }; drill?: string }[] = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(stats.totalRevenue), gradient: "from-blue-500 to-blue-600", iconBg: "from-blue-500 to-blue-600", trend: stats.weekRevenue > 0 ? { value: formatPrice(stats.weekRevenue) + " /wk", up: true } : undefined, drill: "revenue" },
    { icon: TrendingUp, label: "Pending Revenue", value: formatPrice(stats.pendingRevenue), gradient: "from-sky-400 to-blue-500", iconBg: "from-sky-400 to-blue-500", drill: "revenue" },
    { icon: Package, label: "Total Orders", value: stats.totalOrders, gradient: "from-indigo-500 to-indigo-600", iconBg: "from-indigo-500 to-indigo-600", drill: "orders" },
    { icon: Zap, label: "Today's Orders", value: stats.todayOrders, gradient: "from-violet-500 to-indigo-500", iconBg: "from-violet-500 to-indigo-500", trend: stats.todayRevenue > 0 ? { value: formatPrice(stats.todayRevenue), up: true } : undefined },
    { icon: Clock, label: "Pending", value: stats.pendingOrders, gradient: "from-amber-500 to-orange-500", iconBg: "from-amber-500 to-orange-500" },
    { icon: Star, label: "Delivered", value: stats.completedOrders, gradient: "from-emerald-500 to-green-500", iconBg: "from-emerald-500 to-green-500" },
    { icon: Calendar, label: "Total Events", value: stats.totalEvents, gradient: "from-blue-600 to-indigo-600", iconBg: "from-blue-600 to-indigo-600", drill: "events" },
    { icon: Globe, label: "Upcoming", value: stats.upcomingEvents, gradient: "from-cyan-500 to-blue-500", iconBg: "from-cyan-500 to-blue-500" },
    { icon: Users, label: "Customers", value: stats.totalCustomers, gradient: "from-blue-400 to-sky-500", iconBg: "from-blue-400 to-sky-500", trend: stats.newCustomersToday > 0 ? { value: `+${stats.newCustomersToday} today`, up: true } : undefined, drill: "customers" },
    { icon: MessageCircle, label: "Enquiries", value: `${stats.pendingEnquiries}/${stats.totalEnquiries}`, gradient: "from-teal-500 to-cyan-500", iconBg: "from-teal-500 to-cyan-500", drill: "enquiries" },
    { icon: ShoppingBag, label: "Workshop", value: stats.workshopUsers, gradient: "from-purple-500 to-indigo-500", iconBg: "from-purple-500 to-indigo-500" },
    { icon: Activity, label: "Sessions", value: stats.activeSessions, gradient: "from-slate-500 to-gray-600", iconBg: "from-slate-500 to-gray-600" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {widgets.map((w, i) => (
          <motion.div key={w.label}
            initial={{ opacity: 0, y: 30, scale: 0.85, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
            whileHover={{ y: -10, scale: 1.06, rotateY: 5, transition: { duration: 0.25 } }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => w.drill && openDrill(w.drill)}
            className={`cursor-pointer group ${w.drill ? "" : "cursor-default"}`}
            style={{ perspective: "600px" }}>
            <div className="relative overflow-hidden rounded-2xl p-3.5 transition-all duration-300 bg-card dark:bg-card"
              style={{
                backdropFilter: "blur(20px)",
                boxShadow: hoveredIdx === i
                  ? "0 20px 50px -10px rgba(0,0,0,0.15), 0 0 0 1px hsl(var(--border)) inset"
                  : "0 8px 25px -8px rgba(0,0,0,0.08), 0 0 0 1px hsl(var(--border)) inset"
              }}>
              {/* Animated gradient blob */}
              <motion.div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${w.iconBg} blur-2xl`}
                animate={hoveredIdx === i ? { opacity: 0.35, scale: 1.3 } : { opacity: 0.15, scale: 1 }}
                transition={{ duration: 0.3 }} />
              
              {/* Shimmer on hover */}
              {hoveredIdx === i && (
                <motion.div className="absolute inset-0 pointer-events-none z-10"
                  style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 55%, transparent 70%)" }}
                  initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 0.7 }} />
              )}

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2.5">
                  <motion.div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${w.iconBg} flex items-center justify-center`}
                    animate={hoveredIdx === i ? { rotate: [0, -8, 8, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ boxShadow: "0 6px 20px -4px rgba(0,0,0,0.2)" }}>
                    <w.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  {w.trend && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 + 0.3, type: "spring" }}
                      className={`flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${w.trend.up ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {w.trend.up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                      {w.trend.value}
                    </motion.div>
                  )}
                  {w.drill && !w.trend && (
                    <motion.div animate={hoveredIdx === i ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }}>
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                    </motion.div>
                  )}
                </div>
                <motion.p className="text-xl font-extrabold text-foreground leading-tight tracking-tight"
                  animate={hoveredIdx === i ? { scale: 1.05 } : { scale: 1 }} transition={{ duration: 0.2 }}>
                  {w.value}
                </motion.p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">{w.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Drilldown */}
      <Dialog open={!!drillData} onOpenChange={() => setDrillData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="font-bold">{drillData?.title}</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader><TableRow>{drillData?.rows[0] && Object.keys(drillData.rows[0]).map(k => <TableHead key={k} className="text-xs font-bold">{k}</TableHead>)}</TableRow></TableHeader>
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
