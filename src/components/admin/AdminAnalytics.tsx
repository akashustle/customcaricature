import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { Package, PenTool, Clock, DollarSign, MapPin, AlertTriangle, Users, CreditCard, TrendingUp, BarChart3, RefreshCw, ShoppingCart } from "lucide-react";

type Order = {
  id: string;
  caricature_type: string;
  amount: number;
  status: string;
  city: string | null;
  payment_status?: string | null;
  created_at: string;
  priority?: number | null;
  customer_email?: string;
};

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
};

interface Props {
  orders: Order[];
  customers: Profile[];
}

const AdminAnalytics = ({ orders, customers }: Props) => {
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const confirmedRevenue = orders.filter(o => o.payment_status === "confirmed").reduce((sum, o) => sum + o.amount, 0);
  const pendingRevenue = orders.filter(o => o.payment_status !== "confirmed").reduce((sum, o) => sum + o.amount, 0);
  const pending = orders.filter((o) => !["delivered", "completed"].includes(o.status));
  const paymentConfirmed = orders.filter((o) => o.payment_status === "confirmed");
  const paymentPending = orders.filter((o) => o.payment_status !== "confirmed");
  const delivered = orders.filter((o) => ["delivered", "completed"].includes(o.status));
  const newOrders = orders.filter(o => o.status === "new");
  const inProgress = orders.filter(o => o.status === "in_progress");
  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Repeat customers
  const emailCounts: Record<string, number> = {};
  orders.forEach(o => {
    const email = (o as any).customer_email;
    if (email) emailCounts[email] = (emailCounts[email] || 0) + 1;
  });
  const repeatCustomers = Object.values(emailCounts).filter(c => c > 1).length;

  // Active users (ordered in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOrders = orders.filter(o => new Date(o.created_at) > thirtyDaysAgo);
  const activeUsers = new Set(recentOrders.map(o => (o as any).customer_email)).size;

  // Revenue by period
  const now = new Date();
  const todayRevenue = orders.filter(o => o.payment_status === "confirmed" && new Date(o.created_at).toDateString() === now.toDateString()).reduce((s, o) => s + o.amount, 0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyRevenue = orders.filter(o => o.payment_status === "confirmed" && new Date(o.created_at) > weekAgo).reduce((s, o) => s + o.amount, 0);
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthlyRevenue = orders.filter(o => o.payment_status === "confirmed" && new Date(o.created_at) > monthAgo).reduce((s, o) => s + o.amount, 0);

  // Due date warnings
  const urgentOrders = pending.filter((o) => {
    const orderDate = new Date(o.created_at);
    const dueDate = new Date(orderDate);
    dueDate.setDate(dueDate.getDate() + 30);
    const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 10;
  });

  // Orders by status for chart
  const statusCounts = [
    { label: "New", count: newOrders.length, color: "bg-blue-500" },
    { label: "In Progress", count: inProgress.length, color: "bg-yellow-500" },
    { label: "Artwork Ready", count: orders.filter(o => o.status === "artwork_ready").length, color: "bg-purple-500" },
    { label: "Dispatched", count: orders.filter(o => o.status === "dispatched").length, color: "bg-orange-500" },
    { label: "Delivered", count: delivered.length, color: "bg-green-500" },
  ];
  const maxStatusCount = Math.max(...statusCounts.map(s => s.count), 1);

  // Location breakdown
  const cityMap: Record<string, number> = {};
  orders.forEach((o) => {
    const city = o.city || "Unknown";
    cityMap[city] = (cityMap[city] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total Users" value={String(customers.length)} />
        <StatCard icon={TrendingUp} label="Active Users" value={String(activeUsers)} subtitle="Last 30 days" />
        <StatCard icon={Package} label="Total Orders" value={String(orders.length)} />
        <StatCard icon={ShoppingCart} label="Pending Orders" value={String(pending.length)} color="text-amber-600" />
        <StatCard icon={PenTool} label="Delivered" value={String(delivered.length)} color="text-green-600" />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Total Revenue" value={formatPrice(totalRevenue)} />
        <StatCard icon={CreditCard} label="Confirmed Payments" value={`${paymentConfirmed.length} (${formatPrice(confirmedRevenue)})`} color="text-green-600" />
        <StatCard icon={Clock} label="Pending Payments" value={`${paymentPending.length} (${formatPrice(pendingRevenue)})`} color="text-amber-600" />
        <StatCard icon={BarChart3} label="Avg Order Value" value={formatPrice(avgOrderValue)} />
      </div>

      {/* Revenue Breakdown & Repeat Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Revenue Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
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
              <span className="text-muted-foreground font-medium">All Time</span>
              <span className="font-bold text-primary">{formatPrice(confirmedRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><RefreshCw className="w-5 h-5 text-primary" />Customer Insights</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between font-sans text-sm">
              <span className="text-muted-foreground">Repeat Customers</span>
              <span className="font-semibold">{repeatCustomers}</span>
            </div>
            <div className="flex justify-between font-sans text-sm">
              <span className="text-muted-foreground">New Orders (Unprocessed)</span>
              <span className="font-semibold">{newOrders.length}</span>
            </div>
            <div className="flex justify-between font-sans text-sm">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-semibold">{inProgress.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status Chart */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Orders by Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusCounts.map((s) => (
              <div key={s.label} className="flex items-center gap-3 font-sans text-sm">
                <span className="w-24 text-muted-foreground">{s.label}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${(s.count / maxStatusCount) * 100}%` }} />
                </div>
                <span className="font-semibold w-8 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Urgent Orders Warning */}
      {urgentOrders.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delivery Deadline Warnings ({urgentOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-sans text-muted-foreground mb-3">
              These orders are due within 10 days!
            </p>
            {urgentOrders.map((o) => {
              const dueDate = new Date(o.created_at);
              dueDate.setDate(dueDate.getDate() + 30);
              const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={o.id} className="flex justify-between font-sans text-sm py-1.5 border-b border-border/50 last:border-none">
                  <span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`font-semibold ${daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-amber-600" : "text-orange-500"}`}>
                    {daysLeft <= 0 ? "⚠️ OVERDUE" : `${daysLeft} days left`}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Location Breakdown */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Top Cities</CardTitle></CardHeader>
        <CardContent>
          {topCities.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topCities.map(([city, count]) => (
                <div key={city} className="flex justify-between items-center font-sans text-sm">
                  <span>{city}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(count / orders.length) * 100}%` }} />
                    </div>
                    <span className="font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subtitle }: { icon: any; label: string; value: string; color?: string; subtitle?: string }) => (
  <Card>
    <CardContent className="p-3 md:p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className={`text-base md:text-xl font-display font-bold truncate ${color || ""}`}>{value}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground font-sans">{label}</p>
          {subtitle && <p className="text-[9px] text-muted-foreground/70 font-sans">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminAnalytics;
