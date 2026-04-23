import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, DollarSign, TrendingUp, Clock, Star, Zap, ShoppingBag, MessageCircle, Globe, Activity, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

// Widget tone: which widgets get the lime-active "highlight" treatment vs danger tint
const ACTIVE_WIDGETS = new Set(["Total Revenue", "Today's Orders"]);
const DANGER_WIDGETS = new Set(["Pending", "Pending Revenue"]);

// Helper to detect if a numeric value should display as positive (green) or negative (red)
const figureToneFor = (label: string, raw: any): "positive" | "negative" | "neutral" => {
  if (typeof raw === "number" && raw < 0) return "negative";
  if (typeof raw === "string" && raw.trim().startsWith("-")) return "negative";
  // Money / count widgets — show in green when > 0
  const moneyOrCount = ["Total Revenue", "Today's Orders", "Total Orders", "Customers", "Total Events", "Upcoming", "Delivered", "Workshop", "Sessions"];
  if (moneyOrCount.includes(label)) {
    if (typeof raw === "number" && raw > 0) return "positive";
    if (typeof raw === "string" && /[1-9]/.test(raw)) return "positive";
  }
  if (label === "Pending Revenue" || label === "Pending") {
    if ((typeof raw === "number" && raw > 0) || (typeof raw === "string" && /[1-9]/.test(raw))) return "negative";
  }
  return "neutral";
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

  const widgets: { icon: any; label: string; value: string | number; raw: number; trend?: { value: string; up: boolean }; drill?: string }[] = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(stats.totalRevenue), raw: stats.totalRevenue, trend: stats.weekRevenue > 0 ? { value: formatPrice(stats.weekRevenue) + " /wk", up: true } : undefined, drill: "revenue" },
    { icon: TrendingUp, label: "Pending Revenue", value: formatPrice(stats.pendingRevenue), raw: stats.pendingRevenue, drill: "revenue" },
    { icon: Package, label: "Total Orders", value: stats.totalOrders, raw: stats.totalOrders, drill: "orders" },
    { icon: Zap, label: "Today's Orders", value: stats.todayOrders, raw: stats.todayOrders, trend: stats.todayRevenue > 0 ? { value: formatPrice(stats.todayRevenue), up: true } : undefined },
    { icon: Clock, label: "Pending", value: stats.pendingOrders, raw: stats.pendingOrders },
    { icon: Star, label: "Delivered", value: stats.completedOrders, raw: stats.completedOrders },
    { icon: Calendar, label: "Total Events", value: stats.totalEvents, raw: stats.totalEvents, drill: "events" },
    { icon: Globe, label: "Upcoming", value: stats.upcomingEvents, raw: stats.upcomingEvents },
    { icon: Users, label: "Customers", value: stats.totalCustomers, raw: stats.totalCustomers, trend: stats.newCustomersToday > 0 ? { value: `+${stats.newCustomersToday} today`, up: true } : undefined, drill: "customers" },
    { icon: MessageCircle, label: "Enquiries", value: `${stats.pendingEnquiries}/${stats.totalEnquiries}`, raw: stats.totalEnquiries, drill: "enquiries" },
    { icon: ShoppingBag, label: "Workshop", value: stats.workshopUsers, raw: stats.workshopUsers },
    { icon: Activity, label: "Sessions", value: stats.activeSessions, raw: stats.activeSessions },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {widgets.map((w, i) => {
          const isActive = ACTIVE_WIDGETS.has(w.label) && w.raw > 0;
          const isDanger = DANGER_WIDGETS.has(w.label) && w.raw > 0;
          const tone = figureToneFor(w.label, w.raw);
          const figureClass =
            tone === "positive" ? "vault-figure-positive"
            : tone === "negative" ? "vault-figure-negative"
            : "vault-figure-neutral";
          const cardClass = isActive ? "vault-widget vault-widget-active" : isDanger ? "vault-widget vault-widget-danger" : "vault-widget";
          // Icon tints adapt to card variant
          const iconColor = isActive ? "hsl(0 0% 8%)" : isDanger ? "hsl(0 75% 50%)" : "hsl(0 0% 25%)";

          return (
            <motion.div
              key={w.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3, ease: "easeOut" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => w.drill && openDrill(w.drill)}
              className={w.drill ? "cursor-pointer" : "cursor-default"}
            >
              <div className={`${cardClass} relative overflow-hidden p-4 h-full`}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <w.icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={1.8} />
                    {w.drill && (
                      <Eye className="w-3 h-3 opacity-40" style={{ color: iconColor }} />
                    )}
                  </div>
                  <div>
                    <p className={`text-2xl font-bold tracking-tight admin-panel-font ${isActive ? "vault-figure-neutral" : figureClass}`}>
                      {w.value}
                    </p>
                    <p className="text-[10px] mt-1 font-bold uppercase tracking-[0.12em]" style={{ color: isActive ? "hsl(0 0% 18%)" : isDanger ? "hsl(0 60% 40%)" : "hsl(0 0% 50%)" }}>
                      {w.label}
                    </p>
                    {w.trend && (
                      <div className="flex items-center gap-0.5 mt-1.5 text-[9px] font-semibold">
                        {w.trend.up ? <ArrowUp className="w-2.5 h-2.5 vault-figure-positive" /> : <ArrowDown className="w-2.5 h-2.5 vault-figure-negative" />}
                        <span className={w.trend.up ? "vault-figure-positive" : "vault-figure-negative"}>{w.trend.value}</span>
                      </div>
                    )}
                  </div>
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
