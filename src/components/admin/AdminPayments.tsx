import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/pricing";
import { Search, CreditCard } from "lucide-react";

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
};

const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
    fetchProfiles();
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
      const map: Record<string, string> = {};
      data.forEach((p: any) => { map[p.user_id] = `${p.full_name} (${p.email})`; });
      setProfiles(map);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  };

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const userName = p.user_id ? (profiles[p.user_id] || "").toLowerCase() : "";
    return userName.includes(q) || (p.razorpay_payment_id || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <h2 className="font-display text-xl font-bold">All Payments ({payments.length})</h2>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-sans text-sm">Total Revenue:</span>
            <span className="font-display font-bold text-primary">{formatPrice(totalRevenue)}</span>
          </CardContent>
        </Card>
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
                <TableCell className="font-sans text-sm">{p.user_id ? (profiles[p.user_id] || "Unknown") : "—"}</TableCell>
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

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-sans font-medium text-sm">{p.user_id ? (profiles[p.user_id] || "Unknown") : "—"}</p>
                  <p className="text-xs text-muted-foreground font-sans">{p.description || "—"}</p>
                  <p className="text-xs text-muted-foreground font-sans">{formatDateTime(p.created_at)}</p>
                </div>
                <p className="font-display text-lg font-bold text-primary">{formatPrice(p.amount)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-800 border-none text-xs">{p.status === "confirmed" ? "Paid ✅" : p.status}</Badge>
                <Badge variant="outline" className="text-xs">{PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}</Badge>
              </div>
              {p.razorpay_payment_id && (
                <p className="text-xs font-mono text-muted-foreground">ID: {p.razorpay_payment_id}</p>
              )}
            </CardContent>
          </Card>
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
