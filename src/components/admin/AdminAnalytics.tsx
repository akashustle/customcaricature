import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, PenTool, Clock, DollarSign, MapPin, AlertTriangle, Users, CreditCard,
  TrendingUp, BarChart3, RefreshCw, ShoppingCart, Zap, Target, Activity, Layers,
  Calendar, Globe, UserCheck, Percent, Star, Heart, X, ShoppingBag, MessageCircle,
  FileText, BookOpen, Award, ArrowUp, ArrowDown, Eye, Mail, TrendingDown, Briefcase,
  PieChart as PieIcon, Filter, Receipt
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar,
  Legend, ComposedChart, ScatterChart, Scatter, ZAxis, Treemap
} from "recharts";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Order = {
  id: string; caricature_type: string; order_type?: string; amount: number;
  negotiated_amount?: number | null; status: string; city: string | null;
  payment_status?: string | null; created_at: string; priority?: number | null;
  customer_email?: string;
};
type Profile = { id: string; user_id: string; full_name: string; email: string; created_at: string; age?: number | null; gender?: string | null; };
interface Props { orders: Order[]; customers: Profile[]; }

const VIBRANT_COLORS = [
  "hsl(36, 45%, 52%)", "hsl(152, 50%, 48%)", "hsl(210, 65%, 55%)",
  "hsl(340, 55%, 58%)", "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(15, 65%, 55%)",
];

const tooltipStyle = { borderRadius: 14, border: "1px solid hsl(30, 20%, 85%)", background: "hsl(40, 50%, 97%)", fontSize: 12 };

