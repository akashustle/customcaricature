import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Package, Calendar, Users, DollarSign, TrendingUp, Clock, Star, Zap, ShoppingBag, MessageCircle, Globe, Activity } from "lucide-react";
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
  });

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];

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

  const widgets = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(stats.totalRevenue), color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: TrendingUp, label: "Pending Revenue", value: formatPrice(stats.pendingRevenue), color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Package, label: "Total Orders", value: stats.totalOrders, color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Zap, label: "Today's Orders", value: stats.todayOrders, color: "text-violet-600", bg: "bg-violet-50" },
    { icon: Clock, label: "Pending Orders", value: stats.pendingOrders, color: "text-orange-600", bg: "bg-orange-50" },
    { icon: Star, label: "Completed", value: stats.completedOrders, color: "text-green-600", bg: "bg-green-50" },
    { icon: Calendar, label: "Total Events", value: stats.totalEvents, color: "text-indigo-600", bg: "bg-indigo-50" },
    { icon: Globe, label: "Upcoming Events", value: stats.upcomingEvents, color: "text-cyan-600", bg: "bg-cyan-50" },
    { icon: Users, label: "Total Customers", value: stats.totalCustomers, color: "text-pink-600", bg: "bg-pink-50" },
    { icon: Users, label: "New Today", value: stats.newCustomersToday, color: "text-rose-600", bg: "bg-rose-50" },
    { icon: MessageCircle, label: "Enquiries", value: `${stats.pendingEnquiries} / ${stats.totalEnquiries}`, color: "text-teal-600", bg: "bg-teal-50" },
    { icon: ShoppingBag, label: "Workshop Users", value: stats.workshopUsers, color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Activity, label: "Active Sessions", value: stats.activeSessions, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6">
      {widgets.map((w, i) => (
        <motion.div
          key={w.label}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.2 } }}
        >
          <Card className="border border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-7 h-7 rounded-lg ${w.bg} flex items-center justify-center`}>
                  <w.icon className={`w-3.5 h-3.5 ${w.color}`} />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">{w.value}</p>
              <p className="text-[10px] text-muted-foreground font-body mt-0.5">{w.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default AdminDashboardWidgets;
