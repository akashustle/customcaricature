import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, PenTool, Clock, DollarSign, MapPin, AlertTriangle, Users, CreditCard,
  TrendingUp, BarChart3, RefreshCw, ShoppingCart, Zap, Target, Activity, Layers,
  Calendar, Globe, UserCheck, Percent, Star, Heart, X, ShoppingBag, MessageCircle,
  FileText, BookOpen, Award, ArrowUp, ArrowDown, Eye, Mail, TrendingDown, Briefcase,
  PieChart as PieIcon, Filter, Receipt, Download, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar,
  Legend, ComposedChart
} from "recharts";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Order = {
  id: string; caricature_type: string; order_type?: string; amount: number;
  negotiated_amount?: number | null; status: string; city: string | null;
  payment_status?: string | null; created_at: string; priority?: number | null;
  customer_email?: string; customer_name?: string;
};
type Profile = { id: string; user_id: string; full_name: string; email: string; created_at: string; age?: number | null; gender?: string | null; city?: string | null; state?: string | null; };
interface Props { orders: Order[]; customers: Profile[]; }

const COLORS = [
  "hsl(36, 45%, 52%)", "hsl(152, 50%, 48%)", "hsl(210, 65%, 55%)",
  "hsl(340, 55%, 58%)", "hsl(38, 92%, 55%)", "hsl(280, 50%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(15, 65%, 55%)", "hsl(60, 50%, 45%)", "hsl(0, 55%, 55%)"
];

const TT = { borderRadius: 14, border: "1px solid hsl(30, 20%, 85%)", background: "hsl(40, 50%, 97%)", fontSize: 12 };

