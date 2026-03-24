import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/pricing";
import { Search, CreditCard, Plus } from "lucide-react";
import ExportButton from "@/components/admin/ExportButton";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type Payment = {
  id: string;
  user_id: string | null;
  payment_type: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  order_id: string | null;
  booking_id: string | null;
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  order: "Order",
  event_advance: "Event Advance",
  event_remaining: "Event Remaining",
  manual: "Manual Entry",
};

const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});
  const [profileList, setProfileList] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; client_name: string; event_type: string; event_date: string }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Manual entry form
  const [manualUserId, setManualUserId] = useState("");
  const [manualBookingId, setManualBookingId] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualPaymentId, setManualPaymentId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 16));
  const [manualStatus, setManualStatus] = useState("confirmed");
  const [manualType, setManualType] = useState("manual");
  const [userSearch, setUserSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchProfiles();
    fetchEvents();
    const channel = supabase
      .channel("admin-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history" }, () => fetchPayments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payment_history")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    if (data) setPayments(data);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email");
    if (data) {
      const map: Record<string, { name: string; email: string }> = {};
      data.forEach((p: any) => { map[p.user_id] = { name: p.full_name, email: p.email }; });
      setProfiles(map);
      setProfileList(data as any);
    }
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from("event_bookings").select("id, client_name, event_type, event_date").order("event_date", { ascending: false });
    if (data) setEvents(data as any);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  };

  const handleManualAdd = async () => {
    if (!manualAmount || Number(manualAmount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const bookingVal = (!manualBookingId || manualBookingId === "none") ? null : manualBookingId;
    const { error } = await supabase.from("payment_history").insert({
      user_id: manualUserId || null,
      booking_id: bookingVal,
      payment_type: manualType,
      razorpay_payment_id: manualPaymentId || null,
      amount: Number(manualAmount),
      status: manualStatus,
      description: manualDescription || null,
      created_at: new Date(manualDate).toISOString(),
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Added ✅" });
      setDialogOpen(false);
      setManualUserId(""); setManualBookingId(""); setManualDescription("");
      setManualPaymentId(""); setManualAmount(""); setManualStatus("confirmed");
      setManualType("manual"); setManualDate(new Date().toISOString().slice(0, 16));
    }
  };

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const userName = p.user_id ? (profiles[p.user_id]?.name || "").toLowerCase() : "";
    return userName.includes(q) || (p.razorpay_payment_id || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const filteredUsers = profileList.filter(p =>
    !userSearch || p.full_name.toLowerCase().includes(userSearch.toLowerCase()) || p.email.toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 20);
  const userEvents = manualUserId ? events.filter(e => true) : events;

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p>;

  return (
    <div className="space-y-4">
      {/* 3D Revenue Widget */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
        {[
          { icon: CreditCard, label: "Total Revenue", value: formatPrice(totalRevenue), gradient: "from-emerald-50 to-green-50", iconBg: "from-emerald-500 to-green-500", borderAccent: "border-l-emerald-500" },
          { icon: CreditCard, label: "Total Payments", value: String(payments.length), gradient: "from-blue-50 to-indigo-50", iconBg: "from-blue-500 to-indigo-500", borderAccent: "border-l-blue-500" },
          { icon: CreditCard, label: "Confirmed", value: String(payments.filter(p => p.status === "confirmed").length), gradient: "from-violet-50 to-purple-50", iconBg: "from-violet-500 to-purple-500", borderAccent: "border-l-violet-500" },
        ].map((w, i) => (
          <motion.div key={w.label} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.35, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ y: -6, scale: 1.04, transition: { duration: 0.2 } }}
            className="cursor-pointer">
            <div className={`admin-widget-3d bg-gradient-to-br ${w.gradient} border-l-4 ${w.borderAccent}`}>
              <div className="p-3 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${w.iconBg} flex items-center justify-center shadow-lg`}>
                    <w.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-lg font-extrabold text-foreground leading-tight">{w.value}</p>
                <p className="text-[10px] text-muted-foreground font-sans mt-0.5 font-medium">{w.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">All Payments</h2>
        <div className="flex items-center gap-2 flex-wrap">

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Manual</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Add Manual Payment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* User Selection */}
                <div>
                  <Label className="font-body text-sm">Select User</Label>
                  <Input placeholder="Search user by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="mb-2" />
                  <Select value={manualUserId} onValueChange={setManualUserId}>
                    <SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.full_name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Event Selection */}
                <div>
                  <Label className="font-body text-sm">Link to Event (optional)</Label>
                  <Select value={manualBookingId} onValueChange={setManualBookingId}>
                    <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event</SelectItem>
                      {userEvents.slice(0, 30).map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.client_name} - {e.event_type} ({e.event_date})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Type */}
                <div>
                  <Label className="font-body text-sm">Payment Type</Label>
                  <Select value={manualType} onValueChange={setManualType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="order">Order</SelectItem>
                      <SelectItem value="event_advance">Event Advance</SelectItem>
                      <SelectItem value="event_remaining">Event Remaining</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <Label className="font-body text-sm">Description</Label>
                  <Textarea placeholder="Payment for..." value={manualDescription} onChange={e => setManualDescription(e.target.value)} />
                </div>

                {/* Payment ID */}
                <div>
                  <Label className="font-body text-sm">Payment ID (optional)</Label>
                  <Input placeholder="Razorpay/UPI/Cash ID" value={manualPaymentId} onChange={e => setManualPaymentId(e.target.value)} />
                </div>

                {/* Amount */}
                <div>
                  <Label className="font-body text-sm">Amount (₹)</Label>
                  <Input type="number" placeholder="Enter amount" value={manualAmount} onChange={e => setManualAmount(e.target.value)} />
                </div>

                {/* Date */}
                <div>
                  <Label className="font-body text-sm">Date & Time</Label>
                  <Input type="datetime-local" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                </div>

                {/* Status */}
                <div>
                  <Label className="font-body text-sm">Status</Label>
                  <Select value={manualStatus} onValueChange={setManualStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed / Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleManualAdd} disabled={submitting} className="w-full">
                  {submitting ? "Adding..." : "Add Payment Record"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <ExportButton
            data={filtered.map(p => ({
              "Customer": p.user_id ? (profiles[p.user_id]?.name || "Unknown") : "—",
              "Type": PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type,
              "Description": p.description || "—",
              "Payment ID": p.razorpay_payment_id || "—",
              "Amount": p.amount,
              "Date": new Date(p.created_at).toLocaleString("en-IN"),
              "Status": p.status,
            }))}
            sheetName="Payments"
            fileName="CCC_Payments"
          />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, payment ID, or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-sans" />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans">Customer</TableHead>
              <TableHead className="font-sans">Type</TableHead>
              <TableHead className="font-sans">Description</TableHead>
              <TableHead className="font-sans">Payment ID</TableHead>
              <TableHead className="font-sans">Amount</TableHead>
              <TableHead className="font-sans">Date & Time</TableHead>
              <TableHead className="font-sans">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-sans text-sm">{p.user_id ? (profiles[p.user_id]?.name || "Unknown") : "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}</Badge></TableCell>
                <TableCell className="font-sans text-sm max-w-[200px] truncate">{p.description || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{p.razorpay_payment_id || "—"}</TableCell>
                <TableCell className="font-display font-bold text-primary">{formatPrice(p.amount)}</TableCell>
                <TableCell className="font-sans text-xs">{formatDateTime(p.created_at)}</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800 border-none text-xs">{p.status === "confirmed" ? "Paid ✅" : p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards - Modern */}
      <div className="block md:hidden space-y-3">
        {filtered.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 group hover:border-blue-500/30 transition-all">
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 opacity-5" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="font-sans font-semibold text-sm text-foreground">{p.user_id ? (profiles[p.user_id]?.name || "Unknown") : "—"}</p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">{p.description || "—"}</p>
                  <p className="text-xs text-muted-foreground font-sans">{formatDateTime(p.created_at)}</p>
                </div>
                <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">{formatPrice(p.amount)}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">{p.status === "confirmed" ? "Paid ✅" : p.status}</Badge>
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">{PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}</Badge>
              </div>
              {p.razorpay_payment_id && (
                <p className="text-xs font-mono text-muted-foreground mt-2">ID: {p.razorpay_payment_id}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center">
          <p className="text-muted-foreground font-sans">No payments found</p>
        </CardContent></Card>
      )}
    </div>
  );
};

export default AdminPayments;
