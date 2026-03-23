import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import AdminDrillDownDialog from "./AdminDrillDownDialog";
import { motion } from "framer-motion";
import {
  DollarSign, Package, Calendar, Users, TrendingUp, TrendingDown,
  Clock, Zap, ArrowUpRight, Activity, Target, ShoppingBag,
  Eye, BarChart3, PieChart as PieIcon, Percent, Globe, Star,
  MessageCircle, CreditCard, Truck, CheckCircle, AlertTriangle,
  ArrowUp, ArrowDown, Wallet, Receipt, UserPlus, MapPin,
  Bell, ShieldCheck, FileText, Bot, Radio, Monitor, Layers
} from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  Legend, ComposedChart
} from "recharts";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#FBBF24", "#F87171", "#818CF8"];
const CHART_HEX = ["#6366F1", "#22D3EE", "#A78BFA", "#F472B6", "#34D399", "#FBBF24", "#F87171", "#818CF8"];

const AdminDashboardPremium = ({ onNavigate }: DashboardProps) => {
  const [stats, setStats] = useState({
    totalRevenue: 0, orderRevenue: 0, eventRevenue: 0, shopRevenue: 0,
    totalOrders: 0, pendingOrders: 0, completedOrders: 0, todayOrders: 0,
    inProgressOrders: 0, artworkReadyOrders: 0, dispatchedOrders: 0,
    totalEvents: 0, upcomingEvents: 0, completedEvents: 0, cancelledEvents: 0,
    totalCustomers: 0, newCustomersWeek: 0, newCustomersMonth: 0, newCustomersToday: 0,
    totalEnquiries: 0, convertedEnquiries: 0, pendingEnquiries: 0,
    pendingRevenue: 0, workshopUsers: 0, activeSessions: 0,
    prevMonthRevenue: 0, prevMonthOrders: 0,
    avgOrderValue: 0, avgEventValue: 0,
    confirmedPayments: 0, pendingPayments: 0,
    totalArtists: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [upcomingEventsList, setUpcomingEventsList] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ metric: string; title: string } | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const ch = supabase.channel("dashboard-premium-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchDashboardData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const [orders, events, customers, enquiries, shopOrders, wsUsers, sessions, artists] = await Promise.all([
      supabase.from("orders").select("id, status, payment_status, amount, negotiated_amount, created_at, customer_name, city"),
      supabase.from("event_bookings").select("id, status, payment_status, total_price, advance_amount, event_date, created_at, client_name, city, negotiated, negotiated_total, event_type"),
      supabase.from("profiles").select("id, created_at"),
      supabase.from("enquiries").select("id, status, created_at, city"),
      supabase.from("shop_orders" as any).select("id, total_amount, payment_status, created_at"),
      supabase.from("workshop_users" as any).select("id"),
      supabase.from("admin_sessions").select("id").eq("is_active", true),
      supabase.from("artists").select("id"),
    ]);

    const o = orders.data || [];
    const e = events.data || [];
    const c = customers.data || [];
    const enq = (enquiries.data || []) as any[];
    const so = (shopOrders.data || []) as any[];

    const confirmedOrders = o.filter((x: any) => x.payment_status === "confirmed");
    const orderRev = confirmedOrders.reduce((s: number, x: any) => s + (x.negotiated_amount || x.amount), 0);
    const confirmedEvents = e.filter((x: any) => ["confirmed", "fully_paid"].includes(x.payment_status));
    const eventRev = confirmedEvents.reduce((s: number, x: any) => s + (x.negotiated && x.negotiated_total ? x.negotiated_total : x.total_price), 0);
    const paidShop = so.filter((x: any) => x.payment_status === "paid");
    const shopRev = paidShop.reduce((s: number, x: any) => s + (x.total_amount || 0), 0);

    const pendingOrderRev = o.filter((x: any) => x.payment_status !== "confirmed").reduce((s: number, x: any) => s + (x.negotiated_amount || x.amount), 0);
    const pendingEventRev = e.filter((x: any) => !["confirmed", "fully_paid"].includes(x.payment_status)).reduce((s: number, x: any) => s + (x.negotiated && x.negotiated_total ? x.negotiated_total : x.total_price), 0);

    const prevOrders = confirmedOrders.filter((x: any) => {
      const d = new Date(x.created_at); return d >= twoMonthsAgo && d < monthAgo;
    });
    const prevMonthRev = prevOrders.reduce((s: number, x: any) => s + (x.negotiated_amount || x.amount), 0);

    const months: Record<string, { orders: number; events: number; shop: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = { orders: 0, events: 0, shop: 0 };
    }
    confirmedOrders.forEach((x: any) => { const k = x.created_at?.substring(0, 7); if (months[k]) months[k].orders += (x.negotiated_amount || x.amount); });
    confirmedEvents.forEach((x: any) => { const k = x.created_at?.substring(0, 7); if (months[k]) months[k].events += (x.negotiated && x.negotiated_total ? x.negotiated_total : x.total_price); });
    paidShop.forEach((x: any) => { const k = x.created_at?.substring(0, 7); if (months[k]) months[k].shop += (x.total_amount || 0); });

    setMonthlyData(Object.entries(months).map(([k, v]) => ({
      month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }),
      orders: v.orders, events: v.events, shop: v.shop, total: v.orders + v.events + v.shop
    })));

    const wData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      wData.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), orders: o.filter((x: any) => x.created_at?.startsWith(ds)).length, events: e.filter((x: any) => x.created_at?.startsWith(ds)).length });
    }
    setWeeklyData(wData);

    const hData: any[] = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: 0 }));
    o.forEach((x: any) => { hData[new Date(x.created_at).getHours()].orders++; });
    setHourlyData(hData.filter((_, i) => i >= 6 && i <= 23));

    const cityMap: Record<string, number> = {};
    o.forEach((x: any) => { if (x.city) cityMap[x.city] = (cityMap[x.city] || 0) + 1; });
    e.forEach((x: any) => { if (x.city) cityMap[x.city] = (cityMap[x.city] || 0) + 1; });
    setCityData(Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value], i) => ({
      name, value, fill: CHART_HEX[i % CHART_HEX.length]
    })));

    const statusMap: Record<string, number> = {};
    o.forEach((x: any) => { statusMap[x.status] = (statusMap[x.status] || 0) + 1; });
    setOrderStatusData(Object.entries(statusMap).map(([name, value], i) => ({
      name: name.replace("_", " "), value, fill: CHART_HEX[i % CHART_HEX.length]
    })));

    setRecentOrders(o.slice(0, 8).map((x: any) => ({
      id: x.id, name: x.customer_name, amount: x.negotiated_amount || x.amount,
      status: x.status, date: x.created_at, city: x.city
    })));

    setUpcomingEventsList(
      e.filter((x: any) => x.event_date >= todayStr && x.status !== "cancelled")
        .sort((a: any, b: any) => a.event_date.localeCompare(b.event_date))
        .slice(0, 6)
        .map((x: any) => ({ id: x.id, name: x.client_name, city: x.city, date: x.event_date, type: x.event_type }))
    );

    const totalRev = orderRev + eventRev + shopRev;
    setStats({
      totalRevenue: totalRev, orderRevenue: orderRev, eventRevenue: eventRev, shopRevenue: shopRev,
      totalOrders: o.length, pendingOrders: o.filter((x: any) => x.status === "new").length,
      inProgressOrders: o.filter((x: any) => x.status === "in_progress").length,
      artworkReadyOrders: o.filter((x: any) => x.status === "artwork_ready").length,
      dispatchedOrders: o.filter((x: any) => x.status === "dispatched").length,
      completedOrders: o.filter((x: any) => x.status === "delivered").length,
      todayOrders: o.filter((x: any) => x.created_at?.startsWith(todayStr)).length,
      totalEvents: e.length, upcomingEvents: e.filter((x: any) => x.event_date >= todayStr && x.status !== "cancelled").length,
      completedEvents: e.filter((x: any) => x.status === "completed").length,
      cancelledEvents: e.filter((x: any) => x.status === "cancelled").length,
      totalCustomers: c.length, newCustomersWeek: c.filter((x: any) => new Date(x.created_at) >= weekAgo).length,
      newCustomersMonth: c.filter((x: any) => new Date(x.created_at) >= monthAgo).length,
      newCustomersToday: c.filter((x: any) => x.created_at?.startsWith(todayStr)).length,
      totalEnquiries: enq.length, convertedEnquiries: enq.filter((x: any) => x.status === "converted").length,
      pendingEnquiries: enq.filter((x: any) => x.status === "new").length,
      pendingRevenue: pendingOrderRev + pendingEventRev,
      workshopUsers: (wsUsers.data || []).length, activeSessions: (sessions.data || []).length,
      prevMonthRevenue: prevMonthRev, prevMonthOrders: prevOrders.length,
      avgOrderValue: confirmedOrders.length > 0 ? Math.round(orderRev / confirmedOrders.length) : 0,
      avgEventValue: confirmedEvents.length > 0 ? Math.round(eventRev / confirmedEvents.length) : 0,
      confirmedPayments: confirmedOrders.length + confirmedEvents.length,
      pendingPayments: o.filter((x: any) => x.payment_status !== "confirmed").length + e.filter((x: any) => !["confirmed", "fully_paid"].includes(x.payment_status)).length,
      totalArtists: (artists.data || []).length,
    });
    setLoading(false);
  };

  const getGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const revenueSplit = useMemo(() => [
    { name: "Caricatures", value: stats.orderRevenue, fill: "#6366F1" },
    { name: "Events", value: stats.eventRevenue, fill: "#22D3EE" },
    { name: "Shop", value: stats.shopRevenue, fill: "#A78BFA" },
  ].filter(d => d.value > 0), [stats]);

  const conversionRate = stats.totalEnquiries > 0 ? Math.round((stats.convertedEnquiries / stats.totalEnquiries) * 100) : 0;
  const revenueGrowth = getGrowth(stats.totalRevenue, stats.prevMonthRevenue);
  const fulfillmentRate = stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[130px] rounded-2xl bg-muted animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-sans">Welcome Back 👋</h1>
          <p className="text-sm text-muted-foreground font-sans">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-sans">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mr-1.5 animate-pulse" />
            Live
          </Badge>
          <span className="text-xs text-muted-foreground font-sans">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </motion.div>

      {/* ROW 1: Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={formatPrice(stats.totalRevenue)} change={revenueGrowth}
          icon={<DollarSign className="w-5 h-5" />} gradient="from-indigo-600 to-blue-500"
          onClick={() => setDrillDown({ metric: "revenue", title: "Total Revenue" })}
          sparkData={monthlyData.map(d => d.total)} sparkColor="#818CF8" />
        <KPICard title="Total Orders" value={stats.totalOrders.toString()} sub={`${stats.todayOrders} today`}
          icon={<Package className="w-5 h-5" />} gradient="from-cyan-500 to-teal-400"
          onClick={() => setDrillDown({ metric: "orders", title: "Orders" })}
          sparkData={weeklyData.map(d => d.orders)} sparkColor="#22D3EE" />
        <KPICard title="Total Events" value={stats.totalEvents.toString()} sub={`${stats.upcomingEvents} upcoming`}
          icon={<Calendar className="w-5 h-5" />} gradient="from-violet-600 to-purple-500"
          onClick={() => setDrillDown({ metric: "events", title: "Events" })}
          sparkData={weeklyData.map(d => d.events)} sparkColor="#A78BFA" />
        <KPICard title="Pending Revenue" value={formatPrice(stats.pendingRevenue)} sub={`${stats.pendingPayments} pending`}
          icon={<Clock className="w-5 h-5" />} gradient="from-amber-500 to-orange-400"
          onClick={() => setDrillDown({ metric: "pending", title: "Pending Revenue" })} sparkColor="#FBBF24" />
      </div>

      {/* ROW 2: Transaction Activity + Sales Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AdminCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground font-sans">Transaction Activity</h3>
                <p className="text-xs text-muted-foreground font-sans">Revenue over last 6 months</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-7 font-sans" onClick={() => onNavigate("analytics")}>
                Details <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="orders" stroke="#6366F1" fill="url(#indigoGrad)" strokeWidth={2} name="Orders" dot={false} />
                <Area type="monotone" dataKey="events" stroke="#22D3EE" fill="url(#cyanGrad)" strokeWidth={2} name="Events" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </AdminCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <AdminCard className="h-full">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-sans">Sales Performance</h3>
            <div className="space-y-4">
              <SalesMetric label="Order Revenue" value={formatPrice(stats.orderRevenue)} total={stats.totalRevenue} color="#6366F1" />
              <SalesMetric label="Event Revenue" value={formatPrice(stats.eventRevenue)} total={stats.totalRevenue} color="#22D3EE" />
              <SalesMetric label="Shop Revenue" value={formatPrice(stats.shopRevenue)} total={stats.totalRevenue} color="#A78BFA" />
              <div className="border-t border-border pt-3 mt-3 space-y-2">
                {[
                  { l: "Avg Order Value", v: formatPrice(stats.avgOrderValue) },
                  { l: "Avg Event Value", v: formatPrice(stats.avgEventValue) },
                  { l: "Conversion Rate", v: `${conversionRate}%` },
                ].map(item => (
                  <div key={item.l} className="flex justify-between text-xs font-sans">
                    <span className="text-muted-foreground">{item.l}</span>
                    <span className="font-semibold text-foreground">{item.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </AdminCard>
        </motion.div>
      </div>

      {/* ROW 3: Secondary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { icon: Users, label: "Customers", value: stats.totalCustomers, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", click: () => setDrillDown({ metric: "customers", title: "Customers" }) },
          { icon: UserPlus, label: "New This Week", value: stats.newCustomersWeek, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
          { icon: Target, label: "Conversion", value: `${conversionRate}%`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", click: () => setDrillDown({ metric: "enquiries", title: "Enquiry Conversion" }) },
          { icon: CheckCircle, label: "Fulfilled", value: `${fulfillmentRate}%`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: AlertTriangle, label: "Pending", value: stats.pendingOrders, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
          { icon: Star, label: "Completed", value: stats.completedOrders, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
          { icon: Activity, label: "Sessions", value: stats.activeSessions, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10" },
          { icon: Globe, label: "Artists", value: stats.totalArtists, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
        ].map((item) => (
          <motion.div key={item.label} whileHover={{ y: -2, scale: 1.02 }} className="cursor-pointer" onClick={item.click}>
            <AdminCard className="text-center !p-3">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mx-auto mb-1.5`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <p className="text-base font-bold text-foreground leading-none font-sans">{item.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 font-sans">{item.label}</p>
            </AdminCard>
          </motion.div>
        ))}
      </div>

      {/* ROW 4: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AdminCard>
            <h3 className="text-sm font-semibold text-foreground mb-3 font-sans">Orders by Hour</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </AdminCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <AdminCard>
            <h3 className="text-sm font-semibold text-foreground mb-3 font-sans">Revenue Breakdown</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={revenueSplit} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                  {revenueSplit.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} formatter={(v: number) => [formatPrice(v), ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-1">
              {revenueSplit.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{formatPrice(item.value)}</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <AdminCard>
            <h3 className="text-sm font-semibold text-foreground mb-3 font-sans">Order Status</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" outerRadius={55} dataKey="value" paddingAngle={2}>
                  {orderStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {orderStatusData.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                    <span className="text-muted-foreground capitalize">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </motion.div>
      </div>

      {/* ROW 5: Weekly Trend + City */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <AdminCard>
            <h3 className="text-sm font-semibold text-foreground mb-3 font-sans">Weekly Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={20} name="Orders" />
                <Line type="monotone" dataKey="events" stroke="#22D3EE" strokeWidth={2} dot={{ fill: "#22D3EE", r: 3 }} name="Events" />
              </ComposedChart>
            </ResponsiveContainer>
          </AdminCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <AdminCard>
            <h3 className="text-sm font-semibold text-foreground mb-3 font-sans">Top Cities</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                  {cityData.map((entry, i) => <Cell key={i} fill={CHART_HEX[i % CHART_HEX.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AdminCard>
        </motion.div>
      </div>

      {/* ROW 6: Recent Orders + Upcoming Events + Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <AdminCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground font-sans">Recent Orders</h3>
              <Button variant="ghost" size="sm" className="text-xs h-6 text-primary hover:text-primary/80 font-sans" onClick={() => onNavigate("orders")}>View All</Button>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate font-sans">{order.name}</p>
                    <p className="text-[10px] text-muted-foreground font-sans">{order.city} • {new Date(order.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs font-semibold text-foreground font-sans">{formatPrice(order.amount)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 font-sans">No orders yet</p>}
            </div>
          </AdminCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <AdminCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground font-sans">Schedule</h3>
              <Button variant="ghost" size="sm" className="text-xs h-6 text-primary hover:text-primary/80 font-sans" onClick={() => onNavigate("events")}>View All</Button>
            </div>
            <div className="space-y-2">
              {upcomingEventsList.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-primary">{new Date(ev.date).toLocaleDateString("en-IN", { day: "2-digit" })}</span>
                    <span className="text-[8px] text-primary/70 uppercase">{new Date(ev.date).toLocaleDateString("en-IN", { month: "short" })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate font-sans">{ev.name}</p>
                    <p className="text-[10px] text-muted-foreground font-sans">{ev.city} • {ev.type}</p>
                  </div>
                </div>
              ))}
              {upcomingEventsList.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 font-sans">No upcoming events</p>}
            </div>
          </AdminCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <AdminCard>
            <h3 className="text-sm font-semibold text-foreground mb-3 font-sans">Performance</h3>
            <div className="space-y-3">
              <PerformanceBar label="Fulfillment Rate" value={fulfillmentRate} color="#22D3EE" />
              <PerformanceBar label="Payment Confirmed" value={stats.totalOrders > 0 ? Math.round((stats.confirmedPayments / (stats.totalOrders + stats.totalEvents)) * 100) : 0} color="#6366F1" />
              <PerformanceBar label="Enquiry Conversion" value={conversionRate} color="#FBBF24" />
              <PerformanceBar label="Event Completion" value={stats.totalEvents > 0 ? Math.round((stats.completedEvents / stats.totalEvents) * 100) : 0} color="#A78BFA" />
            </div>
            <div className="border-t border-border mt-4 pt-3 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground font-sans">{stats.workshopUsers}</p>
                <p className="text-[10px] text-muted-foreground font-sans">Workshop Users</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground font-sans">{stats.pendingEnquiries}</p>
                <p className="text-[10px] text-muted-foreground font-sans">Open Enquiries</p>
              </div>
            </div>
          </AdminCard>
        </motion.div>
      </div>

      {/* ROW 7: Extended Stats Strip */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <AdminCard>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-4">
            {[
              { label: "Today Orders", value: stats.todayOrders, icon: Package, color: "text-indigo-600 dark:text-indigo-400" },
              { label: "In Progress", value: stats.inProgressOrders, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
              { label: "Artwork Ready", value: stats.artworkReadyOrders, icon: Star, color: "text-violet-600 dark:text-violet-400" },
              { label: "Dispatched", value: stats.dispatchedOrders, icon: Truck, color: "text-cyan-600 dark:text-cyan-400" },
              { label: "Delivered", value: stats.completedOrders, icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Upcoming", value: stats.upcomingEvents, icon: Calendar, color: "text-blue-600 dark:text-blue-400" },
              { label: "Cancelled", value: stats.cancelledEvents, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
              { label: "New Today", value: stats.newCustomersToday, icon: UserPlus, color: "text-pink-600 dark:text-pink-400" },
              { label: "This Month", value: stats.newCustomersMonth, icon: Users, color: "text-teal-600 dark:text-teal-400" },
              { label: "Enquiries", value: stats.totalEnquiries, icon: MessageCircle, color: "text-orange-600 dark:text-orange-400" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <p className="text-sm font-bold text-foreground font-sans">{item.value}</p>
                <p className="text-[9px] text-muted-foreground text-center whitespace-nowrap font-sans">{item.label}</p>
              </div>
            ))}
          </div>
        </AdminCard>
      </motion.div>

      {/* ROW 8: Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Analytics", icon: BarChart3, tab: "analytics", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "AI Insights", icon: Bot, tab: "ai-intelligence", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
          { label: "CRM Pipeline", icon: Target, tab: "crm-pipeline", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
          { label: "₹10L Target", icon: TrendingUp, tab: "revenue-target", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
          { label: "Team", icon: Users, tab: "team", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10" },
          { label: "Security", icon: ShieldCheck, tab: "security-dashboard", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
        ].map((item) => (
          <motion.div key={item.label} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <AdminCard className="cursor-pointer hover:border-primary/20 hover:shadow-md" onClick={() => onNavigate(item.tab)}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground font-sans">{item.label}</span>
              </div>
            </AdminCard>
          </motion.div>
        ))}
      </div>

      {drillDown && (
        <AdminDrillDownDialog open={!!drillDown} onClose={() => setDrillDown(null)} metric={drillDown.metric} title={drillDown.title} />
      )}
    </div>
  );
};

/* ===== Admin Card — Clean 3D White with dark mode support ===== */
const AdminCard = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <Card className={`bg-card border-border shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] transition-shadow ${className || ""}`} onClick={onClick}>
    <CardContent className="p-5">{children}</CardContent>
  </Card>
);

/* ===== KPI Card ===== */
const KPICard = ({ title, value, change, sub, icon, gradient, onClick, sparkData, sparkColor }: {
  title: string; value: string; change?: number; sub?: string; icon: React.ReactNode;
  gradient: string; onClick?: () => void; sparkData?: number[]; sparkColor?: string;
}) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}>
    <Card className="bg-card border-border shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] cursor-pointer hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4)] transition-all" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
            {icon}
          </div>
          {change !== undefined && (
            <Badge className={`text-[10px] border-0 font-medium font-sans ${change >= 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>
              {change >= 0 ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <p className="text-xl font-bold text-foreground leading-none mb-1 font-sans">{value}</p>
        <p className="text-[11px] text-muted-foreground font-sans">{title}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-sans">{sub}</p>}
        {sparkData && sparkData.length > 1 && (
          <div className="mt-2 h-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData.map((v, i) => ({ v, i }))}>
                <Line type="monotone" dataKey="v" stroke={sparkColor || "#6366F1"} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const SalesMetric = ({ label, value, total, color }: { label: string; value: string; total: number; color: string }) => {
  const pct = total > 0 ? Math.round((parseInt(value.replace(/[₹,]/g, "")) / total) * 100) || 0 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-sans">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
};

const PerformanceBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs font-sans">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}%</span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
        className="h-full rounded-full" style={{ background: color }} />
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    new: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    artwork_ready: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    dispatched: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  };
  return <Badge className={`${colors[status] || "bg-muted text-muted-foreground"} border-0 text-[8px] px-1.5 py-0 font-sans`}>{status?.replace("_", " ")}</Badge>;
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-2.5 text-xs font-sans">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-muted-foreground">
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatPrice(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default AdminDashboardPremium;
