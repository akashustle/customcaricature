import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import AdminDrillDownDialog from "./AdminDrillDownDialog";
import { motion } from "framer-motion";
import {
  DollarSign, Package, Calendar, Users, TrendingUp, TrendingDown,
  Clock, Zap, ArrowUpRight, Activity, Target, ShoppingBag
} from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const AdminDashboardPremium = ({ onNavigate }: DashboardProps) => {
  const [stats, setStats] = useState({
    totalRevenue: 0, orderRevenue: 0, eventRevenue: 0, shopRevenue: 0,
    totalOrders: 0, pendingOrders: 0, completedOrders: 0, todayOrders: 0,
    totalEvents: 0, upcomingEvents: 0, completedEvents: 0,
    totalCustomers: 0, newCustomersWeek: 0,
    totalEnquiries: 0, convertedEnquiries: 0,
    pendingRevenue: 0, workshopUsers: 0,
    prevMonthRevenue: 0, prevMonthOrders: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [upcomingEventsList, setUpcomingEventsList] = useState<any[]>([]);
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

    const [orders, events, customers, enquiries, shopOrders, wsUsers] = await Promise.all([
      supabase.from("orders").select("id, status, payment_status, amount, negotiated_amount, created_at, customer_name"),
      supabase.from("event_bookings").select("id, status, payment_status, total_price, advance_amount, event_date, created_at, client_name, city, negotiated, negotiated_total"),
      supabase.from("profiles").select("id, created_at"),
      supabase.from("enquiries").select("id, status, created_at"),
      supabase.from("shop_orders" as any).select("id, total_amount, payment_status, created_at"),
      supabase.from("workshop_users" as any).select("id"),
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

    // Previous month revenue
    const prevOrders = confirmedOrders.filter((x: any) => {
      const d = new Date(x.created_at);
      return d >= twoMonthsAgo && d < monthAgo;
    });
    const prevMonthRev = prevOrders.reduce((s: number, x: any) => s + (x.negotiated_amount || x.amount), 0);

    // Monthly chart data
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

    // Recent orders
    setRecentOrders(o.slice(0, 5).map((x: any) => ({
      id: x.id, name: x.customer_name, amount: x.negotiated_amount || x.amount,
      status: x.status, date: x.created_at
    })));

    // Upcoming events
    setUpcomingEventsList(
      e.filter((x: any) => x.event_date >= todayStr && x.status !== "cancelled")
        .sort((a: any, b: any) => a.event_date.localeCompare(b.event_date))
        .slice(0, 5)
        .map((x: any) => ({ id: x.id, name: x.client_name, city: x.city, date: x.event_date }))
    );

    setStats({
      totalRevenue: orderRev + eventRev + shopRev,
      orderRevenue: orderRev, eventRevenue: eventRev, shopRevenue: shopRev,
      totalOrders: o.length,
      pendingOrders: o.filter((x: any) => ["new", "in_progress"].includes(x.status)).length,
      completedOrders: o.filter((x: any) => x.status === "delivered").length,
      todayOrders: o.filter((x: any) => x.created_at?.startsWith(todayStr)).length,
      totalEvents: e.length,
      upcomingEvents: e.filter((x: any) => x.event_date >= todayStr && x.status !== "cancelled").length,
      completedEvents: e.filter((x: any) => x.status === "completed").length,
      totalCustomers: c.length,
      newCustomersWeek: c.filter((x: any) => new Date(x.created_at) >= weekAgo).length,
      totalEnquiries: enq.length,
      convertedEnquiries: enq.filter((x: any) => x.status === "converted").length,
      pendingRevenue: pendingOrderRev + pendingEventRev,
      workshopUsers: (wsUsers.data || []).length,
      prevMonthRevenue: prevMonthRev,
      prevMonthOrders: prevOrders.length,
    });
    setLoading(false);
  };

  const getGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const revenueSplit = useMemo(() => [
    { name: "Caricatures", value: stats.orderRevenue, color: "hsl(210, 65%, 55%)" },
    { name: "Events", value: stats.eventRevenue, color: "hsl(152, 50%, 48%)" },
    { name: "Shop", value: stats.shopRevenue, color: "hsl(280, 50%, 55%)" },
  ].filter(d => d.value > 0), [stats]);

  const conversionRate = stats.totalEnquiries > 0
    ? Math.round((stats.convertedEnquiries / stats.totalEnquiries) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-muted/50 animate-pulse" />
          <div className="h-80 rounded-2xl bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Total Revenue", value: formatPrice(stats.totalRevenue),
      icon: DollarSign, gradient: "from-emerald-500/10 to-teal-500/10",
      iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600",
      growth: getGrowth(stats.totalRevenue, stats.prevMonthRevenue),
      onClick: () => setDrillDown({ metric: "revenue", title: "Total Revenue" }),
    },
    {
      label: "Orders", value: stats.totalOrders,
      icon: Package, gradient: "from-blue-500/10 to-indigo-500/10",
      iconBg: "bg-blue-500/15", iconColor: "text-blue-600",
      sub: `${stats.todayOrders} today`, onClick: () => setDrillDown({ metric: "orders", title: "Orders" }),
    },
    {
      label: "Events", value: stats.totalEvents,
      icon: Calendar, gradient: "from-violet-500/10 to-purple-500/10",
      iconBg: "bg-violet-500/15", iconColor: "text-violet-600",
      sub: `${stats.upcomingEvents} upcoming`, onClick: () => setDrillDown({ metric: "events", title: "Events" }),
    },
    {
      label: "Customers", value: stats.totalCustomers,
      icon: Users, gradient: "from-pink-500/10 to-rose-500/10",
      iconBg: "bg-pink-500/15", iconColor: "text-pink-600",
      sub: `+${stats.newCustomersWeek} this week`, onClick: () => setDrillDown({ metric: "customers", title: "Customers" }),
    },
    {
      label: "Conversion", value: `${conversionRate}%`,
      icon: Target, gradient: "from-amber-500/10 to-orange-500/10",
      iconBg: "bg-amber-500/15", iconColor: "text-amber-600",
      sub: `${stats.convertedEnquiries}/${stats.totalEnquiries}`, onClick: () => setDrillDown({ metric: "enquiries", title: "Enquiry Conversion" }),
    },
    {
      label: "Pending", value: formatPrice(stats.pendingRevenue),
      icon: Clock, gradient: "from-red-500/10 to-rose-500/10",
      iconBg: "bg-red-500/15", iconColor: "text-red-500",
      sub: `${stats.pendingOrders} orders`, onClick: () => setDrillDown({ metric: "pending", title: "Pending Revenue" }),
    },
  ];

  const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700",
    artwork_ready: "bg-violet-100 text-violet-700", dispatched: "bg-cyan-100 text-cyan-700",
    delivered: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Card
              className={`group cursor-pointer border-0 bg-gradient-to-br ${kpi.gradient} hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
              onClick={kpi.onClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                    <kpi.icon className={`w-4.5 h-4.5 ${kpi.iconColor}`} style={{ width: 18, height: 18 }} />
                  </div>
                  {kpi.growth !== undefined && (
                    <Badge className={`text-[10px] border-0 ${kpi.growth >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {kpi.growth >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {Math.abs(kpi.growth)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold text-foreground leading-none mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {kpi.value}
                </p>
                <p className="text-[11px] text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {kpi.label}
                </p>
                {kpi.sub && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {kpi.sub}
                  </p>
                )}
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Revenue Overview</h3>
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Last 6 months</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate("analytics")}>
                  View All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 18%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(25, 10%, 50%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(25, 10%, 50%)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(30, 18%, 88%)', background: 'hsl(30, 40%, 99%)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                    formatter={(value: number) => [formatPrice(value), ""]}
                  />
                  <Area type="monotone" dataKey="orders" stroke="hsl(210, 65%, 55%)" fill="url(#revGrad)" strokeWidth={2} name="Orders" />
                  <Area type="monotone" dataKey="events" stroke="hsl(152, 50%, 48%)" fill="url(#evGrad)" strokeWidth={2} name="Events" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Split */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm h-full">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Revenue Split</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={revenueSplit}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="value" paddingAngle={4}
                  >
                    {revenueSplit.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(30, 18%, 88%)', background: 'hsl(30, 40%, 99%)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                    formatter={(value: number) => [formatPrice(value), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {revenueSplit.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{formatPrice(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Recent Orders</h3>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => onNavigate("orders")}>
                  View All
                </Button>
              </div>
              <div className="space-y-2.5">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{order.name}</p>
                      <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {new Date(order.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${STATUS_COLORS[order.status] || ""} border-0 text-[9px] px-1.5 py-0.5`}>
                        {order.status?.replace("_", " ")}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {formatPrice(order.amount)}
                      </span>
                    </div>
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4" style={{ fontFamily: 'Inter, sans-serif' }}>No orders yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Upcoming Events</h3>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => onNavigate("events")}>
                  View All
                </Button>
              </div>
              <div className="space-y-2.5">
                {upcomingEventsList.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{ev.name}</p>
                      <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>{ev.city}</p>
                    </div>
                    <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px]">
                      {new Date(ev.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </Badge>
                  </div>
                ))}
                {upcomingEventsList.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4" style={{ fontFamily: 'Inter, sans-serif' }}>No upcoming events</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500/5 to-indigo-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Smart Insights</h3>
              </div>
              <div className="space-y-2.5">
                {stats.totalRevenue > 0 && (
                  <InsightItem
                    emoji="📈"
                    text={`Revenue is ${formatPrice(stats.totalRevenue)} with ${stats.totalOrders} orders`}
                    type="info"
                  />
                )}
                {stats.pendingOrders > 3 && (
                  <InsightItem
                    emoji="⚠️"
                    text={`${stats.pendingOrders} orders pending attention`}
                    type="warning"
                  />
                )}
                {stats.upcomingEvents > 0 && (
                  <InsightItem
                    emoji="🎉"
                    text={`${stats.upcomingEvents} events coming up`}
                    type="success"
                  />
                )}
                {stats.newCustomersWeek > 0 && (
                  <InsightItem
                    emoji="👥"
                    text={`${stats.newCustomersWeek} new customers this week`}
                    type="info"
                  />
                )}
                {conversionRate > 0 && (
                  <InsightItem
                    emoji="🎯"
                    text={`Enquiry conversion: ${conversionRate}%`}
                    type={conversionRate > 30 ? "success" : "warning"}
                  />
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3 text-xs h-7 text-violet-600" onClick={() => onNavigate("ai-intelligence")}>
                View AI Dashboard <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="border-0 shadow-sm bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-thin">
              <QuickStat label="Completed Orders" value={stats.completedOrders} icon={Package} color="text-emerald-600" />
              <QuickStat label="Completed Events" value={stats.completedEvents} icon={Calendar} color="text-blue-600" />
              <QuickStat label="Workshop Users" value={stats.workshopUsers} icon={ShoppingBag} color="text-purple-600" />
              <QuickStat label="Active Enquiries" value={stats.totalEnquiries - stats.convertedEnquiries} icon={Activity} color="text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const InsightItem = ({ emoji, text, type }: { emoji: string; text: string; type: "info" | "warning" | "success" }) => (
  <div className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
    type === "warning" ? "bg-amber-50 text-amber-800" :
    type === "success" ? "bg-emerald-50 text-emerald-800" :
    "bg-blue-50 text-blue-800"
  }`} style={{ fontFamily: 'Inter, sans-serif' }}>
    <span className="text-sm flex-shrink-0">{emoji}</span>
    <span className="leading-snug">{text}</span>
  </div>
);

const QuickStat = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <div className="flex items-center gap-2.5 flex-shrink-0">
    <Icon className={`w-4 h-4 ${color}`} />
    <div>
      <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>{value}</p>
      <p className="text-[10px] text-muted-foreground whitespace-nowrap" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</p>
    </div>
  </div>
);

export default AdminDashboardPremium;
