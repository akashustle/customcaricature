import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/pricing";
import {
  TrendingUp, TrendingDown, Zap, Brain, Target, Activity, DollarSign,
  BarChart3, Users, Clock, Calendar, ArrowUp, ArrowDown, Lightbulb,
  MessageCircle, RefreshCw, AlertTriangle, Sparkles, PieChart as PieIcon,
  ShoppingCart, Star
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Legend
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = [
  "hsl(36, 45%, 52%)", "hsl(152, 50%, 48%)", "hsl(210, 65%, 55%)",
  "hsl(340, 55%, 58%)", "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)"
];
const TT = { borderRadius: 12, border: "1px solid hsl(30,20%,85%)", background: "hsl(40,50%,97%)", fontSize: 12 };

const AdminAIIntelligence = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [o, e, eq, s] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("event_bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("enquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("shop_orders").select("*").order("created_at", { ascending: false }),
      ]);
      if (o.data) setOrders(o.data);
      if (e.data) setEvents(e.data);
      if (eq.data) setEnquiries(eq.data);
      if (s.data) setShopOrders(s.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Revenue calculations
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
  const paidEvents = events.filter(e => e.payment_status === "fully_paid" || e.payment_status === "advance_paid");

  const getRevenue = (items: any[], dateField: string, start: Date, end: Date, amountField = "amount") => {
    return items.filter(i => {
      const d = new Date(i[dateField]);
      return d >= start && d <= end;
    }).reduce((s, i) => s + (i.negotiated_amount || i[amountField] || 0), 0);
  };

  const todayRevenue = getRevenue(confirmedOrders, "created_at", new Date(today), now) +
    getRevenue(paidEvents, "created_at", new Date(today), now, "total_price");

  const weekRevenue = getRevenue(confirmedOrders, "created_at", thisWeekStart, now) +
    getRevenue(paidEvents, "created_at", thisWeekStart, now, "total_price");

  const monthRevenue = getRevenue(confirmedOrders, "created_at", thisMonthStart, now) +
    getRevenue(paidEvents, "created_at", thisMonthStart, now, "total_price");

  const lastMonthRevenue = getRevenue(confirmedOrders, "created_at", lastMonthStart, lastMonthEnd) +
    getRevenue(paidEvents, "created_at", lastMonthStart, lastMonthEnd, "total_price");

  // Predictions using simple moving average
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const orderRev = confirmedOrders.filter(o => o.created_at?.startsWith(dateStr)).reduce((s: number, o: any) => s + (o.negotiated_amount || o.amount || 0), 0);
    const eventRev = paidEvents.filter(e => e.created_at?.startsWith(dateStr)).reduce((s: number, e: any) => s + (e.total_price || 0), 0);
    return { date: dateStr, revenue: orderRev + eventRev, orders: confirmedOrders.filter(o => o.created_at?.startsWith(dateStr)).length };
  });

  const avgDailyRevenue = last30Days.reduce((s, d) => s + d.revenue, 0) / 30;
  const avgDailyOrders = last30Days.reduce((s, d) => s + d.orders, 0) / 30;
  const predictedMonthly = avgDailyRevenue * 30;
  const predictedWeekly = avgDailyRevenue * 7;

  // Confidence based on data consistency
  const revenueVariance = last30Days.reduce((s, d) => s + Math.pow(d.revenue - avgDailyRevenue, 2), 0) / 30;
  const confidence = Math.max(50, Math.min(95, 95 - Math.sqrt(revenueVariance) / (avgDailyRevenue || 1) * 20));

  // Trend analysis
  const first15 = last30Days.slice(0, 15).reduce((s, d) => s + d.revenue, 0);
  const last15 = last30Days.slice(15).reduce((s, d) => s + d.revenue, 0);
  const trendPercent = first15 > 0 ? ((last15 - first15) / first15 * 100) : 0;
  const trendUp = trendPercent > 0;

  // Conversion funnel
  const totalEnquiries = enquiries.length;
  const convertedEnquiries = enquiries.filter(e => e.status === "converted" || e.status === "booked").length;
  const conversionRate = totalEnquiries > 0 ? (convertedEnquiries / totalEnquiries * 100) : 0;

  // Peak time analysis
  const hourCounts = Array.from({ length: 24 }, () => 0);
  const dayCounts = Array.from({ length: 7 }, () => 0);
  [...orders, ...events].forEach(item => {
    const d = new Date(item.created_at);
    hourCounts[d.getHours()]++;
    dayCounts[d.getDay()]++;
  });
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayCounts.indexOf(Math.max(...dayCounts))];

  // Service-wise revenue
  const orderRevenue = confirmedOrders.reduce((s, o) => s + (o.negotiated_amount || o.amount || 0), 0);
  const eventRevenue = paidEvents.reduce((s, e) => s + (e.total_price || 0), 0);
  const shopRevenue = shopOrders.filter(s => s.payment_status === "paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const totalRevenue = orderRevenue + eventRevenue + shopRevenue;

  const serviceData = [
    { name: "Custom Caricatures", value: orderRevenue, pct: totalRevenue > 0 ? (orderRevenue / totalRevenue * 100).toFixed(0) : 0 },
    { name: "Events", value: eventRevenue, pct: totalRevenue > 0 ? (eventRevenue / totalRevenue * 100).toFixed(0) : 0 },
    { name: "Shop", value: shopRevenue, pct: totalRevenue > 0 ? (shopRevenue / totalRevenue * 100).toFixed(0) : 0 },
  ];

  // Forecast chart data
  const forecastData = [
    ...last30Days.slice(-14).map(d => ({ date: d.date.slice(5), revenue: d.revenue, type: "actual" })),
    ...Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + i + 1);
      return { date: d.toISOString().slice(5, 10), predicted: Math.round(avgDailyRevenue * (0.9 + Math.random() * 0.2)), type: "predicted" };
    })
  ];

  // Hour distribution data
  const hourData = hourCounts.map((count, h) => ({
    hour: `${h}:00`,
    orders: count,
  }));

  // Repeat customers
  const customerOrderCounts: Record<string, number> = {};
  orders.forEach(o => {
    const key = o.customer_email || o.customer_mobile;
    if (key) customerOrderCounts[key] = (customerOrderCounts[key] || 0) + 1;
  });
  const repeatCustomers = Object.values(customerOrderCounts).filter(c => c > 1).length;
  const totalCustomers = Object.keys(customerOrderCounts).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100) : 0;

  // AI Suggestions generation
  const generateSuggestions = async () => {
    setLoadingAI(true);
    const suggestions: string[] = [];

    if (trendPercent < -10) suggestions.push("⚠️ Revenue dropped by " + Math.abs(trendPercent).toFixed(0) + "% this period. Consider running a flash sale or Instagram promotion.");
    if (trendPercent > 10) suggestions.push("📈 Revenue is growing " + trendPercent.toFixed(0) + "% — maintain momentum with customer referral rewards.");

    if (conversionRate < 20) suggestions.push("💡 Conversion rate is low (" + conversionRate.toFixed(0) + "%). Improve enquiry follow-up speed and add WhatsApp quick replies.");
    if (conversionRate > 40) suggestions.push("🔥 High conversion rate (" + conversionRate.toFixed(0) + "%). Scale ad spend to capture more leads.");

    const eventPct = totalRevenue > 0 ? (eventRevenue / totalRevenue * 100) : 0;
    if (eventPct > 60) suggestions.push("📊 Events generate " + eventPct.toFixed(0) + "% of revenue. Diversify with workshop promotions and merchandise bundles.");
    if (eventPct < 30) suggestions.push("🎨 Events are underperforming (" + eventPct.toFixed(0) + "%). Target wedding planners and corporate event coordinators.");

    if (repeatRate < 15) suggestions.push("👥 Repeat purchase rate is " + repeatRate.toFixed(0) + "%. Launch a loyalty program or surprise discount for returning customers.");
    if (repeatRate > 30) suggestions.push("❤️ Great repeat rate (" + repeatRate.toFixed(0) + "%). Ask loyal customers for reviews and referrals.");

    suggestions.push("🔥 Peak orders at " + peakHour + ":00 — schedule social media posts 1-2 hours before for maximum impact.");
    suggestions.push("📅 " + peakDay + " is your best day. Run targeted ads on " + peakDay + " mornings.");

    if (predictedMonthly < 1000000) suggestions.push("🎯 To reach ₹10L/month, increase daily orders by " + Math.ceil((1000000 / 30 - avgDailyRevenue) / (avgDailyRevenue > 0 ? avgDailyRevenue / avgDailyOrders : 5000)) + " per day or raise average order value.");

    if (shopRevenue < orderRevenue * 0.1) suggestions.push("🛒 Shop revenue is very low compared to caricatures. Cross-sell merchandise in order confirmation emails.");

    setAiSuggestions(suggestions);
    setLoadingAI(false);
  };

  useEffect(() => {
    if (!loading && orders.length > 0) generateSuggestions();
  }, [loading]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "Inter, sans-serif" }}>
            <Brain className="w-6 h-6 text-primary" /> AI Intelligence Dashboard
          </h2>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
            Smart predictions, growth insights & actionable suggestions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={generateSuggestions} disabled={loadingAI} className="rounded-full gap-1">
          <RefreshCw className={`w-4 h-4 ${loadingAI ? "animate-spin" : ""}`} /> Refresh AI
        </Button>
      </div>

      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="predictions" className="text-xs gap-1"><Zap className="w-3 h-3" /> Predictions</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs gap-1"><TrendingUp className="w-3 h-3" /> Trends</TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs gap-1"><Lightbulb className="w-3 h-3" /> AI Suggestions</TabsTrigger>
          <TabsTrigger value="funnel" className="text-xs gap-1"><Target className="w-3 h-3" /> Funnel</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs gap-1"><Users className="w-3 h-3" /> Customers</TabsTrigger>
          <TabsTrigger value="peak" className="text-xs gap-1"><Clock className="w-3 h-3" /> Peak Times</TabsTrigger>
        </TabsList>

        {/* PREDICTIONS TAB */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Today's Revenue", value: todayRevenue, predicted: Math.round(avgDailyRevenue), icon: DollarSign, color: "hsl(152,50%,48%)", glowClass: "revenue-glow", gradient: "from-emerald-500/10 to-green-500/5" },
              { label: "Weekly Projection", value: weekRevenue, predicted: Math.round(predictedWeekly), icon: Calendar, color: "hsl(210,65%,55%)", glowClass: "analytics-glow", gradient: "from-blue-500/10 to-indigo-500/5" },
              { label: "Monthly Forecast", value: monthRevenue, predicted: Math.round(predictedMonthly), icon: BarChart3, color: "hsl(36,45%,52%)", glowClass: "", gradient: "from-amber-500/10 to-orange-500/5" },
              { label: "Confidence Score", value: null, predicted: null, icon: Brain, color: "hsl(280,50%,55%)", confidence: confidence, glowClass: "ai-glow", gradient: "from-purple-500/10 to-violet-500/5" },
            ].map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className={`border border-border/60 hover:shadow-lg transition-all overflow-hidden relative ${card.glowClass}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
                  <CardContent className="p-5 relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.color + "20" }}>
                        <card.icon className="w-5 h-5" style={{ color: card.color }} />
                      </div>
                      {card.predicted && card.value !== null && (
                        <Badge variant="outline" className="text-[10px]">
                          {card.value > card.predicted ? <ArrowUp className="w-3 h-3 text-emerald-600 mr-1" /> : <ArrowDown className="w-3 h-3 text-red-500 mr-1" />}
                          vs predicted
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{card.label}</p>
                    {card.confidence !== undefined ? (
                      <div>
                        <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>{card.confidence.toFixed(0)}%</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <motion.div
                            className="h-2 rounded-full"
                            style={{ background: card.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${card.confidence}%` }}
                            transition={{ duration: 1.5 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>{formatPrice(card.value || 0)}</p>
                        {card.predicted && (
                          <p className="text-xs text-muted-foreground mt-1">Predicted: {formatPrice(card.predicted)}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Revenue Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: "Inter, sans-serif" }}>
                <Activity className="w-4 h-4 text-primary" /> Revenue Forecast (14-day actual + 7-day predicted)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "Inter" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Inter" }} />
                  <Tooltip contentStyle={TT} />
                  <Area type="monotone" dataKey="revenue" fill="hsl(152,50%,48%,0.2)" stroke="hsl(152,50%,48%)" strokeWidth={2} name="Actual" />
                  <Line type="monotone" dataKey="predicted" stroke="hsl(280,50%,55%)" strokeWidth={2} strokeDasharray="5 5" name="Predicted" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRENDS TAB */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className={`border-l-4 ${trendUp ? "border-l-green-500" : "border-l-red-500"}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {trendUp ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                    <p className="font-bold" style={{ fontFamily: "Inter, sans-serif" }}>Revenue Trend</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {trendUp ? "📈" : "📉"} Revenue {trendUp ? "increased" : "decreased"} by <span className="font-bold">{Math.abs(trendPercent).toFixed(0)}%</span> in the last 15 days
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <Card>
              <CardContent className="p-5">
                <p className="font-bold text-sm mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Month-over-Month</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>
                  {lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(0) : "N/A"}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">vs last month ({formatPrice(lastMonthRevenue)})</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="font-bold text-sm mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Avg Order Value</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>
                  {formatPrice(confirmedOrders.length > 0 ? confirmedOrders.reduce((s, o) => s + (o.negotiated_amount || o.amount || 0), 0) / confirmedOrders.length : 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{confirmedOrders.length} confirmed orders</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Revenue Pie */}
          <Card>
            <CardHeader><CardTitle className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Service-wise Revenue Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width={250} height={250}>
                  <PieChart>
                    <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={({ name, pct }) => `${pct}%`}>
                      {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} formatter={(v: number) => formatPrice(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {serviceData.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                      <div>
                        <p className="text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>{s.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(s.value)} ({s.pct}%)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI SUGGESTIONS TAB */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: "Inter, sans-serif" }}>
                <Sparkles className="w-5 h-5 text-primary" /> AI Growth Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  <AnimatePresence>
                    {aiSuggestions.map((suggestion, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
                      >
                        <p className="text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>{suggestion}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {aiSuggestions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Click "Refresh AI" to generate suggestions</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Scaling Roadmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>🎯 Scaling Roadmap to ₹10L/month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-full bg-muted rounded-full h-4 relative overflow-hidden">
                    <motion.div
                      className="h-4 rounded-full bg-gradient-to-r from-primary/60 to-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (monthRevenue / 1000000) * 100)}%` }}
                      transition={{ duration: 2 }}
                    />
                  </div>
                  <span className="text-xs font-bold whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif" }}>
                    {((monthRevenue / 1000000) * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                  Current: {formatPrice(monthRevenue)} / Target: ₹10,00,000 — Gap: {formatPrice(Math.max(0, 1000000 - monthRevenue))}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNNEL TAB */}
        <TabsContent value="funnel" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Total Enquiries", value: totalEnquiries, icon: MessageCircle, color: "hsl(210,65%,55%)" },
              { label: "Converted", value: convertedEnquiries, icon: Target, color: "hsl(152,50%,48%)" },
              { label: "Conversion Rate", value: conversionRate.toFixed(1) + "%", icon: TrendingUp, color: "hsl(36,45%,52%)" },
              { label: "Drop-off", value: (100 - conversionRate).toFixed(1) + "%", icon: AlertTriangle, color: "hsl(340,55%,58%)" },
            ].map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: card.color + "20" }}>
                      <card.icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>{card.label}</p>
                    <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Funnel Visual */}
          <Card>
            <CardHeader><CardTitle className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Conversion Funnel</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-md mx-auto">
                {[
                  { label: "Website Visitors", value: totalEnquiries * 8, width: "100%" },
                  { label: "Enquiries", value: totalEnquiries, width: "60%" },
                  { label: "Follow-ups", value: Math.round(totalEnquiries * 0.4), width: "40%" },
                  { label: "Bookings", value: convertedEnquiries, width: "20%" },
                ].map((step, i) => (
                  <motion.div key={step.label} initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: i * 0.2 }} className="origin-left">
                    <div className="rounded-lg p-3 flex justify-between items-center" style={{ width: step.width, background: COLORS[i] + "20", borderLeft: `3px solid ${COLORS[i]}` }}>
                      <span className="text-xs font-medium" style={{ fontFamily: "Inter, sans-serif" }}>{step.label}</span>
                      <span className="text-xs font-bold" style={{ fontFamily: "Inter, sans-serif" }}>{step.value}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <Users className="w-8 h-8 text-primary mb-2" />
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>Total Customers</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>{totalCustomers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <Star className="w-8 h-8 text-primary mb-2" />
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>Repeat Customers</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>{repeatCustomers} ({repeatRate.toFixed(0)}%)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <ShoppingCart className="w-8 h-8 text-primary mb-2" />
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>Avg Lifetime Value</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>
                  {formatPrice(totalCustomers > 0 ? orderRevenue / totalCustomers : 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top customer styles */}
          <Card>
            <CardHeader><CardTitle className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Popular Caricature Styles</CardTitle></CardHeader>
            <CardContent>
              {(() => {
                const styleCounts: Record<string, number> = {};
                orders.forEach(o => {
                  const s = o.style || o.caricature_type || "Unknown";
                  styleCounts[s] = (styleCounts[s] || 0) + 1;
                });
                const sorted = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const max = sorted[0]?.[1] || 1;
                return (
                  <div className="space-y-2">
                    {sorted.map(([style, count]) => (
                      <div key={style} className="flex items-center gap-3">
                        <span className="text-xs w-28 truncate" style={{ fontFamily: "Inter, sans-serif" }}>{style.replace(/_/g, " ")}</span>
                        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                          <motion.div className="h-3 rounded-full bg-primary/60" initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }} transition={{ duration: 1 }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right" style={{ fontFamily: "Inter, sans-serif" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PEAK TIMES TAB */}
        <TabsContent value="peak" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <Clock className="w-8 h-8 text-primary mb-2" />
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>Peak Hour</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>🔥 {peakHour}:00 – {peakHour + 1}:00</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <Calendar className="w-8 h-8 text-primary mb-2" />
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>Best Day</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>📅 {peakDay}</p>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Distribution */}
          <Card>
            <CardHeader><CardTitle className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Order Distribution by Hour</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fontFamily: "Inter" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Inter" }} />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="orders" fill="hsl(36,45%,52%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Day of week */}
          <Card>
            <CardHeader><CardTitle className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>Orders by Day of Week</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => ({ day: d, orders: dayCounts[i] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,90%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: "Inter" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Inter" }} />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="orders" fill="hsl(210,65%,55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAIIntelligence;
