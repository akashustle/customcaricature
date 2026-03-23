import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, Ticket, TrendingUp, BarChart3, Percent, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import SecureDeleteConfirm from "@/components/admin/SecureDeleteConfirm";

const CHART_COLORS = ["hsl(152,45%,42%)", "hsl(210,55%,50%)", "hsl(38,75%,52%)", "hsl(0,50%,55%)", "hsl(270,50%,50%)"];

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [uses, setUses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Form
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percent", discount_value: "10",
    min_order_amount: "0", max_discount_amount: "", max_uses: "",
    valid_until: "", applies_to: "all",
  });

  const fetchData = async () => {
    setLoading(true);
    const [cRes, uRes, pRes] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("coupon_uses").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email").limit(500),
    ]);
    setCoupons(cRes.data || []);
    setUses(uRes.data || []);
    setProfiles(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "CCC";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const handleCreate = async () => {
    if (!form.code.trim()) {
      toast({ title: "Code is required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("coupons").insert({
      code: form.code.toUpperCase().trim(),
      description: form.description,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 10,
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      valid_until: form.valid_until || null,
      applies_to: form.applies_to,
      is_active: true,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Coupon created" });
      setShowCreate(false);
      setForm({ code: "", description: "", discount_type: "percent", discount_value: "10", min_order_amount: "0", max_discount_amount: "", max_uses: "", valid_until: "", applies_to: "all" });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast({ title: "Coupon deleted" });
    setDeleteTarget(null);
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  // Analytics
  const totalDiscountGiven = uses.reduce((s, u) => s + (u.discount_applied || 0), 0);
  const activeCoupons = coupons.filter(c => c.is_active).length;

  // Bar chart: uses by coupon
  const barData = coupons.slice(0, 10).map(c => ({
    name: c.code,
    uses: c.times_used,
  }));

  // Pie: by type
  const byApplies = coupons.reduce((acc: Record<string, number>, c) => {
    acc[c.applies_to] = (acc[c.applies_to] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(byApplies).map(([name, value]) => ({ name, value }));

  const getUserName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || uid?.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Coupons", value: coupons.length, icon: Ticket, color: "text-primary" },
          { label: "Active", value: activeCoupons, icon: TrendingUp, color: "text-success" },
          { label: "Total Uses", value: uses.length, icon: BarChart3, color: "text-info" },
          { label: "Discount Given", value: `₹${totalDiscountGiven}`, icon: DollarSign, color: "text-warning" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                  <p className="text-xl font-bold font-body">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-body">Usage by Coupon</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="uses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-body">By Category</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="font-body font-bold text-lg">Coupons</h3>
        <Button onClick={() => { generateCode(); setShowCreate(true); }} className="rounded-full font-body gap-2">
          <Plus className="w-4 h-4" /> Create Coupon
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Code</TableHead>
                <TableHead className="font-body">Discount</TableHead>
                <TableHead className="font-body">Min Order</TableHead>
                <TableHead className="font-body">Uses</TableHead>
                <TableHead className="font-body">Applies To</TableHead>
                <TableHead className="font-body">Active</TableHead>
                <TableHead className="font-body">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{c.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(c.code)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs gap-1">
                      {c.discount_type === "percent" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                      {c.discount_value}{c.discount_type === "percent" ? "%" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">₹{c.min_order_amount}</TableCell>
                  <TableCell className="text-sm">{c.times_used}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs capitalize">{c.applies_to}</Badge></TableCell>
                  <TableCell><Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No coupons yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Uses */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Recent Coupon Uses</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">User</TableHead>
                <TableHead className="font-body">Coupon</TableHead>
                <TableHead className="font-body">Discount</TableHead>
                <TableHead className="font-body">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uses.slice(0, 20).map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-body">{getUserName(u.user_id)}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-0.5 rounded">{coupons.find(c => c.id === u.coupon_id)?.code || "—"}</code></TableCell>
                  <TableCell className="text-sm font-body text-success">₹{u.discount_applied}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {uses.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No uses yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-body">Create Coupon</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-body text-sm">Code</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CCCXXXXXX" className="font-mono" />
                <Button variant="outline" size="sm" onClick={generateCode}>Generate</Button>
              </div>
            </div>
            <div>
              <Label className="font-body text-sm">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. New Year special" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-sm">Discount Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-body text-sm">Value</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-sm">Min Order ₹</Label>
                <Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} />
              </div>
              <div>
                <Label className="font-body text-sm">Max Discount ₹</Label>
                <Input type="number" value={form.max_discount_amount} onChange={e => setForm(f => ({ ...f, max_discount_amount: e.target.value }))} placeholder="No limit" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-sm">Max Uses</Label>
                <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" />
              </div>
              <div>
                <Label className="font-body text-sm">Applies To</Label>
                <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="orders">Orders Only</SelectItem>
                    <SelectItem value="events">Events Only</SelectItem>
                    <SelectItem value="shop">Shop Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="font-body text-sm">Valid Until (optional)</Label>
              <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
            <Button onClick={handleCreate} className="w-full rounded-full font-body">Create Coupon</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SecureDeleteConfirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Coupon"
        description="This will permanently delete this coupon and cannot be undone."
      />
    </div>
  );
};

export default AdminCoupons;