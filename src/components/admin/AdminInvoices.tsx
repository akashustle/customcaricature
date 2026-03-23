import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { Search, FileText, Edit2, Trash2, Plus, Download, Eye, Loader2 } from "lucide-react";
import ExportButton from "@/components/admin/ExportButton";
import SecureDeleteConfirm from "@/components/admin/SecureDeleteConfirm";
import { motion } from "framer-motion";

type Invoice = {
  id: string; invoice_number: string; invoice_type: string; customer_name: string;
  customer_email: string; customer_mobile: string; amount: number; tax_amount: number;
  total_amount: number; items: any; notes: string | null; status: string;
  payment_method: string | null; order_id: string | null; booking_id: string | null;
  shop_order_id: string | null; payment_id: string | null; user_id: string | null;
  created_at: string; updated_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200", refunded: "bg-amber-50 text-amber-700 border-amber-200",
};

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editData, setEditData] = useState<Partial<Invoice>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customer_name: "", customer_email: "", customer_mobile: "", amount: 0,
    tax_amount: 0, total_amount: 0, invoice_type: "order", status: "draft",
    payment_method: "razorpay", notes: "", items: "[]",
  });

  const fetchInvoices = async () => {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
    if (data) setInvoices(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
    const ch = supabase.channel("admin-invoices").on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => fetchInvoices()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (inv: Invoice) => { setEditInvoice(inv); setEditData(inv); };

  const saveEdit = async () => {
    if (!editInvoice) return;
    setSaving(true);
    const { error } = await supabase.from("invoices").update({
      customer_name: editData.customer_name, customer_email: editData.customer_email,
      customer_mobile: editData.customer_mobile, amount: editData.amount,
      tax_amount: editData.tax_amount, total_amount: editData.total_amount,
      notes: editData.notes, status: editData.status, payment_method: editData.payment_method,
      items: typeof editData.items === "string" ? JSON.parse(editData.items || "[]") : editData.items,
    }).eq("id", editInvoice.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Invoice Updated!" }); setEditInvoice(null); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("invoices").delete().eq("id", deleteId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Invoice Deleted" });
    setDeleteId(null);
  };

  const handleCreate = async () => {
    setSaving(true);
    let parsedItems: any = [];
    try { parsedItems = JSON.parse(newInvoice.items); } catch { parsedItems = []; }
    const { error } = await supabase.from("invoices").insert({
      customer_name: newInvoice.customer_name, customer_email: newInvoice.customer_email,
      customer_mobile: newInvoice.customer_mobile, amount: newInvoice.amount,
      tax_amount: newInvoice.tax_amount, total_amount: newInvoice.total_amount || (newInvoice.amount + newInvoice.tax_amount),
      invoice_type: newInvoice.invoice_type, status: newInvoice.status,
      payment_method: newInvoice.payment_method, notes: newInvoice.notes || null,
      items: parsedItems,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Invoice Created!" }); setCreateOpen(false); setNewInvoice({ customer_name: "", customer_email: "", customer_mobile: "", amount: 0, tax_amount: 0, total_amount: 0, invoice_type: "order", status: "draft", payment_method: "razorpay", notes: "", items: "[]" }); }
    setSaving(false);
  };

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);
  const draftCount = invoices.filter(i => i.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" />Invoices</h2>
          <p className="text-sm text-muted-foreground font-sans">{invoices.length} total • {draftCount} drafts • {formatPrice(totalRevenue)} revenue</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)} size="sm" className="rounded-full font-sans"><Plus className="w-4 h-4 mr-1" />Create Invoice</Button>
          <ExportButton data={invoices.map(i => ({ Invoice: i.invoice_number, Customer: i.customer_name, Amount: i.amount, Tax: i.tax_amount, Total: i.total_amount, Status: i.status, Date: new Date(i.created_at).toLocaleDateString() }))} fileName="invoices" sheetName="Invoices" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Invoices", value: invoices.length, color: "text-blue-600" },
          { label: "Paid", value: invoices.filter(i => i.status === "paid").length, color: "text-emerald-600" },
          { label: "Draft", value: draftCount, color: "text-amber-600" },
          { label: "Revenue", value: formatPrice(totalRevenue), color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card><CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground font-sans">{s.label}</p>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-10 font-sans" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-sans">Invoice #</TableHead>
                <TableHead className="font-sans">Customer</TableHead>
                <TableHead className="font-sans">Type</TableHead>
                <TableHead className="font-sans">Amount</TableHead>
                <TableHead className="font-sans">Status</TableHead>
                <TableHead className="font-sans">Date</TableHead>
                <TableHead className="font-sans">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-sans">No invoices found</TableCell></TableRow>
              ) : filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell className="font-sans">
                    <p className="font-medium text-sm">{inv.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer_email}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-sans capitalize">{inv.invoice_type}</Badge></TableCell>
                  <TableCell className="font-sans font-medium">{formatPrice(inv.total_amount)}</TableCell>
                  <TableCell><Badge className={`${STATUS_COLORS[inv.status] || ""} font-sans capitalize`}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground font-sans">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(inv)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editInvoice} onOpenChange={() => setEditInvoice(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Invoice {editData.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-sans">Customer Name</Label><Input value={editData.customer_name || ""} onChange={e => setEditData(p => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label className="font-sans">Email</Label><Input value={editData.customer_email || ""} onChange={e => setEditData(p => ({ ...p, customer_email: e.target.value }))} /></div>
            <div><Label className="font-sans">Mobile</Label><Input value={editData.customer_mobile || ""} onChange={e => setEditData(p => ({ ...p, customer_mobile: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="font-sans">Amount</Label><Input type="number" value={editData.amount || 0} onChange={e => setEditData(p => ({ ...p, amount: +e.target.value }))} /></div>
              <div><Label className="font-sans">Tax</Label><Input type="number" value={editData.tax_amount || 0} onChange={e => setEditData(p => ({ ...p, tax_amount: +e.target.value }))} /></div>
              <div><Label className="font-sans">Total</Label><Input type="number" value={editData.total_amount || 0} onChange={e => setEditData(p => ({ ...p, total_amount: +e.target.value }))} /></div>
            </div>
            <div><Label className="font-sans">Status</Label>
              <Select value={editData.status || "draft"} onValueChange={v => setEditData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="font-sans">Payment Method</Label><Input value={editData.payment_method || ""} onChange={e => setEditData(p => ({ ...p, payment_method: e.target.value }))} /></div>
            <div><Label className="font-sans">Notes</Label><Textarea value={editData.notes || ""} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} /></div>
            <div><Label className="font-sans">Items (JSON)</Label><Textarea value={typeof editData.items === "string" ? editData.items : JSON.stringify(editData.items || [], null, 2)} onChange={e => setEditData(p => ({ ...p, items: e.target.value }))} className="font-mono text-xs" rows={4} /></div>
            <Button onClick={saveEdit} disabled={saving} className="w-full rounded-full font-sans">{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-sans">Customer Name</Label><Input value={newInvoice.customer_name} onChange={e => setNewInvoice(p => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label className="font-sans">Email</Label><Input value={newInvoice.customer_email} onChange={e => setNewInvoice(p => ({ ...p, customer_email: e.target.value }))} /></div>
            <div><Label className="font-sans">Mobile</Label><Input value={newInvoice.customer_mobile} onChange={e => setNewInvoice(p => ({ ...p, customer_mobile: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="font-sans">Amount</Label><Input type="number" value={newInvoice.amount} onChange={e => setNewInvoice(p => ({ ...p, amount: +e.target.value, total_amount: +e.target.value + p.tax_amount }))} /></div>
              <div><Label className="font-sans">Tax</Label><Input type="number" value={newInvoice.tax_amount} onChange={e => setNewInvoice(p => ({ ...p, tax_amount: +e.target.value, total_amount: p.amount + +e.target.value }))} /></div>
              <div><Label className="font-sans">Total</Label><Input type="number" value={newInvoice.total_amount} onChange={e => setNewInvoice(p => ({ ...p, total_amount: +e.target.value }))} /></div>
            </div>
            <div><Label className="font-sans">Type</Label>
              <Select value={newInvoice.invoice_type} onValueChange={v => setNewInvoice(p => ({ ...p, invoice_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="order">Order</SelectItem><SelectItem value="event">Event</SelectItem><SelectItem value="shop">Shop</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="font-sans">Notes</Label><Textarea value={newInvoice.notes} onChange={e => setNewInvoice(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button onClick={handleCreate} disabled={saving || !newInvoice.customer_name} className="w-full rounded-full font-sans">{saving ? "Creating..." : "Create Invoice"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SecureDeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Invoice" description="This invoice will be permanently deleted." />
    </div>
  );
};

export default AdminInvoices;
