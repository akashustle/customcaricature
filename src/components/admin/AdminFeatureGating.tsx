import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, Shield, Plus, Loader2, ToggleLeft, Users } from "lucide-react";
import SecureDeleteConfirm from "@/components/admin/SecureDeleteConfirm";
import { motion } from "framer-motion";

const AVAILABLE_FEATURES = [
  { key: "referrals", label: "Referral System", description: "Allow user to refer others and earn rewards" },
  { key: "coupons", label: "Coupon Access", description: "Allow user to apply coupon codes" },
  { key: "event_booking", label: "Event Booking", description: "Allow user to book live events" },
  { key: "international_booking", label: "International Booking", description: "Allow international event booking" },
  { key: "shop_access", label: "Shop Access", description: "Allow access to the merchandise shop" },
  { key: "workshop_access", label: "Workshop Access", description: "Allow access to workshop content" },
  { key: "ai_caricature", label: "AI Caricature", description: "Allow AI caricature generation" },
  { key: "priority_support", label: "Priority Support", description: "Enable priority support queue" },
  { key: "invoice_download", label: "Invoice Download", description: "Allow downloading invoices" },
];

type FeatureFlag = { id: string; user_id: string; feature_key: string; is_enabled: boolean; created_at: string; };
type Profile = { user_id: string; full_name: string; email: string; mobile: string; };

const AdminFeatureGating = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    const [{ data: flagData }, { data: profileData }] = await Promise.all([
      supabase.from("user_feature_flags" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email, mobile"),
    ]);
    if (flagData) setFlags(flagData as any);
    if (profileData) setProfiles(profileData as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getProfileName = (userId: string) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p ? `${p.full_name} (${p.email})` : userId.slice(0, 8);
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    const { error } = await supabase.from("user_feature_flags" as any).update({ is_enabled: !flag.is_enabled }).eq("id", flag.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f)); toast({ title: `Feature ${!flag.is_enabled ? "enabled" : "disabled"}` }); }
  };

  const addFlag = async () => {
    if (!selectedUser || !selectedFeature) return;
    const { error } = await supabase.from("user_feature_flags" as any).upsert({ user_id: selectedUser, feature_key: selectedFeature, is_enabled: true }, { onConflict: "user_id,feature_key" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Feature Added!" }); setAddOpen(false); fetchData(); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("user_feature_flags" as any).delete().eq("id", deleteId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Feature Flag Removed" }); setFlags(prev => prev.filter(f => f.id !== deleteId)); }
    setDeleteId(null);
  };

  const filteredUsers = profiles.filter(p => p.full_name.toLowerCase().includes(userSearch.toLowerCase()) || p.email.toLowerCase().includes(userSearch.toLowerCase()));

  const grouped = AVAILABLE_FEATURES.map(feat => ({
    ...feat,
    users: flags.filter(f => f.feature_key === feat.key),
  }));

  const filtered = search ? grouped.filter(g => g.label.toLowerCase().includes(search.toLowerCase()) || g.users.some(u => getProfileName(u.user_id).toLowerCase().includes(search.toLowerCase()))) : grouped;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-primary" />Feature Gating</h2>
          <p className="text-sm text-muted-foreground font-sans">Control which features are available to specific users</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="rounded-full font-sans"><Plus className="w-4 h-4 mr-1" />Assign Feature</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Flags", value: flags.length, color: "text-blue-600" },
          { label: "Active", value: flags.filter(f => f.is_enabled).length, color: "text-emerald-600" },
          { label: "Unique Users", value: new Set(flags.map(f => f.user_id)).size, color: "text-purple-600" },
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
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search features or users..." className="pl-10 font-sans" />
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map(feat => (
            <Card key={feat.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4 text-primary" />
                    {feat.label}
                  </div>
                  <Badge variant="outline" className="font-sans">{feat.users.length} users</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground font-sans">{feat.description}</p>
              </CardHeader>
              {feat.users.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {feat.users.map(flag => (
                      <div key={flag.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-sans">{getProfileName(flag.user_id)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={flag.is_enabled} onCheckedChange={() => toggleFlag(flag)} />
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteId(flag.id)}>
                            <span className="text-xs">×</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Assign Feature to User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-sans font-medium">Feature</label>
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger><SelectValue placeholder="Select feature" /></SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FEATURES.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-sans font-medium">User</label>
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." className="mb-2 font-sans" />
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredUsers.slice(0, 20).map(p => (
                  <button key={p.user_id} onClick={() => { setSelectedUser(p.user_id); setUserSearch(p.full_name); }}
                    className={`w-full text-left px-3 py-2 text-sm font-sans hover:bg-muted transition-colors ${selectedUser === p.user_id ? "bg-primary/10" : ""}`}>
                    {p.full_name} <span className="text-muted-foreground">({p.email})</span>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={addFlag} disabled={!selectedUser || !selectedFeature} className="w-full rounded-full font-sans">Assign Feature</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SecureDeleteConfirm open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Feature Flag" description="This feature access will be revoked for the user." />
    </div>
  );
};

export default AdminFeatureGating;
