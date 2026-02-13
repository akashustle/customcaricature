import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { Package, PenTool, Clock, DollarSign, MapPin, AlertTriangle, Users, CreditCard } from "lucide-react";

type Order = {
  id: string;
  caricature_type: string;
  amount: number;
  status: string;
  city: string | null;
  payment_status?: string | null;
  created_at: string;
  priority?: number | null;
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
  const pending = orders.filter((o) => !["delivered", "completed"].includes(o.status));
  const paymentConfirmed = orders.filter((o) => (o as any).payment_status === "confirmed");
  const paymentPending = orders.filter((o) => (o as any).payment_status !== "confirmed");
  const delivered = orders.filter((o) => ["delivered", "completed"].includes(o.status));

  // Due date warnings
  const urgentOrders = pending.filter((o) => {
    const orderDate = new Date(o.created_at);
    const dueDate = new Date(orderDate);
    dueDate.setDate(dueDate.getDate() + 30);
    const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 10;
  });

  // Location breakdown
  const cityMap: Record<string, number> = {};
  orders.forEach((o) => {
    const city = o.city || "Unknown";
    cityMap[city] = (cityMap[city] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={String(customers.length)} />
        <StatCard icon={Package} label="Total Orders" value={String(orders.length)} />
        <StatCard icon={DollarSign} label="Revenue" value={formatPrice(totalRevenue)} />
        <StatCard icon={CreditCard} label="Payment Confirmed" value={String(paymentConfirmed.length)} color="text-green-600" />
        <StatCard icon={Clock} label="Payment Pending" value={String(paymentPending.length)} color="text-amber-600" />
        <StatCard icon={PenTool} label="Delivered" value={String(delivered.length)} />
      </div>

      {/* Urgent Orders Warning */}
      {urgentOrders.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Due Date Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-sans text-muted-foreground mb-2">
              {urgentOrders.length} order(s) are due within 10 days!
            </p>
            {urgentOrders.map((o) => {
              const dueDate = new Date(o.created_at);
              dueDate.setDate(dueDate.getDate() + 30);
              const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={o.id} className="flex justify-between font-sans text-sm py-1">
                  <span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-destructive font-semibold">{daysLeft} days left</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Payment Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground font-sans">Payment Confirmed</p>
            <p className="font-display text-2xl font-bold text-green-600">{paymentConfirmed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground font-sans">Payment Pending</p>
            <p className="font-display text-2xl font-bold text-amber-600">{paymentPending.length}</p>
          </CardContent>
        </Card>
      </div>

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

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className={`text-xl md:text-2xl font-display font-bold ${color || ""}`}>{value}</p>
          <p className="text-xs text-muted-foreground font-sans">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminAnalytics;
