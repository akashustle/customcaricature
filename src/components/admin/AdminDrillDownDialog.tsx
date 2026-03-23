import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/pricing";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

interface DrillDownDialogProps {
  open: boolean;
  onClose: () => void;
  metric: string;
  title: string;
}

const COLORS = ["hsl(152,50%,48%)", "hsl(210,65%,55%)", "hsl(280,50%,55%)", "hsl(36,45%,52%)", "hsl(340,55%,58%)", "hsl(38,92%,55%)"];
const TT = { borderRadius: 12, border: "1px solid hsl(30,20%,88%)", background: "hsl(30,40%,99%)", fontSize: 12 };

const AdminDrillDownDialog = ({ open, onClose, metric, title }: DrillDownDialogProps) => {
  const [data, setData] = useState<any>({ items: [], chart: [], summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) loadData();
  }, [open, metric]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (metric === "revenue" || metric === "pending") {
        const [o, e] = await Promise.all([
          supabase.from("orders").select("id, customer_name, amount, negotiated_amount, payment_status, created_at, caricature_type, city"),
          supabase.from("event_bookings").select("id, client_name, total_price, payment_status, created_at, city, negotiated, negotiated_total"),
        ]);
        const orders = o.data || [];
        const events = e.data || [];

        const isPending = metric === "pending";
        const filteredOrders = isPending
          ? orders.filter((x: any) => x.payment_status !== "confirmed")
          : orders.filter((x: any) => x.payment_status === "confirmed");
        const filteredEvents = isPending
          ? events.filter((x: any) => !["confirmed", "fully_paid"].includes(x.payment_status))
          : events.filter((x: any) => ["confirmed", "fully_paid"].includes(x.payment_status));

        const items = [
          ...filteredOrders.map((x: any) => ({
            name: x.customer_name, amount: x.negotiated_amount || x.amount,
            type: "Order", status: x.payment_status, date: x.created_at, city: x.city,
          })),
          ...filteredEvents.map((x: any) => ({
            name: x.client_name, amount: x.negotiated_total || x.total_price,
            type: "Event", status: x.payment_status, date: x.created_at, city: x.city,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // City-wise breakdown
        const cityMap: Record<string, number> = {};
        items.forEach(i => {
          const c = i.city || "Unknown";
          cityMap[c] = (cityMap[c] || 0) + i.amount;
        });
        const chart = Object.entries(cityMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, value]) => ({ name, value }));

        // Monthly breakdown
        const monthMap: Record<string, number> = {};
        items.forEach(i => {
          const m = i.date?.substring(0, 7);
          if (m) monthMap[m] = (monthMap[m] || 0) + i.amount;
        });
        const monthChart = Object.entries(monthMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([k, v]) => ({ month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), revenue: v }));

        setData({
          items: items.slice(0, 50),
          chart,
          monthChart,
          summary: {
            total: items.reduce((s, i) => s + i.amount, 0),
            count: items.length,
            orderTotal: filteredOrders.reduce((s: number, x: any) => s + (x.negotiated_amount || x.amount), 0),
            eventTotal: filteredEvents.reduce((s: number, x: any) => s + (x.negotiated_total || x.total_price), 0),
          }
        });
      } else if (metric === "orders" || metric === "events") {
        const table = metric === "orders" ? "orders" : "event_bookings";
        const { data: items } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100);
        const statusMap: Record<string, number> = {};
        (items || []).forEach((i: any) => {
          const s = i.status || "unknown";
          statusMap[s] = (statusMap[s] || 0) + 1;
        });
        const chart = Object.entries(statusMap).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

        setData({
          items: (items || []).slice(0, 50).map((i: any) => ({
            name: i.customer_name || i.client_name,
            amount: i.negotiated_amount || i.amount || i.total_price,
            type: i.status, status: i.payment_status, date: i.created_at, city: i.city,
          })),
          chart,
          summary: { total: (items || []).length, statusBreakdown: statusMap }
        });
      } else if (metric === "customers") {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, city, state, created_at").order("created_at", { ascending: false }).limit(100);
        const cityMap: Record<string, number> = {};
        (profiles || []).forEach((p: any) => {
          const c = p.city || p.state || "Unknown";
          cityMap[c] = (cityMap[c] || 0) + 1;
        });
        const chart = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
        setData({
          items: (profiles || []).map((p: any) => ({
            name: p.full_name, amount: 0, type: p.email,
            status: "active", date: p.created_at, city: p.city || p.state,
          })),
          chart,
          summary: { total: (profiles || []).length }
        });
      } else if (metric === "enquiries") {
        const { data: enquiries } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(100);
        const statusMap: Record<string, number> = {};
        (enquiries || []).forEach((e: any) => {
          statusMap[e.status] = (statusMap[e.status] || 0) + 1;
        });
        const chart = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
        setData({
          items: (enquiries || []).slice(0, 50).map((e: any) => ({
            name: e.name, amount: e.estimated_price || 0, type: e.enquiry_type,
            status: e.status, date: e.created_at, city: e.city,
          })),
          chart,
          summary: { total: (enquiries || []).length, converted: (enquiries || []).filter((e: any) => e.status === "converted").length }
        });
      }
    } catch (err) {
      console.error("DrillDown error:", err);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{title} — Detailed Breakdown</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="list" className="flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-3 h-9">
              <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
              <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
              {data.monthChart && <TabsTrigger value="trend" className="text-xs">Trend</TabsTrigger>}
            </TabsList>

            <TabsContent value="list" className="flex-1 overflow-hidden mt-3">
              {/* Summary */}
              {data.summary && (
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  {data.summary.total !== undefined && (
                    <Badge variant="outline" className="text-xs">Total: {typeof data.summary.total === "number" && data.summary.total > 10000 ? formatPrice(data.summary.total) : data.summary.total}</Badge>
                  )}
                  {data.summary.count !== undefined && (
                    <Badge variant="outline" className="text-xs">{data.summary.count} items</Badge>
                  )}
                  {data.summary.orderTotal !== undefined && (
                    <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">Orders: {formatPrice(data.summary.orderTotal)}</Badge>
                  )}
                  {data.summary.eventTotal !== undefined && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">Events: {formatPrice(data.summary.eventTotal)}</Badge>
                  )}
                </div>
              )}
              <ScrollArea className="h-[400px]">
                <div className="space-y-1.5">
                  {data.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] px-1.5">{item.type}</Badge>
                          {item.city && <span className="text-[10px] text-muted-foreground">{item.city}</span>}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {item.amount > 0 && <p className="text-sm font-bold text-emerald-600">{formatPrice(item.amount)}</p>}
                        {item.status && (
                          <Badge className="text-[9px] mt-0.5 border-0 bg-muted">{item.status?.replace(/_/g, " ")}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {data.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12">No data available</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chart" className="mt-3">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={data.chart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(30,10%,75%)" }}>
                    {data.chart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={(v: number) => metric === "customers" || metric === "enquiries" ? v : formatPrice(v)} />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>

            {data.monthChart && (
              <TabsContent value="trend" className="mt-3">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.monthChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,92%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TT} formatter={(v: number) => formatPrice(v)} />
                    <Bar dataKey="revenue" fill="hsl(210,65%,55%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminDrillDownDialog;
