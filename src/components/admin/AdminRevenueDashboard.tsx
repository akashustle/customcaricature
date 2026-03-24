import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { DollarSign, TrendingUp, CreditCard, Receipt, Package, Calendar, ShoppingBag, Percent, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = ["hsl(152, 55%, 48%)", "hsl(210, 62%, 48%)", "hsl(280, 55%, 55%)", "hsl(38, 88%, 50%)", "hsl(340, 55%, 55%)"];

const AdminRevenueDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [drilldown, setDrilldown] = useState<{ title: string; data: any[]; columns: { key: string; label: string }[] } | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [o, e, s] = await Promise.all([
        supabase.from("orders").select("id, amount, negotiated_amount, payment_status, status, created_at, caricature_type, customer_name, customer_email"),
        supabase.from("event_bookings").select("id, total_price, advance_amount, payment_status, status, created_at, negotiated, negotiated_total, negotiated_advance, remaining_amount, client_name, city, event_date"),
        supabase.from("shop_orders" as any).select("id, total_amount, payment_status, created_at"),
      ]);
      if (o.data) setOrders(o.data);
      if (e.data) setEvents(e.data);
      if (s.data) setShopOrders(s.data as any[]);
    };
    fetch();
    const ch = supabase.channel("revenue-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
  const orderRevenue = confirmedOrders.reduce((s, o) => s + (o.negotiated_amount || o.amount), 0);
  const paidEvents = events.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status));
  const eventRevenue = paidEvents.reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
  const paidShop = shopOrders.filter((s: any) => s.payment_status === "paid");
  const shopRevenue = paidShop.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const totalRevenue = orderRevenue + eventRevenue + shopRevenue;
  const pendingOrderRev = orders.filter(o => o.payment_status !== "confirmed").reduce((s, o) => s + o.amount, 0);
  const pendingEventRev = events.filter(e => !["confirmed", "fully_paid"].includes(e.payment_status)).reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
  const totalPending = pendingOrderRev + pendingEventRev;
  const eventAdvances = events.filter(e => ["confirmed", "fully_paid", "partial_1_paid", "partial_2_paid"].includes(e.payment_status))
    .reduce((s, e) => s + (e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount), 0);
  const eventRemaining = events.filter(e => e.remaining_amount && e.remaining_amount > 0).reduce((s, e) => s + (e.remaining_amount || 0), 0);
  const avgOrderValue = confirmedOrders.length > 0 ? Math.round(orderRevenue / confirmedOrders.length) : 0;
  const paidRatio = (confirmedOrders.length + paidEvents.length);
  const unpaidRatio = (orders.length - confirmedOrders.length) + (events.length - paidEvents.length);
  const totalTx = paidRatio + unpaidRatio;

  const getMonthlyData = () => {
    const months: Record<string, { orders: number; events: number; shop: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { orders: 0, events: 0, shop: 0 };
    }
    confirmedOrders.forEach(o => { const key = o.created_at?.substring(0, 7); if (months[key]) months[key].orders += (o.negotiated_amount || o.amount); });
    paidEvents.forEach(e => { const key = e.created_at?.substring(0, 7); if (months[key]) months[key].events += (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price); });
    paidShop.forEach((s: any) => { const key = s.created_at?.substring(0, 7); if (months[key]) months[key].shop += (s.total_amount || 0); });
    return Object.entries(months).map(([k, v]) => ({ month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }), ...v, total: v.orders + v.events + v.shop }));
  };
  const monthlyData = getMonthlyData();
  const categoryData = [{ name: "Caricatures", value: orderRevenue }, { name: "Events", value: eventRevenue }, { name: "Shop", value: shopRevenue }].filter(d => d.value > 0);
  const monthlyBookings = () => {
    const months: Record<string, { orders: number; events: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; months[key] = { orders: 0, events: 0 }; }
    orders.forEach(o => { const key = o.created_at?.substring(0, 7); if (months[key]) months[key].orders++; });
    events.forEach(e => { const key = e.created_at?.substring(0, 7); if (months[key]) months[key].events++; });
    return Object.entries(months).map(([k, v]) => ({ month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }), ...v }));
  };

  const openDrilldown = (type: string) => {
    const cols = [{ key: "name", label: "Name" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "date", label: "Date" }];
    let data: any[] = []; let title = "";
    switch (type) {
      case "total": title = "All Revenue"; data = [...confirmedOrders.map(o => ({ name: o.customer_name || o.customer_email, amount: formatPrice(o.negotiated_amount || o.amount), status: "Paid", date: new Date(o.created_at).toLocaleDateString() })), ...paidEvents.map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_total || e.total_price), status: "Paid", date: new Date(e.created_at).toLocaleDateString() }))]; break;
      case "pending": title = "Pending Revenue"; data = [...orders.filter(o => o.payment_status !== "confirmed").map(o => ({ name: o.customer_name || "Order", amount: formatPrice(o.amount), status: o.payment_status || "pending", date: new Date(o.created_at).toLocaleDateString() })), ...events.filter(e => !["confirmed", "fully_paid"].includes(e.payment_status)).map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_total || e.total_price), status: e.payment_status, date: new Date(e.created_at).toLocaleDateString() }))]; break;
      case "caricature": title = "Caricature Revenue"; data = confirmedOrders.map(o => ({ name: o.customer_name || o.customer_email, amount: formatPrice(o.negotiated_amount || o.amount), status: o.caricature_type, date: new Date(o.created_at).toLocaleDateString() })); break;
      case "event": title = "Event Revenue"; data = paidEvents.map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_total || e.total_price), status: e.city, date: e.event_date })); break;
      case "advances": title = "Advances Collected"; data = events.filter(e => ["confirmed", "fully_paid", "partial_1_paid", "partial_2_paid"].includes(e.payment_status)).map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_advance || e.advance_amount), status: e.payment_status, date: e.event_date })); break;
      case "collect": title = "To Collect"; data = events.filter(e => e.remaining_amount > 0).map(e => ({ name: e.client_name, amount: formatPrice(e.remaining_amount), status: e.payment_status, date: e.event_date })); break;
      default: return;
    }
    setDrilldown({ title, data, columns: cols });
  };

  const stats = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(totalRevenue), iconBg: "from-emerald-400 to-teal-500", drill: "total" },
    { icon: TrendingUp, label: "Pending", value: formatPrice(totalPending), iconBg: "from-amber-400 to-orange-500", drill: "pending" },
    { icon: Package, label: "Caricature Rev", value: formatPrice(orderRevenue), iconBg: "from-blue-400 to-indigo-500", drill: "caricature" },
    { icon: Calendar, label: "Event Rev", value: formatPrice(eventRevenue), iconBg: "from-indigo-400 to-violet-500", drill: "event" },
    { icon: ShoppingBag, label: "Shop Rev", value: formatPrice(shopRevenue), iconBg: "from-purple-400 to-violet-500", drill: "" },
    { icon: Receipt, label: "Avg Order", value: formatPrice(avgOrderValue), iconBg: "from-teal-400 to-cyan-500", drill: "" },
    { icon: CreditCard, label: "Advances", value: formatPrice(eventAdvances), iconBg: "from-cyan-400 to-sky-500", drill: "advances" },
    { icon: ArrowDown, label: "To Collect", value: formatPrice(eventRemaining), iconBg: "from-red-400 to-rose-500", drill: "collect" },
    { icon: Percent, label: "Paid Ratio", value: totalTx > 0 ? `${Math.round((paidRatio / totalTx) * 100)}%` : "0%", iconBg: "from-green-400 to-emerald-500", drill: "" },
  ];

  return (
    <div className="space-y-6">
      {/* 3D Animated Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 30, scale: 0.85, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
            whileHover={{ y: -10, scale: 1.06, rotateY: 5, transition: { duration: 0.25 } }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => s.drill && openDrilldown(s.drill)}
            className={`cursor-pointer group ${s.drill ? "" : "cursor-default"}`}
            style={{ perspective: "600px" }}>
            <div className="relative overflow-hidden rounded-2xl p-3.5 transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(20px)",
                boxShadow: hoveredIdx === i
                  ? "0 20px 50px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8) inset"
                  : "0 8px 25px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.6) inset"
              }}>
              <motion.div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${s.iconBg} blur-2xl`}
                animate={hoveredIdx === i ? { opacity: 0.35, scale: 1.3 } : { opacity: 0.15, scale: 1 }}
                transition={{ duration: 0.3 }} />
              
              {hoveredIdx === i && (
                <motion.div className="absolute inset-0 pointer-events-none z-10"
                  style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 55%, transparent 70%)" }}
                  initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 0.7 }} />
              )}

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <motion.div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.iconBg} flex items-center justify-center`}
                    animate={hoveredIdx === i ? { rotate: [0, -8, 8, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ boxShadow: "0 6px 20px -4px rgba(0,0,0,0.2)" }}>
                    <s.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  {s.drill && (
                    <motion.div animate={hoveredIdx === i ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                    </motion.div>
                  )}
                </div>
                <motion.p className="text-xl font-extrabold text-gray-900 leading-tight truncate tracking-tight"
                  animate={hoveredIdx === i ? { scale: 1.05 } : { scale: 1 }} transition={{ duration: 0.2 }}>
                  {s.value}
                </motion.p>
                <p className="text-[10px] text-gray-500 mt-0.5 font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts with animation */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 8px 30px -8px rgba(0,0,0,0.08)" }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-gray-800">Revenue Growth (12 Months)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="revGrad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.4}/><stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.05}/></linearGradient>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.4}/><stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.05}/></linearGradient>
                    <linearGradient id="revGrad3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.4}/><stop offset="95%" stopColor={COLORS[2]} stopOpacity={0.05}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Area type="monotone" dataKey="orders" stackId="1" stroke={COLORS[0]} fill="url(#revGrad1)" name="Caricatures" />
                  <Area type="monotone" dataKey="events" stackId="1" stroke={COLORS[1]} fill="url(#revGrad2)" name="Events" />
                  <Area type="monotone" dataKey="shop" stackId="1" stroke={COLORS[2]} fill="url(#revGrad3)" name="Shop" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 8px 30px -8px rgba(0,0,0,0.08)" }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-gray-800">Revenue by Category</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip formatter={(v: number) => formatPrice(v)} /></PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="md:col-span-2">
          <Card className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 8px 30px -8px rgba(0,0,0,0.08)" }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-gray-800">Monthly Bookings</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyBookings()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                  <Tooltip /><Bar dataKey="orders" fill={COLORS[0]} name="Orders" radius={[8, 8, 0, 0]} /><Bar dataKey="events" fill={COLORS[1]} name="Events" radius={[8, 8, 0, 0]} /><Legend />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payment Status - 3D Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 8px 30px -8px rgba(0,0,0,0.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-gray-800">Payment Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Paid Orders", value: confirmedOrders.length, bg: "from-emerald-400 to-green-500" },
                { label: "Pending Orders", value: orders.length - confirmedOrders.length, bg: "from-amber-400 to-orange-500" },
                { label: "Paid Events", value: paidEvents.length, bg: "from-blue-400 to-indigo-500" },
                { label: "Pending Events", value: events.length - paidEvents.length, bg: "from-red-400 to-rose-500" },
              ].map((s, i) => (
                <motion.div key={s.label}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  whileHover={{ y: -6, scale: 1.04 }}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${s.bg} text-white`}
                  style={{ boxShadow: "0 10px 30px -8px rgba(0,0,0,0.2)" }}>
                  <p className="text-xs font-medium opacity-90">{s.label}</p>
                  <p className="text-3xl font-black mt-1">{s.value}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Drilldown */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="font-bold">{drilldown?.title}</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader><TableRow>{drilldown?.columns.map(c => <TableHead key={c.key} className="text-xs font-bold">{c.label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {drilldown?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={drilldown.columns.length} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                ) : drilldown?.data.map((row, i) => (
                  <TableRow key={i}>{drilldown.columns.map(c => <TableCell key={c.key} className="text-xs">{row[c.key]}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRevenueDashboard;
