import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, TrendingUp, Flame, Trophy, Zap, Calendar, Clock,
  ArrowUpRight, DollarSign, Star, Award, ChevronRight, BarChart3, Edit2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DEFAULT_TARGET = 1000000; // ₹10L

const AdminRevenueTargetTracker = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [drillDown, setDrillDown] = useState<string | null>(null);
  const [monthlyTarget, setMonthlyTarget] = useState(DEFAULT_TARGET);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  useEffect(() => {
    fetchData();
    fetchTarget();
    const ch = supabase.channel("target-tracker-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings" }, fetchTarget)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchTarget = async () => {
    const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "revenue_target").maybeSingle();
    if (data?.value && (data.value as any).monthly_target) {
      setMonthlyTarget((data.value as any).monthly_target);
    }
  };

  const saveTarget = async () => {
    const val = parseInt(targetInput);
    if (!val || val < 10000) return;
    await supabase.from("admin_site_settings").upsert({ id: "revenue_target", value: { monthly_target: val } as any });
    setMonthlyTarget(val);
    setEditingTarget(false);
    toast({ title: "Revenue target updated! 🎯" });
  };

  const fetchData = async () => {
    const [o, e, s] = await Promise.all([
      supabase.from("orders").select("id, amount, negotiated_amount, payment_status, created_at, customer_name, caricature_type"),
      supabase.from("event_bookings").select("id, total_price, payment_status, created_at, client_name, city, negotiated, negotiated_total"),
      supabase.from("shop_orders" as any).select("id, total_amount, payment_status, created_at"),
    ]);
    setOrders(o.data || []);
    setEvents(e.data || []);
    setShopOrders((s.data || []) as any[]);
  };

  const now = new Date();
  const MONTHLY_TARGET = monthlyTarget;
  const DAILY_TARGET = Math.round(MONTHLY_TARGET / 30);
  const WEEKLY_TARGET = Math.round(MONTHLY_TARGET / 4.3);

  const todayStr = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());

  const getRevenue = (items: any[], amtField: string, start: Date, end: Date) =>
    items.filter(i => {
      const d = new Date(i.created_at);
      return d >= start && d <= end;
    }).reduce((s, i) => s + (i.negotiated_amount || i.negotiated_total || i[amtField] || 0), 0);

  const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
  const paidEvents = events.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status));
  const paidShop = shopOrders.filter((s: any) => s.payment_status === "paid");

  const todayRevenue = getRevenue(confirmedOrders, "amount", new Date(todayStr), now) +
    getRevenue(paidEvents, "total_price", new Date(todayStr), now) +
    getRevenue(paidShop, "total_amount", new Date(todayStr), now);

  const weekRevenue = getRevenue(confirmedOrders, "amount", weekStart, now) +
    getRevenue(paidEvents, "total_price", weekStart, now) +
    getRevenue(paidShop, "total_amount", weekStart, now);

  const monthRevenue = getRevenue(confirmedOrders, "amount", monthStart, now) +
    getRevenue(paidEvents, "total_price", monthStart, now) +
    getRevenue(paidShop, "total_amount", monthStart, now);

  const monthPct = Math.min(100, (monthRevenue / MONTHLY_TARGET) * 100);
  const weekPct = Math.min(100, (weekRevenue / WEEKLY_TARGET) * 100);
  const dailyPct = Math.min(100, (todayRevenue / DAILY_TARGET) * 100);
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const remainingAmount = Math.max(0, MONTHLY_TARGET - monthRevenue);
  const requiredDaily = daysLeft > 0 ? Math.round(remainingAmount / daysLeft) : 0;

  // Daily revenue for last 30 days
  const dailyData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const ds = d.toISOString().slice(0, 10);
      const oRev = confirmedOrders.filter(o => o.created_at?.startsWith(ds)).reduce((s: number, o: any) => s + (o.negotiated_amount || o.amount || 0), 0);
      const eRev = paidEvents.filter(e => e.created_at?.startsWith(ds)).reduce((s: number, e: any) => s + (e.negotiated_total || e.total_price || 0), 0);
      const sRev = paidShop.filter((x: any) => x.created_at?.startsWith(ds)).reduce((s: number, x: any) => s + (x.total_amount || 0), 0);
      const total = oRev + eRev + sRev;
      return { date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), revenue: total, target: DAILY_TARGET, hit: total >= DAILY_TARGET };
    });
  }, [confirmedOrders, paidEvents, paidShop]);

  // Calculate streak
  useEffect(() => {
    let s = 0;
    for (let i = dailyData.length - 1; i >= 0; i--) {
      if (dailyData[i].hit) s++;
      else break;
    }
    setStreak(s);
  }, [dailyData]);

  // Drill-down data
  const getDrillItems = () => {
    if (drillDown === "today") {
      const items = [
        ...confirmedOrders.filter(o => o.created_at?.startsWith(todayStr)).map(o => ({
          name: o.customer_name, amount: o.negotiated_amount || o.amount, type: "Order", time: o.created_at,
        })),
        ...paidEvents.filter(e => e.created_at?.startsWith(todayStr)).map(e => ({
          name: e.client_name, amount: e.negotiated_total || e.total_price, type: "Event", time: e.created_at,
        })),
      ];
      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }
    if (drillDown === "month") {
      const items = [
        ...confirmedOrders.filter(o => new Date(o.created_at) >= monthStart).map(o => ({
          name: o.customer_name, amount: o.negotiated_amount || o.amount, type: "Order", time: o.created_at,
        })),
        ...paidEvents.filter(e => new Date(e.created_at) >= monthStart).map(e => ({
          name: e.client_name, amount: e.negotiated_total || e.total_price, type: "Event", time: e.created_at,
        })),
      ];
      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }
    return [];
  };

  const targetCards = [
    {
      label: "Today", value: todayRevenue, target: DAILY_TARGET, pct: dailyPct,
      gradient: "from-emerald-500 to-teal-400", glow: dailyPct >= 100 ? "shadow-emerald-500/30 shadow-lg" : "",
      icon: Zap, onClick: () => setDrillDown("today"),
    },
    {
      label: "This Week", value: weekRevenue, target: WEEKLY_TARGET, pct: weekPct,
      gradient: "from-blue-500 to-indigo-400", glow: weekPct >= 100 ? "shadow-blue-500/30 shadow-lg" : "",
      icon: Calendar, onClick: () => setDrillDown("week"),
    },
    {
      label: "This Month", value: monthRevenue, target: MONTHLY_TARGET, pct: monthPct,
      gradient: "from-violet-500 to-purple-400", glow: monthPct >= 100 ? "shadow-violet-500/30 shadow-lg" : "",
      icon: Target, onClick: () => setDrillDown("month"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Streak */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "Inter, sans-serif" }}>
            <Target className="w-6 h-6 text-primary" /> {formatPrice(MONTHLY_TARGET)}/Month Revenue Engine
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Track daily, weekly & monthly targets in real-time
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={() => { setTargetInput(String(MONTHLY_TARGET)); setEditingTarget(true); }}>
              <Edit2 className="w-3 h-3 mr-1" /> Set Target
            </Button>
          </p>
          {editingTarget && (
            <div className="flex items-center gap-2 mt-2">
              <Input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="Enter monthly target (₹)" className="h-8 w-48 text-sm" />
              <Button size="sm" className="h-8 text-xs" onClick={saveTarget}>Save</Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingTarget(false)}>Cancel</Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold"
            >
              <Flame className="w-4 h-4" /> {streak} Day Streak 🔥
            </motion.div>
          )}
          <Badge variant="outline" className="text-xs gap-1 py-1">
            <Clock className="w-3 h-3" /> {daysLeft} days left
          </Badge>
        </div>
      </div>

      {/* Main Target Bar */}
      <Card className={`border-0 overflow-hidden relative ${monthPct >= 100 ? 'ring-2 ring-emerald-400/50' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5" />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Target Progress</p>
              <div className="flex items-baseline gap-2 mt-1">
                <motion.span
                  className="text-4xl font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {formatPrice(monthRevenue)}
                </motion.span>
                <span className="text-lg text-muted-foreground font-medium">/ {formatPrice(MONTHLY_TARGET)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-2xl font-bold ${remainingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {remainingAmount > 0 ? formatPrice(remainingAmount) : '🎉 Achieved!'}
              </p>
              {remainingAmount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Need {formatPrice(requiredDaily)}/day</p>
              )}
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="w-full bg-muted/60 rounded-full h-6 overflow-hidden relative">
            <motion.div
              className="h-6 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 relative overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: `${monthPct}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground drop-shadow-sm">{monthPct.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {targetCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <Card
              className={`cursor-pointer border-0 backdrop-blur-sm ${card.glow} hover:shadow-xl transition-all duration-300`}
              onClick={card.onClick}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge className={`border-0 text-xs ${card.pct >= 100 ? 'bg-emerald-100 text-emerald-700' : card.pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {card.pct >= 100 ? '✅ Hit!' : `${card.pct.toFixed(0)}%`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className="text-xl font-bold">{formatPrice(card.value)}</p>
                <p className="text-[10px] text-muted-foreground">Target: {formatPrice(card.target)}</p>
                <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden">
                  <motion.div
                    className={`h-2 rounded-full bg-gradient-to-r ${card.gradient}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${card.pct}%` }}
                    transition={{ duration: 1.5, delay: 0.3 + i * 0.1 }}
                  />
                </div>
                <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
                  <span>Details</span> <ChevronRight className="w-3 h-3 ml-0.5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Daily Revenue Chart with Target Line */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Daily Revenue vs Target (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,92%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: "Inter" }} interval={4} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Inter" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(30,20%,88%)", background: "hsl(30,40%,99%)", fontSize: 12 }}
                formatter={(v: number) => [formatPrice(v), "Revenue"]}
              />
              <ReferenceLine y={DAILY_TARGET} stroke="hsl(0,65%,55%)" strokeDasharray="5 5" label={{ value: "Target", position: "right", fontSize: 10, fill: "hsl(0,65%,55%)" }} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {dailyData.map((entry, i) => (
                  <Cell key={i} fill={entry.hit ? "hsl(152,50%,48%)" : "hsl(210,65%,55%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gamification */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Trophy, label: "Monthly Best", value: formatPrice(Math.max(...dailyData.map(d => d.revenue))), bg: "bg-amber-50", color: "text-amber-600" },
          { icon: Star, label: "Days Target Hit", value: `${dailyData.filter(d => d.hit).length}/30`, bg: "bg-emerald-50", color: "text-emerald-600" },
          { icon: TrendingUp, label: "Avg Daily", value: formatPrice(Math.round(dailyData.reduce((s, d) => s + d.revenue, 0) / 30)), bg: "bg-blue-50", color: "text-blue-600" },
          { icon: Award, label: "Completion Rate", value: `${monthPct.toFixed(0)}%`, bg: "bg-violet-50", color: "text-violet-600" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.08 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDown} onOpenChange={(open) => !open && setDrillDown(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {drillDown === "today" ? "Today's" : drillDown === "week" ? "This Week's" : "This Month's"} Revenue Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {getDrillItems().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No confirmed payments in this period</p>
            ) : (
              getDrillItems().map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{formatPrice(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRevenueTargetTracker;
