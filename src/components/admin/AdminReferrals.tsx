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
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, Users, Gift, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import SecureDeleteConfirm from "@/components/admin/SecureDeleteConfirm";

const CHART_COLORS = ["hsl(152,45%,42%)", "hsl(210,55%,50%)", "hsl(38,75%,52%)", "hsl(0,50%,55%)"];

const AdminReferrals = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [uses, setUses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Create form
  const [newCode, setNewCode] = useState("");
  const [rewardType, setRewardType] = useState("discount_percent");
  const [rewardValue, setRewardValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [codesRes, usesRes, profilesRes, eventsRes] = await Promise.all([
      supabase.from("referral_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("referral_uses").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email").limit(500),
      (supabase.from("referral_events" as any)).select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setCodes(codesRes.data || []);
    setUses(usesRes.data || []);
    setProfiles(profilesRes.data || []);
    setEvents(((eventsRes as any).data) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "REF-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setNewCode(code);
  };

  const handleCreate = async () => {
    if (!newCode.trim() || !assignUserId) {
      toast({ title: "Missing fields", description: "Code and user are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("referral_codes").insert({
      code: newCode.toUpperCase().trim(),
      user_id: assignUserId,
      reward_type: rewardType,
      reward_value: parseFloat(rewardValue) || 10,
      max_uses: maxUses ? parseInt(maxUses) : null,
      is_active: true,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Referral code created" });
      setShowCreate(false);
      setNewCode("");
      setAssignUserId("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("referral_codes").delete().eq("id", id);
    toast({ title: "Referral code deleted" });
    setDeleteTarget(null);
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("referral_codes").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  // Analytics
  const totalReferrals = uses.length;
  const successfulReferrals = uses.filter(u => u.reward_given).length;
  const totalRewardAmount = uses.reduce((s, u) => s + (u.reward_amount || 0), 0);

  // Chart: referrals over time (last 30 days)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    return { date: key.slice(5), count: uses.filter(u => u.created_at?.startsWith(key)).length };
  });

  // Pie: by reward type
  const byType = codes.reduce((acc: Record<string, number>, c) => {
    acc[c.reward_type] = (acc[c.reward_type] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  const getUserName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || uid?.slice(0, 8);

  // Funnel from referral_events
  const evClicks = events.filter(e => e.event_type === "click").length;
  const evRegisters = events.filter(e => e.event_type === "register").length;
  const evLogins = events.filter(e => e.event_type === "login").length;
  const evBookings = events.filter(e => e.event_type === "booking").length;
  const evOrders = events.filter(e => e.event_type === "order").length;
  const conversionRate = evClicks > 0 ? Math.round(((evBookings + evOrders) / evClicks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Codes", value: codes.length, icon: Gift, color: "text-primary" },
          { label: "Total Referrals", value: totalReferrals, icon: Users, color: "text-info" },
          { label: "Successful", value: successfulReferrals, icon: TrendingUp, color: "text-success" },
          { label: "Rewards Given", value: `₹${totalRewardAmount}`, icon: BarChart3, color: "text-warning" },
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
          <CardHeader><CardTitle className="text-sm font-body">Referrals (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-body">By Reward Type</CardTitle></CardHeader>
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
        <h3 className="font-body font-bold text-lg">Referral Codes</h3>
        <Button onClick={() => { generateCode(); setShowCreate(true); }} className="rounded-full font-body gap-2">
          <Plus className="w-4 h-4" /> Create Code
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Code</TableHead>
                <TableHead className="font-body">User</TableHead>
                <TableHead className="font-body">Reward</TableHead>
                <TableHead className="font-body">Uses</TableHead>
                <TableHead className="font-body">Active</TableHead>
                <TableHead className="font-body">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{c.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(c.code)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-body">{getUserName(c.user_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {c.reward_type === "discount_percent" ? `${c.reward_value}%` : `₹${c.reward_value}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{c.times_used}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {codes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No referral codes yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Funnel from referral_events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-body flex items-center justify-between">
            <span>Referral Funnel (Click → Conversion)</span>
            <Badge variant="outline" className="text-xs">{conversionRate}% conv.</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Clicks", value: evClicks, color: "bg-blue-50 text-blue-700" },
              { label: "Registers", value: evRegisters, color: "bg-violet-50 text-violet-700" },
              { label: "Logins", value: evLogins, color: "bg-amber-50 text-amber-700" },
              { label: "Bookings", value: evBookings, color: "bg-emerald-50 text-emerald-700" },
              { label: "Orders", value: evOrders, color: "bg-pink-50 text-pink-700" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                <p className="text-2xl font-bold font-body">{s.value}</p>
                <p className="text-[11px] font-body opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
          {events.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body text-xs">When</TableHead>
                    <TableHead className="font-body text-xs">Code</TableHead>
                    <TableHead className="font-body text-xs">Event</TableHead>
                    <TableHead className="font-body text-xs">Referrer</TableHead>
                    <TableHead className="font-body text-xs">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 50).map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell><code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{e.referral_code}</code></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{e.event_type}</Badge></TableCell>
                      <TableCell className="text-xs">{e.referrer_user_id ? getUserName(e.referrer_user_id) : <span className="text-muted-foreground">unknown</span>}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground truncate max-w-[180px]">{e.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Uses */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Recent Referral Uses</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Referred User</TableHead>
                <TableHead className="font-body">Referrer</TableHead>
                <TableHead className="font-body">Reward</TableHead>
                <TableHead className="font-body">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uses.slice(0, 20).map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-body">{getUserName(u.referred_user_id)}</TableCell>
                  <TableCell className="text-sm font-body">{getUserName(u.referrer_user_id)}</TableCell>
                  <TableCell><Badge variant={u.reward_given ? "default" : "secondary"} className="text-xs">{u.reward_given ? `₹${u.reward_amount}` : "Pending"}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {uses.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No referral uses yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-body">Create Referral Code</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-body text-sm">Code</Label>
              <div className="flex gap-2">
                <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="REF-XXXXXX" className="font-mono" />
                <Button variant="outline" size="sm" onClick={generateCode}>Generate</Button>
              </div>
            </div>
            <div>
              <Label className="font-body text-sm">Assign to User</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.user_id?.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-sm">Reward Type</Label>
                <Select value={rewardType} onValueChange={setRewardType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount_percent">% Discount</SelectItem>
                    <SelectItem value="flat_amount">Flat ₹ Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-body text-sm">Value</Label>
                <Input type="number" value={rewardValue} onChange={e => setRewardValue(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="font-body text-sm">Max Uses (blank = unlimited)</Label>
              <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Unlimited" />
            </div>
            <Button onClick={handleCreate} className="w-full rounded-full font-body">Create Referral Code</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <SecureDeleteConfirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Referral Code"
        description="This will permanently delete this referral code and cannot be undone."
      />
    </div>
  );
};

export default AdminReferrals;