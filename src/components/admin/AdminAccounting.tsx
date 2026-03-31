import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToExcel } from "@/lib/export-excel";
import {
  IndianRupee, TrendingUp, TrendingDown, BookOpen, FileText, PieChart,
  Download, Calendar, CheckCircle2, AlertCircle, BarChart3, Wallet,
  ArrowUpRight, ArrowDownRight, Banknote, Receipt
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const FY_START = "2025-02-15";
const FY_END = "2026-03-31";
const FY_LABEL = "FY 2025-26 (Feb 15, 2025 – Mar 31, 2026)";

type FinancialData = {
  orders: any[];
  events: any[];
  payments: any[];
  artistPayouts: any[];
  artistTransactions: any[];
  shopOrders: any[];
};

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n);

const AdminAccounting = () => {
  const [data, setData] = useState<FinancialData>({ orders: [], events: [], payments: [], artistPayouts: [], artistTransactions: [], shopOrders: [] });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    const load = async () => {
      const [orders, events, payments, payouts, transactions, shopOrders] = await Promise.all([
        supabase.from("orders").select("*").gte("created_at", FY_START).lte("created_at", FY_END + "T23:59:59"),
        supabase.from("event_bookings").select("*").gte("created_at", FY_START).lte("created_at", FY_END + "T23:59:59"),
        supabase.from("payment_history").select("*").gte("created_at", FY_START).lte("created_at", FY_END + "T23:59:59"),
        supabase.from("artist_event_payouts").select("*").gte("created_at", FY_START).lte("created_at", FY_END + "T23:59:59"),
        supabase.from("artist_transactions").select("*").gte("created_at", FY_START).lte("created_at", FY_END + "T23:59:59"),
        supabase.from("shop_orders" as any).select("*").gte("created_at", FY_START).lte("created_at", FY_END + "T23:59:59"),
      ]);
      setData({
        orders: orders.data || [],
        events: events.data || [],
        payments: payments.data || [],
        artistPayouts: payouts.data || [],
        artistTransactions: transactions.data || [],
        shopOrders: shopOrders.data || [],
      });
      setLoading(false);
    };
    load();
  }, []);

  const pnl = useMemo(() => {
    const orderRevenue = data.orders.reduce((s, o) => s + (o.negotiated_amount || o.amount || 0), 0);
    const eventRevenue = data.events.reduce((s, e) => s + (e.total_price || 0), 0);
    const eventAdvances = data.events.reduce((s, e) => s + (e.advance_amount || 0), 0);
    const paymentReceived = data.payments.reduce((s, p) => s + (p.amount || 0), 0);
    const shopRevenue = data.shopOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

    const totalRevenue = orderRevenue + eventRevenue + shopRevenue;
    const totalReceived = paymentReceived;

    const artistCosts = data.artistPayouts.reduce((s, p) => s + (p.calculated_amount || 0), 0);
    const artistDebits = data.artistTransactions.filter((t: any) => t.transaction_type === "debit").reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalExpenses = artistCosts + artistDebits;

    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit; // no tax/overhead data available
    const outstandingReceivables = totalRevenue - totalReceived;

    return {
      orderRevenue, eventRevenue, shopRevenue, totalRevenue,
      eventAdvances, totalReceived,
      artistCosts, artistDebits, totalExpenses,
      grossProfit, netProfit, outstandingReceivables,
      orderCount: data.orders.length,
      eventCount: data.events.length,
      shopOrderCount: data.shopOrders.length,
    };
  }, [data]);

  const balanceSheet = useMemo(() => {
    const cashAndBank = pnl.totalReceived;
    const receivables = pnl.outstandingReceivables > 0 ? pnl.outstandingReceivables : 0;
    const totalAssets = cashAndBank + receivables;

    const payablesToArtists = pnl.artistCosts;
    const retainedEarnings = pnl.netProfit;
    const totalLiabilitiesEquity = payablesToArtists + retainedEarnings;

    return { cashAndBank, receivables, totalAssets, payablesToArtists, retainedEarnings, totalLiabilitiesEquity };
  }, [pnl]);

  const monthlyBreakdown = useMemo(() => {
    const months: Record<string, { revenue: number; expenses: number; received: number }> = {};
    const addMonth = (dateStr: string, field: "revenue" | "expenses" | "received", amount: number) => {
      const key = format(new Date(dateStr), "yyyy-MM");
      if (!months[key]) months[key] = { revenue: 0, expenses: 0, received: 0 };
      months[key][field] += amount;
    };
    data.orders.forEach(o => addMonth(o.created_at, "revenue", o.negotiated_amount || o.amount || 0));
    data.events.forEach(e => addMonth(e.created_at, "revenue", e.total_price || 0));
    data.shopOrders.forEach(o => addMonth(o.created_at, "revenue", o.total_amount || 0));
    data.payments.forEach(p => addMonth(p.created_at, "received", p.amount || 0));
    data.artistPayouts.forEach(p => addMonth(p.created_at, "expenses", p.calculated_amount || 0));
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, vals]) => ({
      month: format(new Date(month + "-01"), "MMM yyyy"),
      ...vals,
      profit: vals.revenue - vals.expenses,
    }));
  }, [data]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const StatCard = ({ icon: Icon, label, value, sub, trend }: { icon: any; label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral" }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            {trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-500" />}
          </div>
          <p className="text-xs text-muted-foreground font-sans">{label}</p>
          <p className="text-lg font-bold font-display text-foreground">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );

  const exportPnL = () => {
    const rows = [
      { Category: "REVENUE", Item: "Caricature Orders", Amount: pnl.orderRevenue, Count: pnl.orderCount },
      { Category: "", Item: "Event Bookings", Amount: pnl.eventRevenue, Count: pnl.eventCount },
      { Category: "", Item: "Shop Orders", Amount: pnl.shopRevenue, Count: pnl.shopOrderCount },
      { Category: "", Item: "TOTAL REVENUE", Amount: pnl.totalRevenue, Count: "" },
      { Category: "EXPENSES", Item: "Artist Payouts", Amount: pnl.artistCosts, Count: "" },
      { Category: "", Item: "Artist Debits", Amount: pnl.artistDebits, Count: "" },
      { Category: "", Item: "TOTAL EXPENSES", Amount: pnl.totalExpenses, Count: "" },
      { Category: "PROFIT", Item: "Gross Profit", Amount: pnl.grossProfit, Count: "" },
      { Category: "", Item: "Net Profit", Amount: pnl.netProfit, Count: "" },
    ];
    exportToExcel(rows, "PnL", "PnL_FY2025-26");
  };

  const exportBalanceSheet = () => {
    const rows = [
      { Section: "ASSETS", Item: "Cash & Bank (Received)", Amount: balanceSheet.cashAndBank },
      { Section: "", Item: "Accounts Receivable", Amount: balanceSheet.receivables },
      { Section: "", Item: "TOTAL ASSETS", Amount: balanceSheet.totalAssets },
      { Section: "LIABILITIES", Item: "Payable to Artists", Amount: balanceSheet.payablesToArtists },
      { Section: "EQUITY", Item: "Retained Earnings (Net Profit)", Amount: balanceSheet.retainedEarnings },
      { Section: "", Item: "TOTAL LIABILITIES + EQUITY", Amount: balanceSheet.totalLiabilitiesEquity },
    ];
    exportToExcel(rows, "BalanceSheet", "BalanceSheet_FY2025-26");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Accounting
          </h2>
          <p className="text-xs text-muted-foreground font-sans">{FY_LABEL}</p>
          <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> FY Closed — 31 Mar 2026
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportPnL} className="text-xs rounded-xl">
            <Download className="w-3 h-3 mr-1" /> P&L CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportBalanceSheet} className="text-xs rounded-xl">
            <Download className="w-3 h-3 mr-1" /> Balance Sheet CSV
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="Total Revenue" value={fmt(pnl.totalRevenue)} sub={`${pnl.orderCount + pnl.eventCount + pnl.shopOrderCount} transactions`} trend="up" />
        <StatCard icon={Wallet} label="Total Received" value={fmt(pnl.totalReceived)} sub="Cash in bank" trend="up" />
        <StatCard icon={Banknote} label="Total Expenses" value={fmt(pnl.totalExpenses)} sub="Artist payouts" trend={pnl.totalExpenses > 0 ? "down" : "neutral"} />
        <StatCard icon={TrendingUp} label="Net Profit" value={fmt(pnl.netProfit)} sub={pnl.totalRevenue > 0 ? `${((pnl.netProfit / pnl.totalRevenue) * 100).toFixed(1)}% margin` : "—"} trend={pnl.netProfit >= 0 ? "up" : "down"} />
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="w-full overflow-x-auto flex">
          <TabsTrigger value="overview" className="text-xs"><PieChart className="w-3 h-3 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="pnl" className="text-xs"><FileText className="w-3 h-3 mr-1" />P&L</TabsTrigger>
          <TabsTrigger value="balance" className="text-xs"><BookOpen className="w-3 h-3 mr-1" />Balance Sheet</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs"><BarChart3 className="w-3 h-3 mr-1" />Monthly</TabsTrigger>
          <TabsTrigger value="receivables" className="text-xs"><Receipt className="w-3 h-3 mr-1" />Receivables</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Caricature Orders", value: pnl.orderRevenue, count: pnl.orderCount, color: "bg-blue-500" },
                  { label: "Event Bookings", value: pnl.eventRevenue, count: pnl.eventCount, color: "bg-violet-500" },
                  { label: "Shop Orders", value: pnl.shopRevenue, count: pnl.shopOrderCount, color: "bg-amber-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm font-sans">{item.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{item.count}</Badge>
                    </div>
                    <span className="text-sm font-bold font-mono">{fmt(item.value)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-sm font-bold font-sans">Total Revenue</span>
                  <span className="text-sm font-bold font-mono text-emerald-600">{fmt(pnl.totalRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Artist Payouts", value: pnl.artistCosts, color: "bg-red-500" },
                  { label: "Artist Debits", value: pnl.artistDebits, color: "bg-orange-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm font-sans">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold font-mono">{fmt(item.value)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-sm font-bold font-sans">Total Expenses</span>
                  <span className="text-sm font-bold font-mono text-red-600">{fmt(pnl.totalExpenses)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-sm font-bold font-sans text-emerald-700">Net Profit</span>
                  <span className={`text-sm font-bold font-mono ${pnl.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(pnl.netProfit)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FY Summary Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold font-display">Financial Year Summary — Closed</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Period</p>
                  <p className="text-xs font-bold">15 Feb 2025 – 31 Mar 2026</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                  <p className="text-xs font-bold text-emerald-600">{fmt(pnl.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Profit</p>
                  <p className={`text-xs font-bold ${pnl.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(pnl.netProfit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Outstanding</p>
                  <p className="text-xs font-bold text-amber-600">{fmt(pnl.outstandingReceivables > 0 ? pnl.outstandingReceivables : 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* P&L Statement */}
        <TabsContent value="pnl">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-display">Profit & Loss Statement</CardTitle>
              <Button size="sm" variant="ghost" onClick={exportPnL} className="text-xs"><Download className="w-3 h-3 mr-1" />Export</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Particulars</TableHead>
                    <TableHead className="text-xs text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-emerald-50/50"><TableCell className="font-bold text-xs text-emerald-700" colSpan={2}>INCOME / REVENUE</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Caricature Orders ({pnl.orderCount})</TableCell><TableCell className="text-xs text-right font-mono">{fmt(pnl.orderRevenue)}</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Event Bookings ({pnl.eventCount})</TableCell><TableCell className="text-xs text-right font-mono">{fmt(pnl.eventRevenue)}</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Shop Orders ({pnl.shopOrderCount})</TableCell><TableCell className="text-xs text-right font-mono">{fmt(pnl.shopRevenue)}</TableCell></TableRow>
                  <TableRow className="border-t-2 border-emerald-200"><TableCell className="text-xs font-bold">Total Revenue</TableCell><TableCell className="text-xs text-right font-mono font-bold text-emerald-700">{fmt(pnl.totalRevenue)}</TableCell></TableRow>

                  <TableRow className="bg-red-50/50"><TableCell className="font-bold text-xs text-red-700" colSpan={2}>EXPENSES</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Artist Payouts</TableCell><TableCell className="text-xs text-right font-mono">{fmt(pnl.artistCosts)}</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Artist Debits</TableCell><TableCell className="text-xs text-right font-mono">{fmt(pnl.artistDebits)}</TableCell></TableRow>
                  <TableRow className="border-t-2 border-red-200"><TableCell className="text-xs font-bold">Total Expenses</TableCell><TableCell className="text-xs text-right font-mono font-bold text-red-700">{fmt(pnl.totalExpenses)}</TableCell></TableRow>

                  <TableRow className="bg-primary/5 border-t-2"><TableCell className="text-sm font-bold">GROSS PROFIT</TableCell><TableCell className={`text-sm text-right font-mono font-bold ${pnl.grossProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(pnl.grossProfit)}</TableCell></TableRow>
                  <TableRow className="bg-primary/10"><TableCell className="text-sm font-bold">NET PROFIT</TableCell><TableCell className={`text-sm text-right font-mono font-bold ${pnl.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(pnl.netProfit)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-display">Balance Sheet — As on 31 Mar 2026</CardTitle>
              <Button size="sm" variant="ghost" onClick={exportBalanceSheet} className="text-xs"><Download className="w-3 h-3 mr-1" />Export</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Particulars</TableHead>
                    <TableHead className="text-xs text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50/50"><TableCell className="font-bold text-xs text-blue-700" colSpan={2}>ASSETS</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Cash & Bank (Payments Received)</TableCell><TableCell className="text-xs text-right font-mono">{fmt(balanceSheet.cashAndBank)}</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Accounts Receivable (Outstanding)</TableCell><TableCell className="text-xs text-right font-mono">{fmt(balanceSheet.receivables)}</TableCell></TableRow>
                  <TableRow className="border-t-2 border-blue-200"><TableCell className="text-xs font-bold">Total Assets</TableCell><TableCell className="text-xs text-right font-mono font-bold text-blue-700">{fmt(balanceSheet.totalAssets)}</TableCell></TableRow>

                  <TableRow className="bg-amber-50/50"><TableCell className="font-bold text-xs text-amber-700" colSpan={2}>LIABILITIES</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Payable to Artists</TableCell><TableCell className="text-xs text-right font-mono">{fmt(balanceSheet.payablesToArtists)}</TableCell></TableRow>
                  <TableRow className="border-t-2 border-amber-200"><TableCell className="text-xs font-bold">Total Liabilities</TableCell><TableCell className="text-xs text-right font-mono font-bold text-amber-700">{fmt(balanceSheet.payablesToArtists)}</TableCell></TableRow>

                  <TableRow className="bg-emerald-50/50"><TableCell className="font-bold text-xs text-emerald-700" colSpan={2}>EQUITY</TableCell></TableRow>
                  <TableRow><TableCell className="text-xs pl-6">Retained Earnings (Net Profit)</TableCell><TableCell className="text-xs text-right font-mono">{fmt(balanceSheet.retainedEarnings)}</TableCell></TableRow>
                  <TableRow className="border-t-2 border-emerald-200"><TableCell className="text-xs font-bold">Total Equity</TableCell><TableCell className="text-xs text-right font-mono font-bold text-emerald-700">{fmt(balanceSheet.retainedEarnings)}</TableCell></TableRow>

                  <TableRow className="bg-primary/10 border-t-2"><TableCell className="text-sm font-bold">TOTAL LIABILITIES + EQUITY</TableCell><TableCell className="text-sm text-right font-mono font-bold">{fmt(balanceSheet.totalLiabilitiesEquity)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Breakdown */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Monthly Revenue & Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Month</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                    <TableHead className="text-xs text-right">Received</TableHead>
                    <TableHead className="text-xs text-right">Expenses</TableHead>
                    <TableHead className="text-xs text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyBreakdown.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="text-xs font-sans">{m.month}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(m.revenue)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(m.received)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(m.expenses)}</TableCell>
                      <TableCell className={`text-xs text-right font-mono font-bold ${m.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(m.profit)}</TableCell>
                    </TableRow>
                  ))}
                  {monthlyBreakdown.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No data for this period</TableCell></TableRow>
                  )}
                  {monthlyBreakdown.length > 0 && (
                    <TableRow className="border-t-2 bg-muted/30">
                      <TableCell className="text-xs font-bold">TOTAL</TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold">{fmt(monthlyBreakdown.reduce((s, m) => s + m.revenue, 0))}</TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold">{fmt(monthlyBreakdown.reduce((s, m) => s + m.received, 0))}</TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold">{fmt(monthlyBreakdown.reduce((s, m) => s + m.expenses, 0))}</TableCell>
                      <TableCell className={`text-xs text-right font-mono font-bold ${monthlyBreakdown.reduce((s, m) => s + m.profit, 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmt(monthlyBreakdown.reduce((s, m) => s + m.profit, 0))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receivables */}
        <TabsContent value="receivables">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Outstanding Receivables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Advance Paid</TableHead>
                    <TableHead className="text-xs text-right">Remaining</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.filter(e => e.payment_status !== "fully_paid").map((e: any) => {
                    const remaining = (e.remaining_amount != null ? e.remaining_amount : (e.total_price || 0) - (e.advance_amount || 0));
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{e.client_name}</TableCell>
                        <TableCell className="text-xs">Event</TableCell>
                        <TableCell className="text-xs">{e.event_date}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(e.total_price || 0)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(e.advance_amount || 0)}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-amber-600">{fmt(remaining > 0 ? remaining : 0)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{e.payment_status || "pending"}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                  {data.orders.filter(o => o.payment_status !== "confirmed").map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs">{o.customer_name}</TableCell>
                      <TableCell className="text-xs">Order</TableCell>
                      <TableCell className="text-xs">{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(o.amount || 0)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">—</TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-amber-600">{fmt(o.amount || 0)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{o.payment_status || "pending"}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {data.events.filter(e => e.payment_status !== "fully_paid").length === 0 && data.orders.filter(o => o.payment_status !== "confirmed").length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">🎉 No outstanding receivables!</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAccounting;
