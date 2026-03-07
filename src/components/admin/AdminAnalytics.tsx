import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { Package, PenTool, Clock, DollarSign, MapPin, AlertTriangle, Users, CreditCard, TrendingUp, BarChart3, RefreshCw, ShoppingCart, Zap, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar, Legend } from "recharts";

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
    return { name: dayStr, orders: count };
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

  // Urgent orders
  const urgentOrders = pending.filter(o => {
    const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 10;
  });

  const typeCounts: Record<string, number> = {};
  orders.forEach(o => { const t = (o as any).order_type || o.caricature_type || "unknown"; typeCounts[t] = (typeCounts[t] || 0) + 1; });
  const mostPopularType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid — 3D vibrant cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard3D icon={Users} label="Total Users" value={String(customers.length)} gradient="from-[hsl(210,65%,55%)] to-[hsl(210,65%,45%)]" />
        <StatCard3D icon={TrendingUp} label="Active (30d)" value={String(activeUsers)} gradient="from-[hsl(152,50%,48%)] to-[hsl(152,50%,38%)]" />
        <StatCard3D icon={Package} label="Total Orders" value={String(orders.length)} gradient="from-[hsl(36,45%,52%)] to-[hsl(36,45%,42%)]" />
        <StatCard3D icon={ShoppingCart} label="Pending" value={String(pending.length)} gradient="from-[hsl(38,92%,55%)] to-[hsl(38,80%,45%)]" />
        <StatCard3D icon={PenTool} label="Delivered" value={String(delivered.length)} gradient="from-[hsl(152,50%,48%)] to-[hsl(170,50%,40%)]" />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard3D icon={DollarSign} label="Confirmed Revenue" value={formatPrice(totalRevenue)} gradient="from-[hsl(152,50%,48%)] to-[hsl(152,50%,38%)]" />
        <StatCard3D icon={CreditCard} label="Confirmed Payments" value={`${confirmedOrders.length}`} gradient="from-[hsl(210,65%,55%)] to-[hsl(210,65%,45%)]" />
        <StatCard3D icon={Clock} label="Pending Revenue" value={formatPrice(pendingRevenue)} gradient="from-[hsl(38,92%,55%)] to-[hsl(38,80%,45%)]" />
        <StatCard3D icon={Target} label="Avg Order" value={formatPrice(avgOrderValue)} gradient="from-[hsl(280,50%,55%)] to-[hsl(280,50%,45%)]" />
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard3D icon={RefreshCw} label="Negotiated" value={`${negotiatedOrders.length} (${formatPrice(totalNegotiatedAmount)})`} gradient="from-[hsl(340,55%,58%)] to-[hsl(340,55%,48%)]" />
        <StatCard3D icon={Zap} label="Most Popular" value={mostPopularType ? mostPopularType[0] : "N/A"} gradient="from-[hsl(36,45%,52%)] to-[hsl(36,45%,42%)]" />
        <StatCard3D icon={RefreshCw} label="Repeat Users" value={String(repeatCustomers)} gradient="from-[hsl(180,50%,45%)] to-[hsl(180,50%,35%)]" />
        <StatCard3D icon={DollarSign} label="Today Revenue" value={formatPrice(todayRevenue)} gradient="from-[hsl(152,50%,48%)] to-[hsl(152,50%,38%)]" />
      </div>

      {/* Chart Row 1: Revenue Trend + Order Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-3d overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Revenue Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 22%, 82%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(33, 15%, 52%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(33, 15%, 52%)" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(30, 22%, 82%)", background: "hsl(40, 50%, 96%)" }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(36, 45%, 52%)" fill="url(#revenueGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-3d overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Order Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusPieData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(30, 22%, 82%)", background: "hsl(40, 50%, 96%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart Row 2: Weekly Activity + Top Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-3d overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Weekly Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weeklyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 22%, 82%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(33, 15%, 52%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(33, 15%, 52%)" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(30, 22%, 82%)", background: "hsl(40, 50%, 96%)" }} />
                <Line type="monotone" dataKey="orders" stroke="hsl(210, 65%, 55%)" strokeWidth={3} dot={{ fill: "hsl(210, 65%, 55%)", r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-3d overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Top Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCitiesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 22%, 82%)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(33, 15%, 52%)" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(33, 15%, 52%)" }} width={80} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(30, 22%, 82%)", background: "hsl(40, 50%, 96%)" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {topCitiesData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart Row 3: Payment Split */}
      <Card className="card-3d overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Payment Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={paymentRadialData} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={10} />
                <Legend iconSize={10} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex justify-between font-sans text-sm">
                <span className="text-muted-foreground">Today</span>
                <span className="font-semibold">{formatPrice(todayRevenue)}</span>
              </div>
              <div className="flex justify-between font-sans text-sm">
                <span className="text-muted-foreground">This Week</span>
                <span className="font-semibold">{formatPrice(weeklyRevenue)}</span>
              </div>
              <div className="flex justify-between font-sans text-sm">
                <span className="text-muted-foreground">This Month</span>
                <span className="font-semibold">{formatPrice(monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between font-sans text-sm border-t border-border pt-2">
                <span className="font-medium">All Time</span>
                <span className="font-bold text-primary">{formatPrice(totalRevenue)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Orders Warning */}
      {urgentOrders.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 card-3d">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Deadline Warnings ({urgentOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-sans text-muted-foreground mb-3">These orders are due within 10 days!</p>
            {urgentOrders.map(o => {
              const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
              const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={o.id} className="flex justify-between font-sans text-sm py-1.5 border-b border-border/50 last:border-none">
                  <span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`font-semibold ${daysLeft <= 3 ? "text-destructive" : "text-warning"}`}>
                    {daysLeft <= 0 ? "⚠️ OVERDUE" : `${daysLeft} days left`}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StatCard3D = ({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: string; gradient: string }) => (
  <div className="relative overflow-hidden rounded-2xl p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    style={{
      background: "linear-gradient(145deg, hsl(40, 50%, 97%), hsl(40, 50%, 94%))",
      border: "1px solid hsl(30, 22%, 85%)",
      boxShadow: "0 4px 12px hsl(33 30% 38% / 0.08), 0 1px 3px hsl(33 30% 38% / 0.04), inset 0 1px 0 hsl(40, 60%, 99%)",
    }}
  >
    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-15 -translate-y-6 translate-x-6`} />
    <div className="flex items-center gap-3 relative z-10">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg md:text-xl font-display font-bold truncate">{value}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground font-sans">{label}</p>
      </div>
    </div>
  </div>
);

export default AdminAnalytics;
