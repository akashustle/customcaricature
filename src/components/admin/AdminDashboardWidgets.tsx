import { useState, useEffect } from "react";
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
    gradient: string; iconBg: string; borderAccent: string;
    trend?: { value: string; positive: boolean };
  }[] = [
    {
      icon: DollarSign, label: "Total Revenue", value: formatPrice(stats.totalRevenue),
      gradient: "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/5",
      iconBg: "from-emerald-500 to-green-500", borderAccent: "border-l-emerald-500",
      trend: stats.weekRevenue > 0 ? { value: formatPrice(stats.weekRevenue) + " this week", positive: true } : undefined,
    },
    {
      icon: TrendingUp, label: "Pending Revenue", value: formatPrice(stats.pendingRevenue),
      gradient: "from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5",
      iconBg: "from-amber-500 to-orange-500", borderAccent: "border-l-amber-500",
      trend: stats.pendingRevenue > 0 ? { value: "Collect now", positive: false } : undefined,
    },
    {
      icon: Package, label: "Total Orders", value: stats.totalOrders,
      gradient: "from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/5",
      iconBg: "from-blue-500 to-indigo-500", borderAccent: "border-l-blue-500",
    },
    {
      icon: Zap, label: "Today's Orders", value: stats.todayOrders,
      gradient: "from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/5",
      iconBg: "from-violet-500 to-purple-500", borderAccent: "border-l-violet-500",
      trend: stats.todayRevenue > 0 ? { value: formatPrice(stats.todayRevenue), positive: true } : undefined,
    },
    {
      icon: Clock, label: "Pending", value: stats.pendingOrders,
      gradient: "from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/5",
      iconBg: "from-orange-500 to-red-500", borderAccent: "border-l-orange-500",
    },
    {
      icon: Star, label: "Delivered", value: stats.completedOrders,
      gradient: "from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/5",
      iconBg: "from-green-500 to-emerald-500", borderAccent: "border-l-green-500",
    },
    {
      icon: Calendar, label: "Total Events", value: stats.totalEvents,
      gradient: "from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/5",
      iconBg: "from-indigo-500 to-blue-500", borderAccent: "border-l-indigo-500",
    },
    {
      icon: Globe, label: "Upcoming", value: stats.upcomingEvents,
      gradient: "from-cyan-50 to-teal-50 dark:from-cyan-500/10 dark:to-teal-500/5",
      iconBg: "from-cyan-500 to-teal-500", borderAccent: "border-l-cyan-500",
    },
    {
      icon: Users, label: "Customers", value: stats.totalCustomers,
      gradient: "from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/5",
      iconBg: "from-pink-500 to-rose-500", borderAccent: "border-l-pink-500",
      trend: stats.newCustomersToday > 0 ? { value: `+${stats.newCustomersToday} today`, positive: true } : undefined,
    },
    {
      icon: MessageCircle, label: "Enquiries", value: `${stats.pendingEnquiries} / ${stats.totalEnquiries}`,
      gradient: "from-teal-50 to-cyan-50 dark:from-teal-500/10 dark:to-cyan-500/5",
      iconBg: "from-teal-500 to-cyan-500", borderAccent: "border-l-teal-500",
    },
    {
      icon: ShoppingBag, label: "Workshop", value: stats.workshopUsers,
      gradient: "from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/5",
      iconBg: "from-purple-500 to-violet-500", borderAccent: "border-l-purple-500",
    },
    {
      icon: Activity, label: "Sessions", value: stats.activeSessions,
      gradient: "from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/5",
      iconBg: "from-rose-500 to-red-500", borderAccent: "border-l-rose-500",
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
          whileHover={{ y: -6, scale: 1.04, transition: { duration: 0.2 } }}
          className="cursor-pointer"
        >
          <div className={`admin-widget-3d bg-gradient-to-br ${w.gradient} border-l-4 ${w.borderAccent}`}>
            <div className="p-3 relative">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${w.iconBg} flex items-center justify-center shadow-lg`}>
                  <w.icon className="w-4 h-4 text-white" />
                </div>
                {w.trend && (
                  <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${w.trend.positive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                    {w.trend.positive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                  </div>
                )}
              </div>
              <p className="text-lg font-extrabold text-foreground leading-tight">{w.value}</p>
              <p className="text-[10px] text-muted-foreground font-sans mt-0.5 font-medium">{w.label}</p>
              {w.trend && (
                <p className={`text-[8px] mt-1 font-bold ${w.trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {w.trend.value}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AdminDashboardWidgets;
