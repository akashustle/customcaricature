import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { Package, PenTool, Clock, DollarSign, MapPin, AlertTriangle, Users, CreditCard, TrendingUp, BarChart3, RefreshCw, ShoppingCart, Zap, Target, Activity, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar, Legend, ComposedChart, Scatter } from "recharts";
import { motion } from "framer-motion";

type Order = {
  id: string; caricature_type: string; order_type?: string; amount: number;
  negotiated_amount?: number | null; status: string; city: string | null;
  payment_status?: string | null; created_at: string; priority?: number | null;
  customer_email?: string;
};
type Profile = { id: string; user_id: string; full_name: string; email: string; created_at: string; };
interface Props { orders: Order[]; customers: Profile[]; }

const VIBRANT_COLORS = [
  "hsl(36, 45%, 52%)", "hsl(152, 50%, 48%)", "hsl(210, 65%, 55%)",
  "hsl(340, 55%, 58%)", "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(15, 65%, 55%)",
];

const AdminAnalytics = ({ orders, customers }: Props) => {
  const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.amount, 0);
  const pendingRevenue = orders.filter(o => o.payment_status !== "confirmed").reduce((sum, o) => sum + o.amount, 0);
  const pending = orders.filter(o => !["delivered", "completed"].includes(o.status));
  const delivered = orders.filter(o => ["delivered", "completed"].includes(o.status));
  const newOrders = orders.filter(o => o.status === "new");
  const inProgress = orders.filter(o => o.status === "in_progress");
  const avgOrderValue = confirmedOrders.length > 0 ? Math.round(totalRevenue / confirmedOrders.length) : 0;

  const negotiatedOrders = orders.filter(o => o.negotiated_amount && o.negotiated_amount !== o.amount);
  const totalNegotiatedAmount = negotiatedOrders.reduce((sum, o) => sum + (o.negotiated_amount || 0), 0);

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

  // Chart 1: Monthly revenue trend (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const monthStr = d.toLocaleString("default", { month: "short" });
    const monthOrders = confirmedOrders.filter(o => {
      const od = new Date(o.created_at);
      return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
    });
    return { name: monthStr, revenue: monthOrders.reduce((s, o) => s + o.amount, 0), orders: monthOrders.length };
  });

  // Chart 2: Order status pie
  const statusPieData = [
    { name: "New", value: newOrders.length },
    { name: "In Progress", value: inProgress.length },
    { name: "Art Ready", value: orders.filter(o => o.status === "artwork_ready").length },
    { name: "Dispatched", value: orders.filter(o => o.status === "dispatched").length },
    { name: "Delivered", value: delivered.length },
  ].filter(d => d.value > 0);

  // Chart 3: Weekly orders (last 7 days)
  const weeklyOrders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleString("default", { weekday: "short" });
    const count = orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).length;
    const rev = confirmedOrders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).reduce((s, o) => s + o.amount, 0);
    return { name: dayStr, orders: count, revenue: rev };
  });

  // Chart 4: Top cities bar
  const cityMap: Record<string, number> = {};
  orders.forEach(o => { const c = o.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
  const topCitiesData = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([city, count]) => ({ name: city, count }));

  // Chart 5: Payment split radial
  const paymentRadialData = [
    { name: "Confirmed", value: confirmedOrders.length, fill: VIBRANT_COLORS[1] },
    { name: "Pending", value: orders.filter(o => o.payment_status !== "confirmed").length, fill: VIBRANT_COLORS[4] },
  ];

  // Chart 6: Customer growth (last 6 months)
  const customerGrowth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const monthStr = d.toLocaleString("default", { month: "short" });
    const count = customers.filter(c => {
      const cd = new Date(c.created_at);
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
    }).length;
    const cumulative = customers.filter(c => new Date(c.created_at) <= d).length;
    return { name: monthStr, new: count, total: cumulative };
  });

  // Chart 7: Order type distribution
  const typeCounts: Record<string, number> = {};
  orders.forEach(o => { const t = (o as any).order_type || o.caricature_type || "unknown"; typeCounts[t] = (typeCounts[t] || 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  const mostPopularType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  // Urgent orders
  const urgentOrders = pending.filter(o => {
    const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 10;
  });

  // Conversion rate
  const conversionRate = orders.length > 0 ? Math.round((confirmedOrders.length / orders.length) * 100) : 0;

  const tooltipStyle = { borderRadius: 14, border: "1px solid hsl(30, 20%, 85%)", background: "hsl(40, 50%, 97%)", fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard3D icon={Users} label="Total Users" value={String(customers.length)} color="hsl(210,65%,55%)" delay={0} />
        <StatCard3D icon={TrendingUp} label="Active (30d)" value={String(activeUsers)} color="hsl(152,50%,48%)" delay={0.05} />
        <StatCard3D icon={Package} label="Total Orders" value={String(orders.length)} color="hsl(36,45%,52%)" delay={0.1} />
        <StatCard3D icon={ShoppingCart} label="Pending" value={String(pending.length)} color="hsl(38,92%,55%)" delay={0.15} />
        <StatCard3D icon={PenTool} label="Delivered" value={String(delivered.length)} color="hsl(152,50%,48%)" delay={0.2} />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard3D icon={DollarSign} label="Confirmed Revenue" value={formatPrice(totalRevenue)} color="hsl(152,50%,48%)" delay={0} />
        <StatCard3D icon={CreditCard} label="Confirmed Payments" value={`${confirmedOrders.length}`} color="hsl(210,65%,55%)" delay={0.05} />
        <StatCard3D icon={Clock} label="Pending Revenue" value={formatPrice(pendingRevenue)} color="hsl(38,92%,55%)" delay={0.1} />
        <StatCard3D icon={Target} label="Avg Order" value={formatPrice(avgOrderValue)} color="hsl(280,50%,55%)" delay={0.15} />
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard3D icon={RefreshCw} label="Negotiated" value={`${negotiatedOrders.length}`} color="hsl(340,55%,58%)" delay={0} />
        <StatCard3D icon={Zap} label="Most Popular" value={mostPopularType ? mostPopularType[0] : "N/A"} color="hsl(36,45%,52%)" delay={0.05} />
        <StatCard3D icon={RefreshCw} label="Repeat Users" value={String(repeatCustomers)} color="hsl(180,50%,45%)" delay={0.1} />
        <StatCard3D icon={Activity} label="Conversion" value={`${conversionRate}%`} color="hsl(152,50%,48%)" delay={0.15} />
        <StatCard3D icon={DollarSign} label="Today Revenue" value={formatPrice(todayRevenue)} color="hsl(15,65%,55%)" delay={0.2} />
      </div>

      {/* Chart Row 1: Revenue Trend + Order Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(36, 45%, 52%)" fill="url(#revenueGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Order Status</CardTitle>
            </CardHeader>
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
      </div>

      {/* Chart Row 2: Weekly Activity + Top Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-info" />Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={weeklyOrders}>
                  <defs>
                    <linearGradient id="weekBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Top Cities</CardTitle>
            </CardHeader>
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

      {/* Chart Row 3: Customer Growth + Order Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><Users className="w-5 h-5 text-success" />Customer Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={customerGrowth}>
                  <defs>
                    <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="card-3d overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-base font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-warning" />Order Types</CardTitle>
            </CardHeader>
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

      {/* Chart Row 4: Payment Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="card-3d overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-body text-base font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Payment Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={paymentRadialData} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={10} />
                  <Legend iconSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center space-y-4">
                {[
                  { label: "Today", value: todayRevenue },
                  { label: "This Week", value: weeklyRevenue },
                  { label: "This Month", value: monthlyRevenue },
                ].map(item => (
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

      {/* Urgent Orders Warning */}
      {urgentOrders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
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
