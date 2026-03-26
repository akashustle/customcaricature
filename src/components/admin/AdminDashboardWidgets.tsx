import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, DollarSign, TrendingUp, Clock, Star, Zap, ShoppingBag, MessageCircle, Globe, Activity, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const ICON_TINTS: Record<string, string> = {
  "Total Revenue": "hsl(210 55% 50%)",
  "Pending Revenue": "hsl(210 45% 60%)",
  "Total Orders": "hsl(250 50% 55%)",
  "Today's Orders": "hsl(270 45% 55%)",
  "Pending": "hsl(38 75% 52%)",
  "Delivered": "hsl(152 45% 42%)",
  "Total Events": "hsl(220 55% 52%)",
  "Upcoming": "hsl(195 60% 48%)",
  "Customers": "hsl(200 50% 52%)",
  "Enquiries": "hsl(175 50% 42%)",
  "Workshop": "hsl(280 40% 55%)",
  "Sessions": "hsl(220 10% 45%)",
};

const ICON_BG_TINTS: Record<string, string> = {
  "Total Revenue": "hsl(210 55% 96%)",
  "Pending Revenue": "hsl(210 45% 96%)",
  "Total Orders": "hsl(250 50% 96%)",
  "Today's Orders": "hsl(270 45% 96%)",
  "Pending": "hsl(38 75% 96%)",
  "Delivered": "hsl(152 45% 95%)",
  "Total Events": "hsl(220 55% 96%)",
  "Upcoming": "hsl(195 60% 96%)",
  "Customers": "hsl(200 50% 96%)",
  "Enquiries": "hsl(175 50% 95%)",
  "Workshop": "hsl(280 40% 96%)",
  "Sessions": "hsl(220 10% 95%)",
};

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

  const widgets: { icon: any; label: string; value: string | number; trend?: { value: string; up: boolean }; drill?: string }[] = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(stats.totalRevenue), trend: stats.weekRevenue > 0 ? { value: formatPrice(stats.weekRevenue) + " /wk", up: true } : undefined, drill: "revenue" },
    { icon: TrendingUp, label: "Pending Revenue", value: formatPrice(stats.pendingRevenue), drill: "revenue" },
    { icon: Package, label: "Total Orders", value: stats.totalOrders, drill: "orders" },
    { icon: Zap, label: "Today's Orders", value: stats.todayOrders, trend: stats.todayRevenue > 0 ? { value: formatPrice(stats.todayRevenue), up: true } : undefined },
    { icon: Clock, label: "Pending", value: stats.pendingOrders },
    { icon: Star, label: "Delivered", value: stats.completedOrders },
    { icon: Calendar, label: "Total Events", value: stats.totalEvents, drill: "events" },
    { icon: Globe, label: "Upcoming", value: stats.upcomingEvents },
    { icon: Users, label: "Customers", value: stats.totalCustomers, trend: stats.newCustomersToday > 0 ? { value: `+${stats.newCustomersToday} today`, up: true } : undefined, drill: "customers" },
    { icon: MessageCircle, label: "Enquiries", value: `${stats.pendingEnquiries}/${stats.totalEnquiries}`, drill: "enquiries" },
    { icon: ShoppingBag, label: "Workshop", value: stats.workshopUsers },
    { icon: Activity, label: "Sessions", value: stats.activeSessions },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {widgets.map((w, i) => {
          const tint = ICON_TINTS[w.label] || "hsl(var(--primary))";
          const tintBg = ICON_BG_TINTS[w.label] || "hsl(var(--secondary))";
          return (
            <motion.div key={w.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => w.drill && openDrill(w.drill)}
              className={`${w.drill ? "cursor-pointer" : "cursor-default"}`}>
              <div
                className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300"
                style={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(0 0% 93%)",
                  boxShadow: hoveredIdx === i
                    ? "0 12px 40px -10px hsla(0,0%,0%,0.1), 0 0 0 1px hsla(0,0%,0%,0.03)"
                    : "0 2px 8px -2px hsla(0,0%,0%,0.06), 0 0 0 1px hsla(0,0%,0%,0.02), inset 0 1px 0 hsla(0,0%,100%,0.8)",
                }}
              >
                {/* Subtle glow on hover */}
                {hoveredIdx === i && (
                  <motion.div
                    className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
                    style={{ background: tintBg, filter: "blur(20px)", opacity: 0.6 }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 0.6 }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <motion.div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: tintBg }}
                      animate={hoveredIdx === i ? { scale: 1.08 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <w.icon className="w-[18px] h-[18px]" style={{ color: tint }} strokeWidth={1.8} />
                    </motion.div>
                    {w.trend && (
                      <div className={`flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full ${w.trend.up ? 'text-emerald-600' : 'text-amber-600'}`}
                        style={{ background: w.trend.up ? 'hsl(152 45% 95%)' : 'hsl(38 75% 95%)' }}>
                        {w.trend.up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {w.trend.value}
                      </div>
                    )}
                    {w.drill && !w.trend && (
                      <motion.div
                        animate={hoveredIdx === i ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Eye className="w-3.5 h-3.5" style={{ color: "hsl(0 0% 72%)" }} />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xl font-bold tracking-tight admin-panel-font" style={{ color: "hsl(0 0% 12%)" }}>
                    {w.value}
                  </p>
                  <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: "hsl(0 0% 55%)" }}>
                    {w.label}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Drilldown */}
      <Dialog open={!!drillData} onOpenChange={() => setDrillData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="font-bold admin-panel-font">{drillData?.title}</DialogTitle></DialogHeader>
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