const AdminAnalytics = ({ orders, customers }: Props) => {
  const [events, setEvents] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [workshopUsers, setWorkshopUsers] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [funnelEvents, setFunnelEvents] = useState<any[]>([]);
  const [drilldown, setDrilldown] = useState<{ title: string; data: any[]; columns: { key: string; label: string }[] } | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState("overview");

  useEffect(() => {
    const fetchAll = async () => {
      const [e, s, enq, ws, blog, chat, funnel] = await Promise.all([
        supabase.from("event_bookings").select("id, total_price, advance_amount, payment_status, status, city, state, event_date, created_at, artist_count, negotiated, negotiated_total, negotiated_advance, remaining_amount, event_type, country, is_international, client_name, client_email"),
        supabase.from("shop_orders" as any).select("id, total_amount, payment_status, created_at, items"),
        supabase.from("enquiries").select("id, status, source, enquiry_type, created_at, city, state, name, mobile, estimated_price, budget"),
        supabase.from("workshop_users" as any).select("id, created_at, country, state, city, payment_status, skill_level, artist_background_type, occupation"),
        supabase.from("blog_posts").select("id, title, slug, is_published, created_at, category, tags"),
        supabase.from("ai_chat_sessions").select("id, created_at, status, admin_joined, guest_name"),
        supabase.from("funnel_events").select("id, event_type, source, created_at"),
      ]);
      if (e.data) setEvents(e.data);
      if (s.data) setShopOrders(s.data as any[]);
      if (enq.data) setEnquiries(enq.data as any[]);
      if (ws.data) setWorkshopUsers(ws.data as any[]);
      if (blog.data) setBlogPosts(blog.data);
      if (chat.data) setChatSessions(chat.data);
      if (funnel.data) setFunnelEvents(funnel.data as any[]);
    };
    fetchAll();
    const ch = supabase.channel("analytics-all-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Orders
    const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
    const orderRevenue = confirmedOrders.reduce((s, o) => s + (o.negotiated_amount || o.amount), 0);
    const pending = orders.filter(o => !["delivered", "completed"].includes(o.status));
    const delivered = orders.filter(o => ["delivered", "completed"].includes(o.status));
    const newOrders = orders.filter(o => o.status === "new");
    const inProgress = orders.filter(o => o.status === "in_progress");
    const avgOrderValue = confirmedOrders.length > 0 ? Math.round(orderRevenue / confirmedOrders.length) : 0;

    // Events
    const paidEvents = events.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status));
    const eventRevenue = paidEvents.reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
    const eventAdvanceCollected = events.filter(e => ["confirmed", "fully_paid", "partial_1_paid"].includes(e.payment_status)).reduce((s, e) => s + (e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount), 0);
    const eventRemainingToCollect = events.filter(e => ["confirmed", "partial_1_paid"].includes(e.payment_status)).reduce((s, e) => {
      const total = e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price;
      const advance = e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount;
      return s + Math.max(0, total - advance);
    }, 0);
    const upcomingEvents = events.filter(e => e.status === "upcoming").length;
    const completedEvents = events.filter(e => e.status === "completed").length;
    const cancelledEvents = events.filter(e => e.status === "cancelled").length;
    const avgEventValue = events.length > 0 ? Math.round(events.reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0) / events.length) : 0;
    const eventsThisMonth = events.filter(e => { const d = new Date(e.event_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
    const intlEvents = events.filter(e => e.is_international).length;

    // Shop
    const paidShop = shopOrders.filter((s: any) => s.payment_status === "paid");
    const shopRevenue = paidShop.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

    const totalRevenue = orderRevenue + eventRevenue + shopRevenue;
    const pendingOrderRev = orders.filter(o => o.payment_status !== "confirmed").reduce((s, o) => s + o.amount, 0);
    const pendingEventRev = events.filter(e => !["confirmed", "fully_paid"].includes(e.payment_status)).reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
    const totalPendingRev = pendingOrderRev + pendingEventRev;

    // Repeat customers
    const emailCounts: Record<string, number> = {};
    orders.forEach(o => { const e = (o as any).customer_email; if (e) emailCounts[e] = (emailCounts[e] || 0) + 1; });
    const repeatCustomers = Object.values(emailCounts).filter(c => c > 1).length;

    const recentOrders = orders.filter(o => new Date(o.created_at) > thirtyDaysAgo);
    const activeUsers = new Set(recentOrders.map(o => (o as any).customer_email)).size;
    const negotiatedOrders = orders.filter(o => o.negotiated_amount && o.negotiated_amount !== o.amount);
    const conversionRate = orders.length > 0 ? Math.round((confirmedOrders.length / orders.length) * 100) : 0;

    // Time-based revenue
    const todayRevenue = confirmedOrders.filter(o => new Date(o.created_at).toDateString() === today).reduce((s, o) => s + (o.negotiated_amount || o.amount), 0);
    const weeklyRevenue = confirmedOrders.filter(o => new Date(o.created_at) > weekAgo).reduce((s, o) => s + (o.negotiated_amount || o.amount), 0);
    const monthlyRevenue = confirmedOrders.filter(o => new Date(o.created_at) > monthAgo).reduce((s, o) => s + (o.negotiated_amount || o.amount), 0);

    // Enquiries
    const newEnquiries = enquiries.filter(e => e.status === "new").length;
    const convertedEnquiries = enquiries.filter(e => e.status === "converted").length;
    const enquiryConversion = enquiries.length > 0 ? Math.round((convertedEnquiries / enquiries.length) * 100) : 0;

    // Workshop
    const paidWorkshop = workshopUsers.filter((w: any) => w.payment_status === "paid").length;
    const workshopRevenue = paidWorkshop * 2999; // approximate

    // Blog
    const publishedPosts = blogPosts.filter(b => b.is_published).length;

    // Chat
    const activeChatSessions = chatSessions.filter(c => c.status === "active").length;

    return {
      confirmedOrders, orderRevenue, pending, delivered, newOrders, inProgress,
      avgOrderValue, paidEvents, eventRevenue, eventAdvanceCollected, eventRemainingToCollect,
      upcomingEvents, completedEvents, cancelledEvents, avgEventValue, eventsThisMonth, intlEvents,
      paidShop, shopRevenue, totalRevenue, pendingOrderRev, pendingEventRev, totalPendingRev,
      repeatCustomers, activeUsers, negotiatedOrders, conversionRate,
      todayRevenue, weeklyRevenue, monthlyRevenue,
      newEnquiries, convertedEnquiries, enquiryConversion,
      paidWorkshop, workshopRevenue, publishedPosts, activeChatSessions,
      now, today, weekAgo, monthAgo, thirtyDaysAgo,
    };
  }, [orders, events, shopOrders, enquiries, workshopUsers, blogPosts, chatSessions]);

  // Chart data generators
  const monthlyRevenueData = useMemo(() => {
    const months: Record<string, { orders: number; events: number; shop: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { orders: 0, events: 0, shop: 0 };
    }
    stats.confirmedOrders.forEach(o => { const k = o.created_at?.substring(0, 7); if (months[k]) months[k].orders += (o.negotiated_amount || o.amount); });
    stats.paidEvents.forEach(e => { const k = e.created_at?.substring(0, 7); if (months[k]) months[k].events += (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price); });
    stats.paidShop.forEach((s: any) => { const k = s.created_at?.substring(0, 7); if (months[k]) months[k].shop += (s.total_amount || 0); });
    return Object.entries(months).map(([k, v]) => ({
      month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }),
      ...v, total: v.orders + v.events + v.shop,
    }));
  }, [stats]);

  const statusPieData = useMemo(() => [
    { name: "New", value: stats.newOrders.length },
    { name: "In Progress", value: stats.inProgress.length },
    { name: "Art Ready", value: orders.filter(o => o.status === "artwork_ready").length },
    { name: "Dispatched", value: orders.filter(o => o.status === "dispatched").length },
    { name: "Delivered", value: stats.delivered.length },
  ].filter(d => d.value > 0), [orders, stats]);

  const weeklyOrders = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      name: d.toLocaleString("default", { weekday: "short" }),
      orders: orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).length,
      revenue: stats.confirmedOrders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).reduce((s, o) => s + (o.negotiated_amount || o.amount), 0),
    };
  }), [orders, stats]);

  const topCitiesData = useMemo(() => {
    const cityMap: Record<string, number> = {};
    orders.forEach(o => { const c = o.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
    events.forEach(e => { const c = e.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
    return Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, count]) => ({ name: city, count }));
  }, [orders, events]);

  const customerGrowth = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return {
      name: d.toLocaleString("default", { month: "short" }),
      new: customers.filter(c => { const cd = new Date(c.created_at); return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear(); }).length,
      total: customers.filter(c => new Date(c.created_at) <= d).length,
    };
  }), [customers]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { const t = (o as any).order_type || o.caricature_type || "unknown"; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const revenueSplitData = useMemo(() => [
    { name: "Caricatures", value: stats.orderRevenue },
    { name: "Events", value: stats.eventRevenue },
    { name: "Shop", value: stats.shopRevenue },
  ].filter(d => d.value > 0), [stats]);

  const hourlyData = useMemo(() => {
    const hourlyMap: Record<number, number> = {};
    orders.forEach(o => { const h = new Date(o.created_at).getHours(); hourlyMap[h] = (hourlyMap[h] || 0) + 1; });
    return Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: hourlyMap[h] || 0 }));
  }, [orders]);

  // NEW: Enquiry source breakdown
  const enquirySourceData = useMemo(() => {
    const src: Record<string, number> = {};
    enquiries.forEach(e => { const s = e.source || "Direct"; src[s] = (src[s] || 0) + 1; });
    return Object.entries(src).map(([name, value]) => ({ name, value }));
  }, [enquiries]);

  // NEW: Enquiry status funnel
  const enquiryStatusData = useMemo(() => {
    const st: Record<string, number> = {};
    enquiries.forEach(e => { st[e.status] = (st[e.status] || 0) + 1; });
    return Object.entries(st).map(([name, value]) => ({ name, value }));
  }, [enquiries]);

  // NEW: Monthly enquiries
  const monthlyEnquiries = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return {
      name: d.toLocaleString("default", { month: "short" }),
      count: enquiries.filter(e => { const ed = new Date(e.created_at); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); }).length,
    };
  }), [enquiries]);

  // NEW: Event type breakdown
  const eventTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    events.forEach(e => { const t = e.event_type || "Other"; types[t] = (types[t] || 0) + 1; });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [events]);

  // NEW: Event state heatmap
  const eventStateData = useMemo(() => {
    const st: Record<string, number> = {};
    events.forEach(e => { const s = e.state || "Unknown"; st[s] = (st[s] || 0) + 1; });
    return Object.entries(st).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [events]);

  // NEW: Workshop skill level distribution
  const workshopSkillData = useMemo(() => {
    const sk: Record<string, number> = {};
    workshopUsers.forEach((w: any) => { const s = w.skill_level || "Unknown"; sk[s] = (sk[s] || 0) + 1; });
    return Object.entries(sk).map(([name, value]) => ({ name, value }));
  }, [workshopUsers]);

  // NEW: Workshop occupation distribution
  const workshopOccupationData = useMemo(() => {
    const oc: Record<string, number> = {};
    workshopUsers.forEach((w: any) => { const o = w.occupation || "Other"; oc[o] = (oc[o] || 0) + 1; });
    return Object.entries(oc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [workshopUsers]);

  // NEW: Monthly workshop signups
  const monthlyWorkshopSignups = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return {
      name: d.toLocaleString("default", { month: "short" }),
      signups: workshopUsers.filter((w: any) => { const wd = new Date(w.created_at); return wd.getMonth() === d.getMonth() && wd.getFullYear() === d.getFullYear(); }).length,
    };
  }), [workshopUsers]);

  // NEW: Blog category breakdown
  const blogCategoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    blogPosts.forEach(b => { cats[b.category || "Uncategorized"] = (cats[b.category || "Uncategorized"] || 0) + 1; });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [blogPosts]);

  // NEW: Shop monthly revenue
  const shopMonthlyData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const paid = shopOrders.filter((s: any) => s.payment_status === "paid" && (() => { const sd = new Date(s.created_at); return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear(); })());
    return {
      name: d.toLocaleString("default", { month: "short" }),
      revenue: paid.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
      orders: paid.length,
    };
  }), [shopOrders]);

  // NEW: Day of week distribution
  const dayOfWeekData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = new Array(7).fill(0);
    orders.forEach(o => { counts[new Date(o.created_at).getDay()]++; });
    events.forEach(e => { counts[new Date(e.event_date).getDay()]++; });
    return days.map((name, i) => ({ name, bookings: counts[i] }));
  }, [orders, events]);

  // NEW: Monthly event bookings
  const monthlyEventBookings = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return {
      name: d.toLocaleString("default", { month: "short" }),
      bookings: events.filter(e => { const ed = new Date(e.created_at); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); }).length,
    };
  }), [events]);

  // NEW: Age demographics
  const ageData = useMemo(() => {
    const ageGroups: Record<string, number> = { "Under 18": 0, "18-25": 0, "26-35": 0, "36-45": 0, "46-60": 0, "60+": 0 };
    customers.forEach(c => {
      const age = (c as any).age;
      if (!age) return;
      if (age < 18) ageGroups["Under 18"]++;
      else if (age <= 25) ageGroups["18-25"]++;
      else if (age <= 35) ageGroups["26-35"]++;
      else if (age <= 45) ageGroups["36-45"]++;
      else if (age <= 60) ageGroups["46-60"]++;
      else ageGroups["60+"]++;
    });
    return Object.entries(ageGroups).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [customers]);

  // NEW: Gender demographics
  const genderData = useMemo(() => {
    const g: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    customers.forEach(c => {
      const gen = (c as any).gender;
      if (gen === "male") g.Male++;
      else if (gen === "female") g.Female++;
      else if (gen) g.Other++;
    });
    return Object.entries(g).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [customers]);

  // NEW: Event artist count distribution
  const artistCountData = useMemo(() => {
    const counts: Record<number, number> = {};
    events.forEach(e => { counts[e.artist_count] = (counts[e.artist_count] || 0) + 1; });
    return Object.entries(counts).map(([count, value]) => ({ name: `${count} Artist${Number(count) > 1 ? "s" : ""}`, value }));
  }, [events]);

  // Funnel data
  const funnelStageData = useMemo(() => {
    const stages: Record<string, number> = {};
    funnelEvents.forEach((f: any) => { stages[f.event_type] = (stages[f.event_type] || 0) + 1; });
    return Object.entries(stages).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [funnelEvents]);

  // Chat analytics
  const chatStatusData = useMemo(() => {
    const st: Record<string, number> = {};
    chatSessions.forEach(c => { st[c.status] = (st[c.status] || 0) + 1; });
    return Object.entries(st).map(([name, value]) => ({ name, value }));
  }, [chatSessions]);

  // Urgent orders
  const urgentOrders = useMemo(() => stats.pending.filter(o => {
    const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 10;
  }), [stats]);

  // Payment status radial
  const paymentRadialData = useMemo(() => [
    { name: "Confirmed", value: stats.confirmedOrders.length, fill: VIBRANT_COLORS[1] },
    { name: "Pending", value: orders.filter(o => o.payment_status !== "confirmed").length, fill: VIBRANT_COLORS[4] },
  ], [orders, stats]);

  const openDrilldown = (title: string, data: any[], columns: { key: string; label: string }[]) => {
    setDrilldown({ title, data, columns });
  };

  const mostPopularType = useMemo(() => {
    const tc: Record<string, number> = {};
    orders.forEach(o => { const t = (o as any).order_type || o.caricature_type || "unknown"; tc[t] = (tc[t] || 0) + 1; });
    return Object.entries(tc).sort((a, b) => b[1] - a[1])[0];
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Drill-down Dialog */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-body">{drilldown?.title} ({drilldown?.data.length} items)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  {drilldown?.columns.map(c => <TableHead key={c.key} className="font-body text-xs">{c.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drilldown?.data.map((row, i) => (
                  <TableRow key={i}>
                    {drilldown.columns.map(c => (
                      <TableCell key={c.key} className="font-body text-xs">
                        {["amount", "total_price", "advance_amount", "negotiated_total", "total_amount", "estimated_price", "budget"].includes(c.key)
                          ? formatPrice(row[c.key] || 0)
                          : ["created_at", "event_date"].includes(c.key)
                          ? new Date(row[c.key]).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : String(row[c.key] ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sub-tabs for Analytics sections */}
      <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            { value: "overview", label: "Overview", icon: BarChart3 },
            { value: "revenue", label: "Revenue", icon: DollarSign },
            { value: "orders", label: "Orders", icon: Package },
            { value: "events", label: "Events", icon: Calendar },
            { value: "customers", label: "Customers", icon: Users },
            { value: "enquiries", label: "Enquiries", icon: MessageCircle },
            { value: "workshop", label: "Workshop", icon: BookOpen },
            { value: "shop", label: "Shop", icon: ShoppingBag },
            { value: "engagement", label: "Engagement", icon: Activity },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Platform KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard3D icon={DollarSign} label="Total Revenue" value={formatPrice(stats.totalRevenue)} color="hsl(152,50%,48%)" delay={0} onClick={() => openDrilldown("Revenue Sources", [...stats.confirmedOrders.map(o => ({ ...o, type: "Order" })), ...stats.paidEvents.map(e => ({ ...e, type: "Event", amount: e.total_price }))], [{ key: "type", label: "Type" }, { key: "id", label: "ID" }, { key: "amount", label: "Amount" }, { key: "created_at", label: "Date" }])} />
            <StatCard3D icon={TrendingUp} label="Pending Revenue" value={formatPrice(stats.totalPendingRev)} color="hsl(38,92%,55%)" delay={0.05} />
            <StatCard3D icon={Package} label="Total Orders" value={String(orders.length)} color="hsl(36,45%,52%)" delay={0.1} onClick={() => openDrilldown("All Orders", orders, [{ key: "id", label: "ID" }, { key: "caricature_type", label: "Type" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "created_at", label: "Date" }])} />
            <StatCard3D icon={Calendar} label="Total Events" value={String(events.length)} color="hsl(210,65%,55%)" delay={0.15} onClick={() => openDrilldown("All Events", events, [{ key: "id", label: "ID" }, { key: "city", label: "City" }, { key: "total_price", label: "Total" }, { key: "status", label: "Status" }, { key: "event_date", label: "Date" }])} />
            <StatCard3D icon={Users} label="Total Users" value={String(customers.length)} color="hsl(280,50%,55%)" delay={0.2} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard3D icon={MessageCircle} label="Enquiries" value={`${stats.newEnquiries} / ${enquiries.length}`} color="hsl(180,50%,45%)" delay={0} />
            <StatCard3D icon={ShoppingBag} label="Shop Orders" value={String(shopOrders.length)} color="hsl(340,55%,58%)" delay={0.05} />
            <StatCard3D icon={BookOpen} label="Workshop Users" value={String(workshopUsers.length)} color="hsl(15,65%,55%)" delay={0.1} />
            <StatCard3D icon={FileText} label="Blog Posts" value={String(stats.publishedPosts)} color="hsl(36,45%,52%)" delay={0.15} />
            <StatCard3D icon={Activity} label="Active (30d)" value={String(stats.activeUsers)} color="hsl(152,50%,48%)" delay={0.2} />
          </div>

          {/* Revenue trend + Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Revenue Trend (12 Months)" icon={TrendingUp} delay={0.1}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="orderRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(36, 45%, 52%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPrice(v)} />
                  <Area type="monotone" dataKey="orders" name="Caricatures" stroke="hsl(36, 45%, 52%)" fill="url(#orderRevGrad)" strokeWidth={2} />
                  <Bar dataKey="events" name="Events" fill="hsl(210, 65%, 55%)" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="shop" name="Shop" fill="hsl(280, 50%, 55%)" radius={[4, 4, 0, 0]} barSize={16} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(152, 50%, 48%)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Revenue by Category" icon={Layers} delay={0.15}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={revenueSplitData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${formatPrice(value)}`}>
                    {revenueSplitData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPrice(v)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Day of week + Top cities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Bookings by Day of Week" icon={Calendar} delay={0.2}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="bookings" radius={[6, 6, 0, 0]}>
                    {dayOfWeekData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top 10 Cities" icon={MapPin} delay={0.25}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topCitiesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(30, 12%, 56%)" }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {topCitiesData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* === REVENUE TAB === */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard3D icon={DollarSign} label="Total Revenue" value={formatPrice(stats.totalRevenue)} color="hsl(152,50%,48%)" delay={0} />
            <StatCard3D icon={CreditCard} label="Order Revenue" value={formatPrice(stats.orderRevenue)} color="hsl(36,45%,52%)" delay={0.05} />
            <StatCard3D icon={Star} label="Event Revenue" value={formatPrice(stats.eventRevenue)} color="hsl(210,65%,55%)" delay={0.1} />
            <StatCard3D icon={ShoppingBag} label="Shop Revenue" value={formatPrice(stats.shopRevenue)} color="hsl(280,50%,55%)" delay={0.15} />
            <StatCard3D icon={TrendingDown} label="Pending" value={formatPrice(stats.totalPendingRev)} color="hsl(38,92%,55%)" delay={0.2} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={DollarSign} label="Today" value={formatPrice(stats.todayRevenue)} color="hsl(15,65%,55%)" delay={0} />
            <StatCard3D icon={DollarSign} label="This Week" value={formatPrice(stats.weeklyRevenue)} color="hsl(36,45%,52%)" delay={0.05} />
            <StatCard3D icon={DollarSign} label="This Month" value={formatPrice(stats.monthlyRevenue)} color="hsl(152,50%,48%)" delay={0.1} />
            <StatCard3D icon={Target} label="Avg Order Value" value={formatPrice(stats.avgOrderValue)} color="hsl(280,50%,55%)" delay={0.15} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={Receipt} label="Advance Collected" value={formatPrice(stats.eventAdvanceCollected)} color="hsl(180,50%,45%)" delay={0} />
            <StatCard3D icon={AlertTriangle} label="To Collect" value={formatPrice(stats.eventRemainingToCollect)} color="hsl(0,55%,55%)" delay={0.05} />
            <StatCard3D icon={Target} label="Avg Event Value" value={formatPrice(stats.avgEventValue)} color="hsl(210,65%,55%)" delay={0.1} />
            <StatCard3D icon={Percent} label="Conversion" value={`${stats.conversionRate}%`} color="hsl(152,50%,48%)" delay={0.15} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Monthly Revenue Breakdown" icon={TrendingUp} delay={0.1}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPrice(v)} />
                  <Area type="monotone" dataKey="total" stroke="hsl(152, 50%, 48%)" fill="url(#revAreaGrad)" strokeWidth={2.5} name="Total" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Payment Overview" icon={CreditCard} delay={0.15}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={paymentRadialData} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <Legend iconSize={10} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center space-y-3">
                  {[{ label: "Today", value: stats.todayRevenue }, { label: "This Week", value: stats.weeklyRevenue }, { label: "This Month", value: stats.monthlyRevenue }].map(item => (
                    <div key={item.label} className="flex justify-between font-body text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold">{formatPrice(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-body text-sm border-t border-border pt-2">
                    <span className="font-medium">All Time</span>
                    <span className="font-bold text-primary">{formatPrice(stats.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* === ORDERS TAB === */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard3D icon={Package} label="Total Orders" value={String(orders.length)} color="hsl(36,45%,52%)" delay={0} />
            <StatCard3D icon={Clock} label="Pending" value={String(stats.pending.length)} color="hsl(38,92%,55%)" delay={0.05} />
            <StatCard3D icon={Star} label="Completed" value={String(stats.delivered.length)} color="hsl(152,50%,48%)" delay={0.1} />
            <StatCard3D icon={Zap} label="Most Popular" value={mostPopularType ? mostPopularType[0] : "N/A"} color="hsl(210,65%,55%)" delay={0.15} />
            <StatCard3D icon={UserCheck} label="Negotiated" value={String(stats.negotiatedOrders.length)} color="hsl(340,55%,58%)" delay={0.2} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Order Status Distribution" icon={BarChart3} delay={0.1}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusPieData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Order Types" icon={Layers} delay={0.15}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={typeCounts} cx="50%" cy="50%" outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {typeCounts.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[(i + 2) % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Weekly Activity" icon={Activity} delay={0.2}>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={weeklyOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30, 12%, 56%)" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar yAxisId="left" dataKey="orders" fill="hsl(210, 65%, 55%)" radius={[6, 6, 0, 0]} barSize={28} name="Orders" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(340, 55%, 58%)" strokeWidth={2.5} dot={{ r: 4 }} name="Revenue" />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Peak Order Hours" icon={Clock} delay={0.25}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={hourlyData}>
                  <defs><linearGradient id="hourGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(280, 50%, 55%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(280, 50%, 55%)" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(30, 12%, 56%)" }} interval={3} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="orders" stroke="hsl(280, 50%, 55%)" fill="url(#hourGrad2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Urgent Orders */}
          {urgentOrders.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-destructive/30 bg-destructive/5 card-3d">
                <CardHeader><CardTitle className="font-body text-base font-bold flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Deadline Warnings ({urgentOrders.length})</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm font-body text-muted-foreground mb-3">Orders due within 10 days!</p>
                  {urgentOrders.map(o => {
                    const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
                    const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={o.id} className="flex justify-between font-body text-sm py-1.5 border-b border-border/50 last:border-none">
                        <span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`font-semibold ${daysLeft <= 3 ? "text-destructive" : "text-warning"}`}>
                          {daysLeft <= 0 ? "⚠️ OVERDUE" : `${daysLeft} days left`}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* === EVENTS TAB === */}
        <TabsContent value="events" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard3D icon={Calendar} label="Total Events" value={String(events.length)} color="hsl(210,65%,55%)" delay={0} />
            <StatCard3D icon={Globe} label="Upcoming" value={String(stats.upcomingEvents)} color="hsl(152,50%,48%)" delay={0.05} />
            <StatCard3D icon={Activity} label="Completed" value={String(stats.completedEvents)} color="hsl(36,45%,52%)" delay={0.1} />
            <StatCard3D icon={X} label="Cancelled" value={String(stats.cancelledEvents)} color="hsl(340,55%,58%)" delay={0.15} />
            <StatCard3D icon={Globe} label="International" value={String(stats.intlEvents)} color="hsl(280,50%,55%)" delay={0.2} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={DollarSign} label="Event Revenue" value={formatPrice(stats.eventRevenue)} color="hsl(152,50%,48%)" delay={0} />
            <StatCard3D icon={Receipt} label="Advances" value={formatPrice(stats.eventAdvanceCollected)} color="hsl(180,50%,45%)" delay={0.05} />
            <StatCard3D icon={AlertTriangle} label="To Collect" value={formatPrice(stats.eventRemainingToCollect)} color="hsl(0,55%,55%)" delay={0.1} />
            <StatCard3D icon={Calendar} label="This Month" value={String(stats.eventsThisMonth)} color="hsl(36,45%,52%)" delay={0.15} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Event Type Distribution" icon={PieIcon} delay={0.1}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={eventTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {eventTypeData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Events by State" icon={MapPin} delay={0.15}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={eventStateData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {eventStateData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Monthly Event Bookings" icon={Calendar} delay={0.2}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyEventBookings}>
                  <defs><linearGradient id="evBookGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(210, 65%, 55%)" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(210, 65%, 55%)" fill="url(#evBookGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Artist Count Distribution" icon={Users} delay={0.25}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={artistCountData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Events" radius={[6, 6, 0, 0]}>
                    {artistCountData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* === CUSTOMERS TAB === */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={Users} label="Total Users" value={String(customers.length)} color="hsl(280,50%,55%)" delay={0} />
            <StatCard3D icon={Activity} label="Active (30d)" value={String(stats.activeUsers)} color="hsl(152,50%,48%)" delay={0.05} />
            <StatCard3D icon={RefreshCw} label="Repeat" value={String(stats.repeatCustomers)} color="hsl(180,50%,45%)" delay={0.1} />
            <StatCard3D icon={UserCheck} label="Today" value={String(customers.filter(c => new Date(c.created_at).toDateString() === stats.today).length)} color="hsl(36,45%,52%)" delay={0.15} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Customer Growth (12 Months)" icon={Users} delay={0.1}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={customerGrowth}>
                  <defs><linearGradient id="custGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(152, 50%, 48%)" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total" stroke="hsl(152, 50%, 48%)" fill="url(#custGrad2)" strokeWidth={2.5} name="Total" />
                  <Line type="monotone" dataKey="new" stroke="hsl(280, 50%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="New" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Age Demographics" icon={Users} delay={0.15}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                    {ageData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Gender Distribution" icon={Heart} delay={0.2}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="hsl(210, 65%, 55%)" />
                    <Cell fill="hsl(340, 55%, 58%)" />
                    <Cell fill="hsl(152, 50%, 48%)" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Funnel Events" icon={Filter} delay={0.25}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnelStageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Events" radius={[6, 6, 0, 0]}>
                    {funnelStageData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* === ENQUIRIES TAB === */}
        <TabsContent value="enquiries" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={MessageCircle} label="Total Enquiries" value={String(enquiries.length)} color="hsl(180,50%,45%)" delay={0} onClick={() => openDrilldown("All Enquiries", enquiries, [{ key: "name", label: "Name" }, { key: "mobile", label: "Mobile" }, { key: "status", label: "Status" }, { key: "source", label: "Source" }, { key: "created_at", label: "Date" }])} />
            <StatCard3D icon={Zap} label="New" value={String(stats.newEnquiries)} color="hsl(38,92%,55%)" delay={0.05} />
            <StatCard3D icon={Star} label="Converted" value={String(stats.convertedEnquiries)} color="hsl(152,50%,48%)" delay={0.1} />
            <StatCard3D icon={Percent} label="Conversion Rate" value={`${stats.enquiryConversion}%`} color="hsl(210,65%,55%)" delay={0.15} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Enquiry Sources" icon={Globe} delay={0.1}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={enquirySourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {enquirySourceData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Enquiry Status Breakdown" icon={BarChart3} delay={0.15}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={enquiryStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Enquiries" radius={[6, 6, 0, 0]}>
                    {enquiryStatusData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <ChartCard title="Monthly Enquiry Volume" icon={TrendingUp} delay={0.2}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyEnquiries}>
                <defs><linearGradient id="enqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(180, 50%, 45%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(180, 50%, 45%)" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="hsl(180, 50%, 45%)" fill="url(#enqGrad)" strokeWidth={2} name="Enquiries" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* === WORKSHOP TAB === */}
        <TabsContent value="workshop" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={BookOpen} label="Total Users" value={String(workshopUsers.length)} color="hsl(15,65%,55%)" delay={0} />
            <StatCard3D icon={CreditCard} label="Paid" value={String(stats.paidWorkshop)} color="hsl(152,50%,48%)" delay={0.05} />
            <StatCard3D icon={DollarSign} label="Revenue (est)" value={formatPrice(stats.workshopRevenue)} color="hsl(36,45%,52%)" delay={0.1} />
            <StatCard3D icon={Award} label="Unpaid" value={String(workshopUsers.length - stats.paidWorkshop)} color="hsl(38,92%,55%)" delay={0.15} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Skill Level Distribution" icon={Award} delay={0.1}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={workshopSkillData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {workshopSkillData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Occupation Distribution" icon={Briefcase} delay={0.15}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={workshopOccupationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                    {workshopOccupationData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <ChartCard title="Monthly Workshop Signups" icon={TrendingUp} delay={0.2}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyWorkshopSignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="signups" name="Signups" fill="hsl(15, 65%, 55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* === SHOP TAB === */}
        <TabsContent value="shop" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={ShoppingBag} label="Total Orders" value={String(shopOrders.length)} color="hsl(340,55%,58%)" delay={0} />
            <StatCard3D icon={DollarSign} label="Revenue" value={formatPrice(stats.shopRevenue)} color="hsl(152,50%,48%)" delay={0.05} />
            <StatCard3D icon={CreditCard} label="Paid" value={String(stats.paidShop.length)} color="hsl(36,45%,52%)" delay={0.1} />
            <StatCard3D icon={Clock} label="Pending" value={String(shopOrders.length - stats.paidShop.length)} color="hsl(38,92%,55%)" delay={0.15} />
          </div>
          <ChartCard title="Monthly Shop Performance" icon={ShoppingBag} delay={0.1}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={shopMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="right" dataKey="orders" name="Orders" fill="hsl(340, 55%, 58%)" radius={[6, 6, 0, 0]} barSize={24} />
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(152, 50%, 48%)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* === ENGAGEMENT TAB === */}
        <TabsContent value="engagement" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard3D icon={MessageCircle} label="Chat Sessions" value={String(chatSessions.length)} color="hsl(210,65%,55%)" delay={0} />
            <StatCard3D icon={Activity} label="Active Chats" value={String(stats.activeChatSessions)} color="hsl(152,50%,48%)" delay={0.05} />
            <StatCard3D icon={FileText} label="Published Blog" value={String(stats.publishedPosts)} color="hsl(36,45%,52%)" delay={0.1} />
            <StatCard3D icon={Eye} label="Funnel Events" value={String(funnelEvents.length)} color="hsl(280,50%,55%)" delay={0.15} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Chat Session Status" icon={MessageCircle} delay={0.1}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={chatStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {chatStatusData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Blog Categories" icon={BookOpen} delay={0.15}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={blogCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Posts" radius={[6, 6, 0, 0]}>
                    {blogCategoryData.map((_, i) => <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ChartCard = ({ title, icon: Icon, delay = 0, children }: { title: string; icon: any; delay?: number; children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Card className="card-3d overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="font-body text-base font-bold flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </motion.div>
);

const StatCard3D = ({ icon: Icon, label, value, color, delay = 0, onClick }: { icon: any; label: string; value: string; color: string; delay?: number; onClick?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 ${onClick ? "cursor-pointer active:scale-95" : ""}`}
    style={{
      background: "linear-gradient(145deg, hsl(40, 50%, 98%), hsl(40, 50%, 95%))",
      border: "1px solid hsl(30, 20%, 88%)",
      boxShadow: "0 4px 14px hsl(30 20% 45% / 0.06), 0 1px 3px hsl(30 20% 45% / 0.03), inset 0 1px 0 hsl(40, 60%, 99%)",
    }}
    onClick={onClick}
    whileHover={onClick ? { scale: 1.02 } : undefined}
    whileTap={onClick ? { scale: 0.97 } : undefined}
  >
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6" style={{ background: color }} />
    <div className="flex items-center gap-3 relative z-10">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: color }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg md:text-xl font-body font-bold truncate">{value}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground font-body">{label}</p>
      </div>
    </div>
  </motion.div>
);

export default AdminAnalytics;
