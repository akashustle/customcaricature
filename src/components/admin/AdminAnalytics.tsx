import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { Package, PenTool, Clock, DollarSign, MapPin, AlertTriangle, Users, CreditCard, TrendingUp, BarChart3, RefreshCw, ShoppingCart, Zap, Target, Activity, Layers, Calendar, Globe, UserCheck, Percent, Star, Heart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar, Legend, ComposedChart, FunnelChart, Funnel, LabelList } from "recharts";
import { motion } from "framer-motion";

type Order = {
  id: string; caricature_type: string; order_type?: string; amount: number;
  negotiated_amount?: number | null; status: string; city: string | null;
  payment_status?: string | null; created_at: string; priority?: number | null;
  customer_email?: string;
};
type Profile = { id: string; user_id: string; full_name: string; email: string; created_at: string; age?: number | null; gender?: string | null; };
interface Props { orders: Order[]; customers: Profile[]; }

const VIBRANT_COLORS = [
  "hsl(36, 45%, 52%)", "hsl(152, 50%, 48%)", "hsl(210, 65%, 55%)",
  "hsl(340, 55%, 58%)", "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(15, 65%, 55%)",
];

const AdminAnalytics = ({ orders, customers }: Props) => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from("event_bookings").select("id, total_price, advance_amount, payment_status, status, city, state, event_date, created_at, artist_count, negotiated, negotiated_total, negotiated_advance");
      if (data) setEvents(data);
    };
    fetchEvents();
    const ch = supabase.channel("analytics-events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Combined metrics
  const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
  const orderRevenue = confirmedOrders.reduce((sum, o) => sum + o.amount, 0);
  const eventRevenue = events.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status)).reduce((sum, e) => sum + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
  const totalRevenue = orderRevenue + eventRevenue;
  const pendingOrderRev = orders.filter(o => o.payment_status !== "confirmed").reduce((sum, o) => sum + o.amount, 0);
  const pendingEventRev = events.filter(e => !["confirmed", "fully_paid"].includes(e.payment_status)).reduce((sum, e) => sum + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
  const totalPendingRev = pendingOrderRev + pendingEventRev;

  const pending = orders.filter(o => !["delivered", "completed"].includes(o.status));
  const delivered = orders.filter(o => ["delivered", "completed"].includes(o.status));
  const newOrders = orders.filter(o => o.status === "new");
  const inProgress = orders.filter(o => o.status === "in_progress");
  const avgOrderValue = confirmedOrders.length > 0 ? Math.round(orderRevenue / confirmedOrders.length) : 0;

  const negotiatedOrders = orders.filter(o => o.negotiated_amount && o.negotiated_amount !== o.amount);
  const emailCounts: Record<string, number> = {};
  orders.forEach(o => { const e = (o as any).customer_email; if (e) emailCounts[e] = (emailCounts[e] || 0) + 1; });
  const repeatCustomers = Object.values(emailCounts).filter(c => c > 1).length;

  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOrders = orders.filter(o => new Date(o.created_at) > thirtyDaysAgo);
  const activeUsers = new Set(recentOrders.map(o => (o as any).customer_email)).size;

  const now = new Date();
  const todayRevenue = confirmedOrders.filter(o => new Date(o.created_at).toDateString() === now.toDateString()).reduce((s, o) => s + o.amount, 0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyRevenue = confirmedOrders.filter(o => new Date(o.created_at) > weekAgo).reduce((s, o) => s + o.amount, 0);
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthlyRevenue = confirmedOrders.filter(o => new Date(o.created_at) > monthAgo).reduce((s, o) => s + o.amount, 0);

  const conversionRate = orders.length > 0 ? Math.round((confirmedOrders.length / orders.length) * 100) : 0;
  const completedEvents = events.filter(e => e.status === "completed").length;
  const upcomingEvents = events.filter(e => e.status === "upcoming").length;

  // Event revenue metrics
  const eventAdvanceCollected = events.filter(e => ["confirmed", "fully_paid", "partial_1_paid"].includes(e.payment_status)).reduce((s, e) => s + (e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount), 0);

  // NEW: Remaining amount to collect from events
  const eventRemainingToCollect = events
    .filter(e => ["confirmed", "partial_1_paid"].includes(e.payment_status))
    .reduce((s, e) => {
      const total = e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price;
      const advance = e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount;
      return s + Math.max(0, total - advance);
    }, 0);

  // NEW: Manual payments total
  const manualPaymentsTotal = 0; // Tracked via payment_history

  // NEW: Average event value
  const avgEventValue = events.length > 0 ? Math.round(events.reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0) / events.length) : 0;

  // NEW: Events this month
  const eventsThisMonth = events.filter(e => { const d = new Date(e.event_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

  // NEW: Cancelled events count
  const cancelledEvents = events.filter(e => e.status === "cancelled").length;

  // Age demographics
  const ageGroups: Record<string, number> = { "Under 18": 0, "18-25": 0, "26-35": 0, "36-45": 0, "46-60": 0, "60+": 0 };
  customers.forEach(c => {
    const age = (c as any).age;
    if (!age) return;
    if (age < 18) ageGroups["Under 18"]++;
    else if (age <= 25) ageGroups["18-25"]++;
    else if (age <= 35) ageGroups["26-35"]++;
    else if (age <= 45) ageGroups["36-45"]++;
    else if (age <= 60) ageGroups["46-60"]++;
    else ageGroups["60+"]++;
  });
  const ageData = Object.entries(ageGroups).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  // Gender demographics
  const genderCounts: Record<string, number> = { male: 0, female: 0, other: 0 };
  customers.forEach(c => {
    const g = (c as any).gender;
    if (g === "male") genderCounts.male++;
    else if (g === "female") genderCounts.female++;
    else if (g) genderCounts.other++;
  });
  const genderData = Object.entries(genderCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  // Monthly combined revenue (orders + events)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const monthStr = d.toLocaleString("default", { month: "short" });
    const mOrders = confirmedOrders.filter(o => { const od = new Date(o.created_at); return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear(); });
    const mEvents = events.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status)).filter(e => { const ed = new Date(e.created_at); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); });
    const orderRev = mOrders.reduce((s, o) => s + o.amount, 0);
    const eventRev = mEvents.reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
    return { name: monthStr, orders: orderRev, events: eventRev, total: orderRev + eventRev };
  });

  // Order status pie
  const statusPieData = [
    { name: "New", value: newOrders.length },
    { name: "In Progress", value: inProgress.length },
    { name: "Art Ready", value: orders.filter(o => o.status === "artwork_ready").length },
    { name: "Dispatched", value: orders.filter(o => o.status === "dispatched").length },
    { name: "Delivered", value: delivered.length },
  ].filter(d => d.value > 0);

  // Weekly orders
  const weeklyOrders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleString("default", { weekday: "short" });
    const count = orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).length;
    const rev = confirmedOrders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).reduce((s, o) => s + o.amount, 0);
    return { name: dayStr, orders: count, revenue: rev };
  });

  // Top cities (combined)
  const cityMap: Record<string, number> = {};
  orders.forEach(o => { const c = o.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
  events.forEach(e => { const c = e.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
  const topCitiesData = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => ({ name: city, count }));

  // Customer growth
  const customerGrowth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const monthStr = d.toLocaleString("default", { month: "short" });
    const count = customers.filter(c => { const cd = new Date(c.created_at); return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear(); }).length;
    const cumulative = customers.filter(c => new Date(c.created_at) <= d).length;
    return { name: monthStr, new: count, total: cumulative };
  });

  // Order type distribution
  const typeCounts: Record<string, number> = {};
  orders.forEach(o => { const t = (o as any).order_type || o.caricature_type || "unknown"; typeCounts[t] = (typeCounts[t] || 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  const mostPopularType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  // Revenue split pie (Orders vs Events)
  const revenueSplitData = [
    { name: "Orders", value: orderRevenue },
    { name: "Events", value: eventRevenue },
  ].filter(d => d.value > 0);

  // Hourly order distribution
  const hourlyMap: Record<number, number> = {};
  orders.forEach(o => { const h = new Date(o.created_at).getHours(); hourlyMap[h] = (hourlyMap[h] || 0) + 1; });
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: hourlyMap[h] || 0 }));

  // Event status breakdown
  const eventStatusData = [
    { name: "Upcoming", value: upcomingEvents },
    { name: "Completed", value: completedEvents },
    { name: "Cancelled", value: events.filter(e => e.status === "cancelled").length },
  ].filter(d => d.value > 0);

  // Urgent orders
  const urgentOrders = pending.filter(o => {
    const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 10;
  });

  const paymentRadialData = [
    { name: "Confirmed", value: confirmedOrders.length, fill: VIBRANT_COLORS[1] },
    { name: "Pending", value: orders.filter(o => o.payment_status !== "confirmed").length, fill: VIBRANT_COLORS[4] },
  ];

  const tooltipStyle = { borderRadius: 14, border: "1px solid hsl(30, 20%, 85%)", background: "hsl(40, 50%, 97%)", fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* Combined Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard3D icon={DollarSign} label="Total Revenue" value={formatPrice(totalRevenue)} color="hsl(152,50%,48%)" delay={0} />
        <StatCard3D icon={Package} label="Total Orders" value={String(orders.length)} color="hsl(36,45%,52%)" delay={0.05} />
        <StatCard3D icon={Calendar} label="Total Events" value={String(events.length)} color="hsl(210,65%,55%)" delay={0.1} />
        <StatCard3D icon={Users} label="Total Users" value={String(customers.length)} color="hsl(280,50%,55%)" delay={0.15} />
        <StatCard3D icon={TrendingUp} label="Active (30d)" value={String(activeUsers)} color="hsl(340,55%,58%)" delay={0.2} />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard3D icon={CreditCard} label="Order Revenue" value={formatPrice(orderRevenue)} color="hsl(152,50%,48%)" delay={0} />
        <StatCard3D icon={Star} label="Event Revenue" value={formatPrice(eventRevenue)} color="hsl(210,65%,55%)" delay={0.05} />
        <StatCard3D icon={Clock} label="Pending Revenue" value={formatPrice(totalPendingRev)} color="hsl(38,92%,55%)" delay={0.1} />
        <StatCard3D icon={Target} label="Avg Order" value={formatPrice(avgOrderValue)} color="hsl(280,50%,55%)" delay={0.15} />
        <StatCard3D icon={DollarSign} label="Advance Collected" value={formatPrice(eventAdvanceCollected)} color="hsl(15,65%,55%)" delay={0.2} />
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard3D icon={Percent} label="Conversion" value={`${conversionRate}%`} color="hsl(152,50%,48%)" delay={0} />
        <StatCard3D icon={RefreshCw} label="Repeat Users" value={String(repeatCustomers)} color="hsl(180,50%,45%)" delay={0.05} />
        <StatCard3D icon={Zap} label="Most Popular" value={mostPopularType ? mostPopularType[0] : "N/A"} color="hsl(36,45%,52%)" delay={0.1} />
        <StatCard3D icon={ShoppingCart} label="Pending Orders" value={String(pending.length)} color="hsl(38,92%,55%)" delay={0.15} />
        <StatCard3D icon={Globe} label="Upcoming Events" value={String(upcomingEvents)} color="hsl(210,65%,55%)" delay={0.2} />
      </div>

      {/* NEW: Event-specific widgets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard3D icon={AlertTriangle} label="Remaining to Collect" value={formatPrice(eventRemainingToCollect)} color="hsl(0,55%,55%)" delay={0} />
        <StatCard3D icon={Target} label="Avg Event Value" value={formatPrice(avgEventValue)} color="hsl(280,50%,55%)" delay={0.05} />
        <StatCard3D icon={Calendar} label="Events This Month" value={String(eventsThisMonth)} color="hsl(36,45%,52%)" delay={0.1} />
        <StatCard3D icon={Activity} label="Completed Events" value={String(completedEvents)} color="hsl(152,50%,48%)" delay={0.15} />
        <StatCard3D icon={Package} label="Cancelled Events" value={String(cancelledEvents)} color="hsl(340,55%,58%)" delay={0.2} />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard3D icon={DollarSign} label="Today" value={formatPrice(todayRevenue)} color="hsl(15,65%,55%)" delay={0} />
        <StatCard3D icon={DollarSign} label="This Week" value={formatPrice(weeklyRevenue)} color="hsl(36,45%,52%)" delay={0.05} />
        <StatCard3D icon={DollarSign} label="This Month" value={formatPrice(monthlyRevenue)} color="hsl(152,50%,48%)" delay={0.1} />
        <StatCard3D icon={UserCheck} label="Negotiated" value={String(negotiatedOrders.length)} color="hsl(340,55%,58%)" delay={0.15} />
      </div>

      {/* Chart Row 1: Combined Revenue + Revenue Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Combined Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={monthlyData}>
                  <defs>
                    <linearGradient id="orderRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="orders" name="Order Rev" stroke="hsl(36, 45%, 52%)" fill="url(#orderRevGrad)" strokeWidth={2} />
                  <Bar dataKey="events" name="Event Rev" fill="hsl(210, 65%, 55%)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(152, 50%, 48%)" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-primary" />Revenue Split: Orders vs Events</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={revenueSplitData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${formatPrice(value)}`}>
                    {revenueSplitData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart Row 2: Order Status + Event Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Order Status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusPieData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Event Status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={eventStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {eventStatusData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[(i + 3) % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart Row 3: Weekly Activity + Top Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Weekly Activity</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={weeklyOrders}>
                  <defs><linearGradient id="weekBarGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0.8} /><stop offset="95%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0.3} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar yAxisId="left" dataKey="orders" fill="url(#weekBarGrad)" radius={[6, 6, 0, 0]} barSize={28} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(340, 55%, 58%)" strokeWidth={2.5} dot={{ fill: "hsl(340, 55%, 58%)", r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Top Cities (Combined)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topCitiesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {topCitiesData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart Row 4: Age Demographics + Gender Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Age Demographics</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                    {ageData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-primary" />Gender Distribution</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="hsl(210, 65%, 55%)" />
                    <Cell fill="hsl(340, 55%, 58%)" />
                    <Cell fill="hsl(152, 50%, 48%)" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart Row 5: Customer Growth + Order Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Customer Growth</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={customerGrowth}>
                  <defs><linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total" stroke="hsl(152, 50%, 48%)" fill="url(#custGrad)" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="new" stroke="hsl(280, 50%, 55%)" strokeWidth={2} dot={{ fill: "hsl(280, 50%, 55%)", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-primary" />Order Types</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {typeData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[(i + 2) % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart Row 6: Payment Overview + Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Payment Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={paymentRadialData} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <Legend iconSize={10} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center space-y-3">
                  {[{ label: "Today", value: todayRevenue }, { label: "This Week", value: weeklyRevenue }, { label: "This Month", value: monthlyRevenue }].map(item => (
                    <div key={item.label} className="flex justify-between font-body text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold">{formatPrice(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-body text-sm border-t border-border pt-2">
                    <span className="font-medium">All Time</span>
                    <span className="font-bold text-primary">{formatPrice(totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="font-body text-base font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Peak Order Hours</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={hourlyData}>
                  <defs><linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(280, 50%, 55%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(280, 50%, 55%)" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(30, 12%, 56%)" }} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="orders" stroke="hsl(280, 50%, 55%)" fill="url(#hourGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Urgent Orders Warning */}
      {urgentOrders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="border-destructive/30 bg-destructive/5 card-3d">
            <CardHeader>
              <CardTitle className="font-body text-base font-bold flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Deadline Warnings ({urgentOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-body text-muted-foreground mb-3">These orders are due within 10 days!</p>
              {urgentOrders.map(o => {
                const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
                const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={o.id} className="flex justify-between font-body text-sm py-1.5 border-b border-border/50 last:border-none">
                    <span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`font-semibold ${daysLeft <= 3 ? "text-destructive" : "text-warning"}`}>
                      {daysLeft <= 0 ? "⚠️ OVERDUE" : `${daysLeft} days left`}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

const StatCard3D = ({ icon: Icon, label, value, color, delay = 0 }: { icon: any; label: string; value: string; color: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1"
    style={{
      background: "linear-gradient(145deg, hsl(40, 50%, 98%), hsl(40, 50%, 95%))",
      border: "1px solid hsl(30, 20%, 88%)",
      boxShadow: "0 4px 14px hsl(30 20% 45% / 0.06), 0 1px 3px hsl(30 20% 45% / 0.03), inset 0 1px 0 hsl(40, 60%, 99%)",
    }}
  >
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6" style={{ background: color }} />
    <div className="flex items-center gap-3 relative z-10">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: color }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg md:text-xl font-body font-bold truncate">{value}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground font-body">{label}</p>
      </div>
    </div>
  </motion.div>
);

export default AdminAnalytics;
