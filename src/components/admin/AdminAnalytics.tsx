import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { Package, Monitor, PenTool, Clock } from "lucide-react";

type Order = {
  id: string;
  caricature_type: string;
  amount: number;
  status: string;
  city: string | null;
};

interface Props {
  orders: Order[];
}

const AdminAnalytics = ({ orders }: Props) => {
  const digital = orders.filter((o) => o.caricature_type === "digital");
  const physical = orders.filter((o) => o.caricature_type === "physical");
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const pending = orders.filter((o) => !["delivered", "completed"].includes(o.status));

  // Location breakdown
  const cityMap: Record<string, number> = {};
  orders.forEach((o) => {
    const city = o.city || "Digital (no city)";
    cityMap[city] = (cityMap[city] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Orders" value={String(orders.length)} />
        <StatCard icon={Monitor} label="Digital" value={String(digital.length)} />
        <StatCard icon={PenTool} label="Physical" value={String(physical.length)} />
        <StatCard icon={Clock} label="Pending" value={String(pending.length)} />
      </div>

      {/* Revenue */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Revenue</CardTitle></CardHeader>
        <CardContent>
          <p className="font-display text-3xl font-bold text-primary">{formatPrice(totalRevenue)}</p>
          <p className="text-sm text-muted-foreground font-sans mt-1">Total from {orders.length} orders</p>
        </CardContent>
      </Card>

      {/* Location Breakdown */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Location Breakdown</CardTitle></CardHeader>
        <CardContent>
          {topCities.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topCities.map(([city, count]) => (
                <div key={city} className="flex justify-between items-center font-sans text-sm">
                  <span>{city}</span>
                  <span className="font-medium">{count} order{count > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-display font-bold">{value}</p>
          <p className="text-xs text-muted-foreground font-sans">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminAnalytics;