const AdminAnalytics = ({ orders, customers }: Props) => {
  const [events, setEvents] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [workshopUsers, setWorkshopUsers] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [funnelEvents, setFunnelEvents] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [drilldown, setDrilldown] = useState<{ title: string; data: any[]; columns: { key: string; label: string }[] } | null>(null);
  const [tab, setTab] = useState("overview");
  const [dateRange, setDateRange] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  useEffect(() => {
    const fetchAll = async () => {
      const [e, s, enq, ws, blog, chat, funnel, ph, rev] = await Promise.all([
        supabase.from("event_bookings").select("id, total_price, advance_amount, payment_status, status, city, state, event_date, created_at, artist_count, negotiated, negotiated_total, negotiated_advance, remaining_amount, event_type, country, is_international, client_name, client_email"),
        supabase.from("shop_orders" as any).select("id, total_amount, payment_status, created_at, status, order_number, shipping_city"),
        supabase.from("enquiries").select("id, status, source, enquiry_type, created_at, city, state, name, mobile, estimated_price, budget"),
        supabase.from("workshop_users" as any).select("id, created_at, country, state, city, payment_status, skill_level, artist_background_type, occupation"),
        supabase.from("blog_posts").select("id, title, slug, is_published, created_at, category, tags"),
        supabase.from("ai_chat_sessions").select("id, created_at, status, admin_joined, guest_name"),
        supabase.from("funnel_events").select("id, event_type, source, created_at"),
        supabase.from("payment_history").select("id, amount, payment_type, status, created_at"),
        supabase.from("reviews").select("id, rating, review_type, created_at, comment"),
      ]);
      if (e.data) setEvents(e.data);
      if (s.data) setShopOrders(s.data as any[]);
      if (enq.data) setEnquiries(enq.data as any[]);
      if (ws.data) setWorkshopUsers(ws.data as any[]);
      if (blog.data) setBlogPosts(blog.data);
      if (chat.data) setChatSessions(chat.data);
      if (funnel.data) setFunnelEvents(funnel.data as any[]);
      if (ph.data) setPaymentHistory(ph.data as any[]);
      if (rev.data) setReviews(rev.data as any[]);
    };
    fetchAll();
    const ch = supabase.channel("analytics-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Date filtering
  const filterByDate = useCallback((items: any[], dateField = "created_at") => {
    if (dateRange === "all") return items;
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === "today") cutoff.setHours(0, 0, 0, 0);
    else if (dateRange === "7d") cutoff.setDate(cutoff.getDate() - 7);
    else if (dateRange === "30d") cutoff.setDate(cutoff.getDate() - 30);
    else if (dateRange === "90d") cutoff.setDate(cutoff.getDate() - 90);
    else if (dateRange === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
    return items.filter(i => new Date(i[dateField]) >= cutoff);
  }, [dateRange]);

  const filteredOrders = useMemo(() => {
    let o = filterByDate(orders);
    if (cityFilter !== "all") o = o.filter(x => x.city === cityFilter);
    return o;
  }, [orders, filterByDate, cityFilter]);

  const filteredEvents = useMemo(() => filterByDate(events), [events, filterByDate]);
  const filteredShop = useMemo(() => filterByDate(shopOrders), [shopOrders, filterByDate]);
  const filteredEnquiries = useMemo(() => filterByDate(enquiries), [enquiries, filterByDate]);

  const allCities = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => { if (o.city) set.add(o.city); });
    events.forEach(e => { if (e.city) set.add(e.city); });
    return Array.from(set).sort();
  }, [orders, events]);

  // Stats
  const s = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const co = filteredOrders.filter(o => o.payment_status === "confirmed");
    const orderRev = co.reduce((a, o) => a + (o.negotiated_amount || o.amount), 0);
    const pending = filteredOrders.filter(o => !["delivered", "completed"].includes(o.status));
    const delivered = filteredOrders.filter(o => ["delivered", "completed"].includes(o.status));
    const newO = filteredOrders.filter(o => o.status === "new");
    const inP = filteredOrders.filter(o => o.status === "in_progress");
    const avgOV = co.length > 0 ? Math.round(orderRev / co.length) : 0;
    const pe = filteredEvents.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status));
    const evRev = pe.reduce((a, e) => a + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
    const evAdv = filteredEvents.filter(e => ["confirmed", "fully_paid", "partial_1_paid"].includes(e.payment_status)).reduce((a, e) => a + (e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount), 0);
    const evRem = filteredEvents.filter(e => ["confirmed", "partial_1_paid"].includes(e.payment_status)).reduce((a, e) => {
      const t = e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price;
      const ad = e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount;
      return a + Math.max(0, t - ad);
    }, 0);
    const ps = filteredShop.filter((x: any) => x.payment_status === "paid");
    const shopRev = ps.reduce((a: number, o: any) => a + (o.total_amount || 0), 0);
    const totalRev = orderRev + evRev + shopRev;
    const conv = filteredOrders.length > 0 ? Math.round((co.length / filteredOrders.length) * 100) : 0;
    const emails: Record<string, number> = {};
    filteredOrders.forEach(o => { const e = (o as any).customer_email; if (e) emails[e] = (emails[e] || 0) + 1; });
    const repeat = Object.values(emails).filter(c => c > 1).length;
    const todayRev = co.filter(o => new Date(o.created_at).toDateString() === today).reduce((a, o) => a + (o.negotiated_amount || o.amount), 0);
    const weekRev = co.filter(o => new Date(o.created_at) > weekAgo).reduce((a, o) => a + (o.negotiated_amount || o.amount), 0);
    const monthRev = co.filter(o => new Date(o.created_at) > monthAgo).reduce((a, o) => a + (o.negotiated_amount || o.amount), 0);
    const newEnq = filteredEnquiries.filter(e => e.status === "new").length;
    const convEnq = filteredEnquiries.filter(e => e.status === "converted").length;
    const enqConv = filteredEnquiries.length > 0 ? Math.round((convEnq / filteredEnquiries.length) * 100) : 0;
    const paidWS = workshopUsers.filter((w: any) => w.payment_status === "paid").length;
    const wsRev = paidWS * 2999;
    const pubPosts = blogPosts.filter(b => b.is_published).length;
    const activeChat = chatSessions.filter(c => c.status === "active").length;
    const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "0";
    const cancelledOrders = filteredOrders.filter(o => o.status === "cancelled").length;
    const cancelRate = filteredOrders.length > 0 ? Math.round((cancelledOrders / filteredOrders.length) * 100) : 0;
    return {
      co, orderRev, pending, delivered, newO, inP, avgOV, pe, evRev, evAdv, evRem,
      ps, shopRev, totalRev, conv, repeat, todayRev, weekRev, monthRev,
      newEnq, convEnq, enqConv, paidWS, wsRev, pubPosts, activeChat, avgRating,
      cancelledOrders, cancelRate, today, weekAgo, monthAgo,
      upcomingEv: filteredEvents.filter(e => e.status === "upcoming").length,
      completedEv: filteredEvents.filter(e => e.status === "completed").length,
      cancelledEv: filteredEvents.filter(e => e.status === "cancelled").length,
      intlEv: filteredEvents.filter(e => e.is_international).length,
      avgEvVal: filteredEvents.length > 0 ? Math.round(filteredEvents.reduce((a, e) => a + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0) / filteredEvents.length) : 0,
      evThisMonth: filteredEvents.filter(e => { const d = new Date(e.event_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    };
  }, [filteredOrders, filteredEvents, filteredShop, filteredEnquiries, workshopUsers, blogPosts, chatSessions, reviews]);

  // Chart data
  const monthlyRev = useMemo(() => {
    const months: Record<string, { orders: number; events: number; shop: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = { orders: 0, events: 0, shop: 0 };
    }
    s.co.forEach(o => { const k = o.created_at?.substring(0, 7); if (months[k]) months[k].orders += (o.negotiated_amount || o.amount); });
    s.pe.forEach(e => { const k = e.created_at?.substring(0, 7); if (months[k]) months[k].events += (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price); });
    s.ps.forEach((x: any) => { const k = x.created_at?.substring(0, 7); if (months[k]) months[k].shop += (x.total_amount || 0); });
    return Object.entries(months).map(([k, v]) => ({ month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }), ...v, total: v.orders + v.events + v.shop }));
  }, [s]);

  const statusPie = useMemo(() => [
    { name: "New", value: s.newO.length }, { name: "In Progress", value: s.inP.length },
    { name: "Art Ready", value: filteredOrders.filter(o => o.status === "artwork_ready").length },
    { name: "Dispatched", value: filteredOrders.filter(o => o.status === "dispatched").length },
    { name: "Delivered", value: s.delivered.length },
  ].filter(d => d.value > 0), [filteredOrders, s]);

  const weeklyOrders = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { name: d.toLocaleString("default", { weekday: "short" }), orders: filteredOrders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).length, revenue: s.co.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).reduce((a, o) => a + (o.negotiated_amount || o.amount), 0) };
  }), [filteredOrders, s]);

  const topCities = useMemo(() => {
    const m: Record<string, number> = {};
    filteredOrders.forEach(o => { const c = o.city || "Unknown"; m[c] = (m[c] || 0) + 1; });
    filteredEvents.forEach(e => { const c = e.city || "Unknown"; m[c] = (m[c] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [filteredOrders, filteredEvents]);

  const custGrowth = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return { name: d.toLocaleString("default", { month: "short" }), new: customers.filter(c => { const cd = new Date(c.created_at); return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear(); }).length, total: customers.filter(c => new Date(c.created_at) <= d).length };
  }), [customers]);

  const revSplit = useMemo(() => [{ name: "Caricatures", value: s.orderRev }, { name: "Events", value: s.evRev }, { name: "Shop", value: s.shopRev }].filter(d => d.value > 0), [s]);
  const hourly = useMemo(() => { const m: Record<number, number> = {}; filteredOrders.forEach(o => { const h = new Date(o.created_at).getHours(); m[h] = (m[h] || 0) + 1; }); return Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: m[h] || 0 })); }, [filteredOrders]);
  const enqSource = useMemo(() => { const m: Record<string, number> = {}; filteredEnquiries.forEach(e => { const s = e.source || "Direct"; m[s] = (m[s] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [filteredEnquiries]);
  const enqStatus = useMemo(() => { const m: Record<string, number> = {}; filteredEnquiries.forEach(e => { m[e.status] = (m[e.status] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [filteredEnquiries]);
  const evType = useMemo(() => { const m: Record<string, number> = {}; filteredEvents.forEach(e => { m[e.event_type || "Other"] = (m[e.event_type || "Other"] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [filteredEvents]);
  const evState = useMemo(() => { const m: Record<string, number> = {}; filteredEvents.forEach(e => { m[e.state || "Unknown"] = (m[e.state || "Unknown"] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })); }, [filteredEvents]);
  const wsSkill = useMemo(() => { const m: Record<string, number> = {}; workshopUsers.forEach((w: any) => { m[w.skill_level || "Unknown"] = (m[w.skill_level || "Unknown"] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [workshopUsers]);
  const wsOcc = useMemo(() => { const m: Record<string, number> = {}; workshopUsers.forEach((w: any) => { m[w.occupation || "Other"] = (m[w.occupation || "Other"] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })); }, [workshopUsers]);
  const blogCats = useMemo(() => { const m: Record<string, number> = {}; blogPosts.forEach(b => { m[b.category || "Other"] = (m[b.category || "Other"] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [blogPosts]);
  const chatStatus = useMemo(() => { const m: Record<string, number> = {}; chatSessions.forEach(c => { m[c.status] = (m[c.status] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [chatSessions]);

  const dayOfWeek = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = new Array(7).fill(0);
    filteredOrders.forEach(o => { counts[new Date(o.created_at).getDay()]++; });
    filteredEvents.forEach(e => { counts[new Date(e.event_date).getDay()]++; });
    return days.map((name, i) => ({ name, bookings: counts[i] }));
  }, [filteredOrders, filteredEvents]);

  const typeCounts = useMemo(() => { const m: Record<string, number> = {}; filteredOrders.forEach(o => { const t = (o as any).order_type || o.caricature_type || "unknown"; m[t] = (m[t] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [filteredOrders]);

  const monthlyEv = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return { name: d.toLocaleString("default", { month: "short" }), bookings: filteredEvents.filter(e => { const ed = new Date(e.created_at); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); }).length };
  }), [filteredEvents]);

  const shopMonthly = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const paid = filteredShop.filter((x: any) => x.payment_status === "paid" && new Date(x.created_at).getMonth() === d.getMonth() && new Date(x.created_at).getFullYear() === d.getFullYear());
    return { name: d.toLocaleString("default", { month: "short" }), revenue: paid.reduce((a: number, o: any) => a + (o.total_amount || 0), 0), orders: paid.length };
  }), [filteredShop]);

  const ageData = useMemo(() => {
    const g: Record<string, number> = { "Under 18": 0, "18-25": 0, "26-35": 0, "36-45": 0, "46-60": 0, "60+": 0 };
    customers.forEach(c => { const a = c.age; if (!a) return; if (a < 18) g["Under 18"]++; else if (a <= 25) g["18-25"]++; else if (a <= 35) g["26-35"]++; else if (a <= 45) g["36-45"]++; else if (a <= 60) g["46-60"]++; else g["60+"]++; });
    return Object.entries(g).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [customers]);

  const genderData = useMemo(() => {
    const g: Record<string, number> = {};
    customers.forEach(c => { const gen = (c as any).gender; if (gen) g[gen] = (g[gen] || 0) + 1; });
    return Object.entries(g).filter(([, v]) => v > 0).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [customers]);

  const artistCountData = useMemo(() => { const m: Record<number, number> = {}; filteredEvents.forEach(e => { m[e.artist_count] = (m[e.artist_count] || 0) + 1; }); return Object.entries(m).map(([c, v]) => ({ name: `${c} Artist${Number(c) > 1 ? "s" : ""}`, value: v })); }, [filteredEvents]);

  const paymentTypeData = useMemo(() => { const m: Record<string, number> = {}; paymentHistory.forEach((p: any) => { m[p.payment_type || "other"] = (m[p.payment_type || "other"] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [paymentHistory]);

  const reviewRatingData = useMemo(() => { const m: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; reviews.forEach(r => { m[r.rating] = (m[r.rating] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name: `${name}★`, value })); }, [reviews]);

  const monthlyEnq = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return { name: d.toLocaleString("default", { month: "short" }), count: filteredEnquiries.filter(e => { const ed = new Date(e.created_at); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); }).length };
  }), [filteredEnquiries]);

  const wsMonthly = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return { name: d.toLocaleString("default", { month: "short" }), signups: workshopUsers.filter((w: any) => { const wd = new Date(w.created_at); return wd.getMonth() === d.getMonth() && wd.getFullYear() === d.getFullYear(); }).length };
  }), [workshopUsers]);

  const funnelStage = useMemo(() => { const m: Record<string, number> = {}; funnelEvents.forEach((f: any) => { m[f.event_type] = (m[f.event_type] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })); }, [funnelEvents]);

  const custByCity = useMemo(() => { const m: Record<string, number> = {}; customers.forEach(c => { if (c.city) m[c.city] = (m[c.city] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })); }, [customers]);

  const urgentOrders = useMemo(() => s.pending.filter(o => {
    const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 10;
  }), [s]);

  const paymentRadial = useMemo(() => [
    { name: "Confirmed", value: s.co.length, fill: COLORS[1] },
    { name: "Pending", value: filteredOrders.length - s.co.length, fill: COLORS[4] },
  ], [filteredOrders, s]);

  const drill = (title: string, data: any[], columns: { key: string; label: string }[]) => setDrilldown({ title, data, columns });

  const exportCSV = () => {
    if (!drilldown) return;
    const header = drilldown.columns.map(c => c.label).join(",");
    const rows = drilldown.data.map(row => drilldown.columns.map(c => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${drilldown.title}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Cities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {allCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{filteredOrders.length} orders • {filteredEvents.length} events</Badge>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{drilldown?.title} ({drilldown?.data.length})</DialogTitle>
              <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-3 h-3 mr-1" />CSV</Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <Table>
              <TableHeader><TableRow>{drilldown?.columns.map(c => <TableHead key={c.key} className="text-xs">{c.label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {drilldown?.data.map((row, i) => (
                  <TableRow key={i}>{drilldown.columns.map(c => (
                    <TableCell key={c.key} className="text-xs">
                      {["amount", "total_price", "advance_amount", "negotiated_total", "total_amount", "estimated_price", "budget"].includes(c.key) ? formatPrice(row[c.key] || 0) : ["created_at", "event_date"].includes(c.key) ? new Date(row[c.key]).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : String(row[c.key] ?? "-")}
                    </TableCell>
                  ))}</TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            { v: "overview", l: "Overview", i: BarChart3 }, { v: "revenue", l: "Revenue", i: DollarSign },
            { v: "orders", l: "Orders", i: Package }, { v: "events", l: "Events", i: Calendar },
            { v: "customers", l: "Customers", i: Users }, { v: "enquiries", l: "Enquiries", i: MessageCircle },
            { v: "workshop", l: "Workshop", i: BookOpen }, { v: "shop", l: "Shop", i: ShoppingBag },
            { v: "engagement", l: "Engagement", i: Activity },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="text-xs gap-1.5"><t.i className="w-3.5 h-3.5" />{t.l}</TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat icon={DollarSign} label="Total Revenue" value={formatPrice(s.totalRev)} color={COLORS[1]} onClick={() => drill("Revenue Sources", [...s.co.map(o => ({ ...o, type: "Order" })), ...s.pe.map(e => ({ ...e, type: "Event", amount: e.total_price }))], [{ key: "type", label: "Type" }, { key: "id", label: "ID" }, { key: "amount", label: "Amount" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={TrendingUp} label="Pending" value={formatPrice(s.orderRev > 0 ? s.totalRev * 0.15 : 0)} color={COLORS[4]} />
            <Stat icon={Package} label="Orders" value={String(filteredOrders.length)} color={COLORS[0]} onClick={() => drill("All Orders", filteredOrders, [{ key: "id", label: "ID" }, { key: "caricature_type", label: "Type" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={Calendar} label="Events" value={String(filteredEvents.length)} color={COLORS[2]} onClick={() => drill("Events", filteredEvents, [{ key: "id", label: "ID" }, { key: "city", label: "City" }, { key: "total_price", label: "Total" }, { key: "status", label: "Status" }, { key: "event_date", label: "Date" }])} />
            <Stat icon={Users} label="Users" value={String(customers.length)} color={COLORS[5]} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat icon={MessageCircle} label="Enquiries" value={`${s.newEnq}/${filteredEnquiries.length}`} color={COLORS[6]} onClick={() => drill("Enquiries", filteredEnquiries, [{ key: "name", label: "Name" }, { key: "mobile", label: "Mobile" }, { key: "status", label: "Status" }, { key: "source", label: "Source" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={ShoppingBag} label="Shop" value={String(filteredShop.length)} color={COLORS[3]} onClick={() => drill("Shop Orders", filteredShop, [{ key: "order_number", label: "Order" }, { key: "total_amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={BookOpen} label="Workshop" value={String(workshopUsers.length)} color={COLORS[7]} />
            <Stat icon={Star} label="Avg Rating" value={s.avgRating + "★"} color={COLORS[4]} onClick={() => drill("Reviews", reviews, [{ key: "rating", label: "Rating" }, { key: "review_type", label: "Type" }, { key: "comment", label: "Comment" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={Percent} label="Conversion" value={`${s.conv}%`} color={COLORS[1]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Revenue Trend (12M)" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthlyRev}>
                  <defs><linearGradient id="oG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.35} /><stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(30,12%,56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30,12%,56%)" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => formatPrice(v)} />
                  <Area type="monotone" dataKey="orders" name="Caricatures" stroke={COLORS[0]} fill="url(#oG)" strokeWidth={2} />
                  <Bar dataKey="events" name="Events" fill={COLORS[2]} radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="shop" name="Shop" fill={COLORS[5]} radius={[4, 4, 0, 0]} barSize={16} />
                  <Line type="monotone" dataKey="total" name="Total" stroke={COLORS[1]} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </Chart>
            <Chart title="Revenue Split" icon={Layers}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={revSplit} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${formatPrice(value)}`}>
                    {revSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={(v: number) => formatPrice(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Chart>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Bookings by Day" icon={Calendar}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(30,12%,56%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(30,12%,56%)" }} allowDecimals={false} />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="bookings" radius={[6, 6, 0, 0]}>{dayOfWeek.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Chart>
            <Chart title="Top 10 Cities" icon={MapPin}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topCities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>{topCities.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Chart>
          </div>
        </TabsContent>

        {/* REVENUE */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat icon={DollarSign} label="Total Revenue" value={formatPrice(s.totalRev)} color={COLORS[1]} />
            <Stat icon={CreditCard} label="Order Revenue" value={formatPrice(s.orderRev)} color={COLORS[0]} onClick={() => drill("Order Revenue", s.co, [{ key: "id", label: "ID" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={Star} label="Event Revenue" value={formatPrice(s.evRev)} color={COLORS[2]} onClick={() => drill("Event Revenue", s.pe, [{ key: "id", label: "ID" }, { key: "total_price", label: "Total" }, { key: "city", label: "City" }, { key: "event_date", label: "Date" }])} />
            <Stat icon={ShoppingBag} label="Shop Revenue" value={formatPrice(s.shopRev)} color={COLORS[5]} />
            <Stat icon={BookOpen} label="Workshop Rev" value={formatPrice(s.wsRev)} color={COLORS[7]} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="Today" value={formatPrice(s.todayRev)} color={COLORS[7]} />
            <Stat icon={DollarSign} label="This Week" value={formatPrice(s.weekRev)} color={COLORS[0]} />
            <Stat icon={DollarSign} label="This Month" value={formatPrice(s.monthRev)} color={COLORS[1]} />
            <Stat icon={Target} label="Avg Order Value" value={formatPrice(s.avgOV)} color={COLORS[5]} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={Receipt} label="Advance Collected" value={formatPrice(s.evAdv)} color={COLORS[6]} />
            <Stat icon={AlertTriangle} label="To Collect" value={formatPrice(s.evRem)} color={COLORS[9]} />
            <Stat icon={Target} label="Avg Event Value" value={formatPrice(s.avgEvVal)} color={COLORS[2]} />
            <Stat icon={Percent} label="Conversion" value={`${s.conv}%`} color={COLORS[1]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Monthly Revenue" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyRev}>
                  <defs><linearGradient id="rG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => formatPrice(v)} />
                  <Area type="monotone" dataKey="total" stroke={COLORS[1]} fill="url(#rG)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Chart>
            <Chart title="Payment Status" icon={CreditCard}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={paymentRadial} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {paymentRadial.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} />
                </PieChart>
              </ResponsiveContainer>
            </Chart>
          </div>
          <Chart title="Payment Types" icon={Receipt}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{paymentTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Chart>
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat icon={Package} label="Total" value={String(filteredOrders.length)} color={COLORS[0]} onClick={() => drill("All Orders", filteredOrders, [{ key: "id", label: "ID" }, { key: "caricature_type", label: "Type" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={Clock} label="Pending" value={String(s.pending.length)} color={COLORS[4]} onClick={() => drill("Pending", s.pending, [{ key: "id", label: "ID" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={Star} label="Delivered" value={String(s.delivered.length)} color={COLORS[1]} />
            <Stat icon={X} label="Cancel Rate" value={`${s.cancelRate}%`} color={COLORS[9]} />
            <Stat icon={UserCheck} label="Repeat" value={String(s.repeat)} color={COLORS[3]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Status Distribution" icon={BarChart3}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{statusPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip contentStyle={TT} /></PieChart>
              </ResponsiveContainer>
            </Chart>
            <Chart title="Order Types" icon={Layers}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={typeCounts} cx="50%" cy="50%" outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{typeCounts.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT} /></PieChart>
              </ResponsiveContainer>
            </Chart>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Weekly Activity" icon={Activity}>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={weeklyOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TT} />
                  <Bar yAxisId="left" dataKey="orders" fill={COLORS[2]} radius={[6, 6, 0, 0]} barSize={28} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke={COLORS[3]} strokeWidth={2.5} dot={{ r: 4 }} />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </Chart>
            <Chart title="Peak Hours" icon={Clock}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={hourly}>
                  <defs><linearGradient id="hG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[5]} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS[5]} stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TT} /><Area type="monotone" dataKey="orders" stroke={COLORS[5]} fill="url(#hG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Chart>
          </div>
          {urgentOrders.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Deadline Warnings ({urgentOrders.length})</CardTitle></CardHeader>
                <CardContent>
                  {urgentOrders.slice(0, 5).map(o => {
                    const due = new Date(o.created_at); due.setDate(due.getDate() + 30);
                    const dl = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return <div key={o.id} className="flex justify-between text-sm py-1.5 border-b border-border/50 last:border-none"><span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span><span className={dl <= 3 ? "text-destructive font-bold" : "text-amber-600 font-semibold"}>{dl <= 0 ? "⚠️ OVERDUE" : `${dl}d left`}</span></div>;
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat icon={Calendar} label="Total" value={String(filteredEvents.length)} color={COLORS[2]} onClick={() => drill("Events", filteredEvents, [{ key: "id", label: "ID" }, { key: "city", label: "City" }, { key: "total_price", label: "Total" }, { key: "status", label: "Status" }, { key: "event_date", label: "Date" }])} />
            <Stat icon={Globe} label="Upcoming" value={String(s.upcomingEv)} color={COLORS[1]} />
            <Stat icon={Activity} label="Completed" value={String(s.completedEv)} color={COLORS[0]} />
            <Stat icon={X} label="Cancelled" value={String(s.cancelledEv)} color={COLORS[3]} />
            <Stat icon={Globe} label="International" value={String(s.intlEv)} color={COLORS[5]} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="Event Revenue" value={formatPrice(s.evRev)} color={COLORS[1]} />
            <Stat icon={Receipt} label="Advances" value={formatPrice(s.evAdv)} color={COLORS[6]} />
            <Stat icon={AlertTriangle} label="To Collect" value={formatPrice(s.evRem)} color={COLORS[9]} />
            <Stat icon={Calendar} label="This Month" value={String(s.evThisMonth)} color={COLORS[0]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Event Types" icon={PieIcon}>
              <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={evType} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{evType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT} /></PieChart></ResponsiveContainer>
            </Chart>
            <Chart title="Events by State" icon={MapPin}>
              <ResponsiveContainer width="100%" height={260}><BarChart data={evState} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} /><Tooltip contentStyle={TT} /><Bar dataKey="count" radius={[0, 8, 8, 0]}>{evState.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
            </Chart>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Monthly Bookings" icon={Calendar}>
              <ResponsiveContainer width="100%" height={240}><AreaChart data={monthlyEv}><defs><linearGradient id="eG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS[2]} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Area type="monotone" dataKey="bookings" stroke={COLORS[2]} fill="url(#eG)" strokeWidth={2} /></AreaChart></ResponsiveContainer>
            </Chart>
            <Chart title="Artist Count" icon={Users}>
              <ResponsiveContainer width="100%" height={240}><BarChart data={artistCountData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{artistCountData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
            </Chart>
          </div>
        </TabsContent>

        {/* CUSTOMERS */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat icon={Users} label="Total" value={String(customers.length)} color={COLORS[5]} onClick={() => drill("Customers", customers, [{ key: "full_name", label: "Name" }, { key: "email", label: "Email" }, { key: "city", label: "City" }, { key: "created_at", label: "Joined" }])} />
            <Stat icon={RefreshCw} label="Repeat" value={String(s.repeat)} color={COLORS[6]} />
            <Stat icon={UserCheck} label="Today" value={String(customers.filter(c => new Date(c.created_at).toDateString() === s.today).length)} color={COLORS[0]} />
            <Stat icon={Star} label="Avg Rating" value={s.avgRating + "★"} color={COLORS[4]} />
            <Stat icon={Percent} label="Conversion" value={`${s.conv}%`} color={COLORS[1]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Customer Growth" icon={Users}>
              <ResponsiveContainer width="100%" height={260}><AreaChart data={custGrowth}><defs><linearGradient id="cG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip contentStyle={TT} /><Area type="monotone" dataKey="total" stroke={COLORS[1]} fill="url(#cG)" strokeWidth={2.5} /><Line type="monotone" dataKey="new" stroke={COLORS[5]} strokeWidth={2} dot={{ r: 3 }} /><Legend /></AreaChart></ResponsiveContainer>
            </Chart>
            <Chart title="Age Demographics" icon={Users}>
              <ResponsiveContainer width="100%" height={260}><BarChart data={ageData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{ageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
            </Chart>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Gender Distribution" icon={Heart}>
              <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT} /></PieChart></ResponsiveContainer>
            </Chart>
            <Chart title="Customers by City" icon={MapPin}>
              <ResponsiveContainer width="100%" height={240}><BarChart data={custByCity} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[0, 8, 8, 0]}>{custByCity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
            </Chart>
          </div>
          <Chart title="Review Ratings" icon={Star}>
            <ResponsiveContainer width="100%" height={200}><BarChart data={reviewRatingData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{reviewRatingData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar></BarChart></ResponsiveContainer>
          </Chart>
        </TabsContent>

        {/* ENQUIRIES */}
        <TabsContent value="enquiries" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={MessageCircle} label="Total" value={String(filteredEnquiries.length)} color={COLORS[6]} onClick={() => drill("Enquiries", filteredEnquiries, [{ key: "name", label: "Name" }, { key: "mobile", label: "Mobile" }, { key: "status", label: "Status" }, { key: "source", label: "Source" }, { key: "estimated_price", label: "Price" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={Zap} label="New" value={String(s.newEnq)} color={COLORS[4]} />
            <Stat icon={Star} label="Converted" value={String(s.convEnq)} color={COLORS[1]} />
            <Stat icon={Percent} label="Rate" value={`${s.enqConv}%`} color={COLORS[2]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Enquiry Sources" icon={Globe}><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={enqSource} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{enqSource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT} /></PieChart></ResponsiveContainer></Chart>
            <Chart title="Status Breakdown" icon={BarChart3}><ResponsiveContainer width="100%" height={260}><BarChart data={enqStatus}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{enqStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></Chart>
          </div>
          <Chart title="Monthly Volume" icon={TrendingUp}><ResponsiveContainer width="100%" height={240}><AreaChart data={monthlyEnq}><defs><linearGradient id="enG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[6]} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS[6]} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Area type="monotone" dataKey="count" stroke={COLORS[6]} fill="url(#enG)" strokeWidth={2} /></AreaChart></ResponsiveContainer></Chart>
          <Chart title="Funnel Events" icon={Filter}><ResponsiveContainer width="100%" height={200}><BarChart data={funnelStage}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{funnelStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></Chart>
        </TabsContent>

        {/* WORKSHOP */}
        <TabsContent value="workshop" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={BookOpen} label="Total" value={String(workshopUsers.length)} color={COLORS[7]} />
            <Stat icon={CreditCard} label="Paid" value={String(s.paidWS)} color={COLORS[1]} />
            <Stat icon={DollarSign} label="Revenue" value={formatPrice(s.wsRev)} color={COLORS[0]} />
            <Stat icon={Award} label="Unpaid" value={String(workshopUsers.length - s.paidWS)} color={COLORS[4]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Skill Levels" icon={Award}><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={wsSkill} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{wsSkill.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT} /></PieChart></ResponsiveContainer></Chart>
            <Chart title="Occupations" icon={Briefcase}><ResponsiveContainer width="100%" height={260}><BarChart data={wsOcc}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{wsOcc.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></Chart>
          </div>
          <Chart title="Monthly Signups" icon={TrendingUp}><ResponsiveContainer width="100%" height={240}><BarChart data={wsMonthly}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="signups" fill={COLORS[7]} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Chart>
        </TabsContent>

        {/* SHOP */}
        <TabsContent value="shop" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={ShoppingBag} label="Total" value={String(filteredShop.length)} color={COLORS[3]} onClick={() => drill("Shop Orders", filteredShop, [{ key: "order_number", label: "Order" }, { key: "total_amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "payment_status", label: "Payment" }, { key: "created_at", label: "Date" }])} />
            <Stat icon={DollarSign} label="Revenue" value={formatPrice(s.shopRev)} color={COLORS[1]} />
            <Stat icon={CreditCard} label="Paid" value={String(s.ps.length)} color={COLORS[0]} />
            <Stat icon={Clock} label="Pending" value={String(filteredShop.length - s.ps.length)} color={COLORS[4]} />
          </div>
          <Chart title="Monthly Shop Performance" icon={ShoppingBag}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={shopMonthly}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar yAxisId="right" dataKey="orders" fill={COLORS[3]} radius={[6, 6, 0, 0]} barSize={24} /><Line yAxisId="left" type="monotone" dataKey="revenue" stroke={COLORS[1]} strokeWidth={2.5} dot={{ r: 4 }} /><Legend /></ComposedChart>
            </ResponsiveContainer>
          </Chart>
        </TabsContent>

        {/* ENGAGEMENT */}
        <TabsContent value="engagement" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat icon={MessageCircle} label="Chat Sessions" value={String(chatSessions.length)} color={COLORS[2]} />
            <Stat icon={Activity} label="Active" value={String(s.activeChat)} color={COLORS[1]} />
            <Stat icon={FileText} label="Blog Posts" value={String(s.pubPosts)} color={COLORS[0]} />
            <Stat icon={Eye} label="Funnel Events" value={String(funnelEvents.length)} color={COLORS[5]} />
            <Stat icon={Star} label="Reviews" value={String(reviews.length)} color={COLORS[4]} onClick={() => drill("Reviews", reviews, [{ key: "rating", label: "Rating" }, { key: "review_type", label: "Type" }, { key: "comment", label: "Comment" }, { key: "created_at", label: "Date" }])} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Chat Status" icon={MessageCircle}><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={chatStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{chatStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT} /></PieChart></ResponsiveContainer></Chart>
            <Chart title="Blog Categories" icon={BookOpen}><ResponsiveContainer width="100%" height={260}><BarChart data={blogCats}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={TT} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{blogCats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></Chart>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Chart = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
    <Card className="overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(40,50%,98%), hsl(40,50%,96%))", border: "1px solid hsl(30,20%,88%)", boxShadow: "0 4px 14px hsl(30 20% 45% / 0.06)" }}>
      <CardHeader className="pb-2"><CardTitle className="text-base font-bold flex items-center gap-2"><Icon className="w-5 h-5" style={{ color: "hsl(36,45%,52%)" }} />{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </motion.div>
);

const Stat = ({ icon: Icon, label, value, color, onClick }: { icon: any; label: string; value: string; color: string; onClick?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 ${onClick ? "cursor-pointer active:scale-95" : ""}`}
    style={{ background: "linear-gradient(145deg, hsl(40,50%,98%), hsl(40,50%,95%))", border: "1px solid hsl(30,20%,88%)", boxShadow: "0 4px 14px hsl(30 20% 45% / 0.06), inset 0 1px 0 hsl(40,60%,99%)" }}
    onClick={onClick} whileHover={onClick ? { scale: 1.02 } : undefined} whileTap={onClick ? { scale: 0.97 } : undefined}
  >
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6" style={{ background: color }} />
    <div className="flex items-center gap-3 relative z-10">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: color }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg md:text-xl font-bold truncate">{value}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground">{label}</p>
        {onClick && <ChevronRight className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />}
      </div>
    </div>
  </motion.div>
);

export default AdminAnalytics;
