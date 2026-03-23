import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, DollarSign, TrendingUp, Clock, Star, Zap, ShoppingBag, MessageCircle, Globe, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { formatPrice } from "@/lib/pricing";

const AdminDashboardWidgets = () => {
  const [stats, setStats] = useState({
    totalOrders: 0, pendingOrders: 0, completedOrders: 0,
    totalEvents: 0, upcomingEvents: 0,
    totalCustomers: 0, newCustomersToday: 0,
    totalRevenue: 0, pendingRevenue: 0,
    totalEnquiries: 0, pendingEnquiries: 0,
    workshopUsers: 0,
    activeSessions: 0,
    todayOrders: 0,
    todayRevenue: 0,
    weekRevenue: 0,
  });

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [orders, events, customers, enquiries, workshopUsers, sessions] = await Promise.all([
      supabase.from("orders").select("id, status, payment_status, amount, created_at"),
      supabase.from("event_bookings").select("id, status, payment_status, total_price, event_date"),
      supabase.from("profiles").select("id, created_at"),
      supabase.from("enquiries").select("id, status"),
      supabase.from("workshop_users" as any).select("id"),
      supabase.from("admin_sessions").select("id").eq("is_active", true),
    ]);

    const orderData = orders.data || [];
    const eventData = events.data || [];
    const customerData = customers.data || [];
    const enquiryData = (enquiries.data || []) as any[];
    const wsUsers = (workshopUsers.data || []) as any[];

    const confirmedOrders = orderData.filter((o: any) => o.payment_status === "confirmed");
    const confirmedEvents = eventData.filter((e: any) => ["confirmed", "fully_paid"].includes(e.payment_status));
    const orderRev = confirmedOrders.reduce((s: number, o: any) => s + o.amount, 0);
    const eventRev = confirmedEvents.reduce((s: number, e: any) => s + (e as any).total_price, 0);
    const pendingOrderRev = orderData.filter((o: any) => o.payment_status !== "confirmed").reduce((s: number, o: any) => s + o.amount, 0);
    const pendingEventRev = eventData.filter((e: any) => !["confirmed", "fully_paid"].includes(e.payment_status)).reduce((s: number, e: any) => s + (e as any).total_price, 0);

    const todayConfirmed = confirmedOrders.filter((o: any) => o.created_at?.startsWith(today));
    const todayRev = todayConfirmed.reduce((s: number, o: any) => s + o.amount, 0);
    const weekConfirmed = confirmedOrders.filter((o: any) => new Date(o.created_at) >= weekAgo);
    const weekRev = weekConfirmed.reduce((s: number, o: any) => s + o.amount, 0);

    setStats({
      totalOrders: orderData.length,
      pendingOrders: orderData.filter((o: any) => o.status === "new" || o.status === "in_progress").length,
      completedOrders: orderData.filter((o: any) => o.status === "delivered").length,
      totalEvents: eventData.length,
      upcomingEvents: eventData.filter((e: any) => e.event_date >= today && e.status !== "cancelled").length,
      totalCustomers: customerData.length,
      newCustomersToday: customerData.filter((c: any) => c.created_at?.startsWith(today)).length,
      totalRevenue: orderRev + eventRev,
      pendingRevenue: pendingOrderRev + pendingEventRev,
      totalEnquiries: enquiryData.length,
      pendingEnquiries: enquiryData.filter((e: any) => e.status === "new").length,
      workshopUsers: wsUsers.length,
      activeSessions: (sessions.data || []).length,
      todayOrders: orderData.filter((o: any) => o.created_at?.startsWith(today)).length,
      todayRevenue: todayRev,
      weekRevenue: weekRev,
    });
  };

  useEffect(() => {
    fetchStats();
    const ch = supabase.channel("admin-widgets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const widgets: {
    icon: any; label: string; value: string | number;
    gradient: string; iconGradient: string; glowClass: string;
    trend?: { value: string; positive: boolean };
  }[] = [
    {
      icon: DollarSign, label: "Total Revenue", value: formatPrice(stats.totalRevenue),
      gradient: "from-emerald-500/10 to-emerald-500/5", iconGradient: "from-emerald-500 to-green-400",
      glowClass: "revenue-glow",
      trend: stats.weekRevenue > 0 ? { value: formatPrice(stats.weekRevenue) + " this week", positive: true } : undefined,
    },
    {
      icon: TrendingUp, label: "Pending Revenue", value: formatPrice(stats.pendingRevenue),
      gradient: "from-amber-500/10 to-orange-500/5", iconGradient: "from-amber-500 to-orange-400",
      glowClass: "alert-glow",
      trend: stats.pendingRevenue > 0 ? { value: "Collect now", positive: false } : undefined,
    },
    {
      icon: Package, label: "Total Orders", value: stats.totalOrders,
      gradient: "from-blue-500/10 to-indigo-500/5", iconGradient: "from-blue-500 to-indigo-400",
      glowClass: "analytics-glow",
    },
    {
      icon: Zap, label: "Today's Orders", value: stats.todayOrders,
      gradient: "from-violet-500/10 to-purple-500/5", iconGradient: "from-violet-500 to-purple-400",
      glowClass: "ai-glow",
      trend: stats.todayRevenue > 0 ? { value: formatPrice(stats.todayRevenue), positive: true } : undefined,
    },
    {
      icon: Clock, label: "Pending", value: stats.pendingOrders,
      gradient: "from-orange-500/10 to-red-500/5", iconGradient: "from-orange-500 to-red-400",
      glowClass: "alert-glow",
    },
    {
      icon: Star, label: "Delivered", value: stats.completedOrders,
      gradient: "from-green-500/10 to-emerald-500/5", iconGradient: "from-green-500 to-emerald-400",
      glowClass: "revenue-glow",
    },
    {
      icon: Calendar, label: "Total Events", value: stats.totalEvents,
      gradient: "from-indigo-500/10 to-blue-500/5", iconGradient: "from-indigo-500 to-blue-400",
      glowClass: "analytics-glow",
    },
    {
      icon: Globe, label: "Upcoming", value: stats.upcomingEvents,
      gradient: "from-cyan-500/10 to-teal-500/5", iconGradient: "from-cyan-500 to-teal-400",
      glowClass: "analytics-glow",
    },
    {
      icon: Users, label: "Customers", value: stats.totalCustomers,
      gradient: "from-pink-500/10 to-rose-500/5", iconGradient: "from-pink-500 to-rose-400",
      glowClass: "",
      trend: stats.newCustomersToday > 0 ? { value: `+${stats.newCustomersToday} today`, positive: true } : undefined,
    },
    {
      icon: MessageCircle, label: "Enquiries", value: `${stats.pendingEnquiries} / ${stats.totalEnquiries}`,
      gradient: "from-teal-500/10 to-cyan-500/5", iconGradient: "from-teal-500 to-cyan-400",
      glowClass: "",
    },
    {
      icon: ShoppingBag, label: "Workshop", value: stats.workshopUsers,
      gradient: "from-purple-500/10 to-violet-500/5", iconGradient: "from-purple-500 to-violet-400",
      glowClass: "ai-glow",
    },
    {
      icon: Activity, label: "Sessions", value: stats.activeSessions,
      gradient: "from-red-500/10 to-rose-500/5", iconGradient: "from-red-500 to-rose-400",
      glowClass: stats.activeSessions > 3 ? "alert-glow" : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      {widgets.map((w, i) => (
        <motion.div
          key={w.label}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.03, duration: 0.35, type: "spring", stiffness: 300, damping: 25 }}
          whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.2 } }}
        >
          <Card className={`border border-border/60 hover:border-border transition-all overflow-hidden relative ${w.glowClass}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${w.gradient} pointer-events-none`} />
            <CardContent className="p-3 relative">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${w.iconGradient} flex items-center justify-center shadow-md`}>
                  <w.icon className="w-4 h-4 text-white" />
                </div>
                {w.trend && (
                  <div className={`flex items-center gap-0.5 text-[9px] font-semibold ${w.trend.positive ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {w.trend.positive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">{w.value}</p>
              <p className="text-[10px] text-muted-foreground font-sans mt-0.5">{w.label}</p>
              {w.trend && (
                <p className={`text-[8px] mt-1 font-medium ${w.trend.positive ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {w.trend.value}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default AdminDashboardWidgets;
