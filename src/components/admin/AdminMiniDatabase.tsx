import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Database, Users, CreditCard, Calendar, ShoppingBag, MessageSquare,
  BarChart3, GraduationCap, RefreshCw, CheckCircle2, Loader2, Zap
} from "lucide-react";
import { playSuccessSound, playClickSound } from "@/lib/sounds";

const SYNC_ACTIONS = [
  { key: "sync_users", label: "Users", icon: Users, color: "from-blue-500 to-indigo-500", desc: "All profiles, secret codes, details" },
  { key: "sync_payments", label: "Payments", icon: CreditCard, color: "from-green-500 to-emerald-500", desc: "Full payment history" },
  { key: "sync_events", label: "Events", icon: Calendar, color: "from-purple-500 to-violet-500", desc: "All event bookings" },
  { key: "sync_orders", label: "Orders", icon: ShoppingBag, color: "from-orange-500 to-red-500", desc: "Custom caricature orders" },
  { key: "sync_enquiries", label: "Enquiries", icon: MessageSquare, color: "from-yellow-500 to-amber-500", desc: "All enquiry details" },
  { key: "sync_analytics", label: "Analytics", icon: BarChart3, color: "from-slate-500 to-gray-600", desc: "Dashboard metrics & charts" },
  { key: "sync_workshop", label: "Workshop", icon: GraduationCap, color: "from-pink-500 to-rose-500", desc: "March & June workshop students" },
];

const AdminMiniDatabase = () => {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const handleSync = async (action: string) => {
    playClickSound();
    setSyncing(action);
    try {
      const { data, error } = await supabase.functions.invoke("mini-db-sync", { body: { action } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      setResults(prev => ({ ...prev, [action]: data }));
      playSuccessSound();
      toast({ title: "✅ Synced!", description: `${action.replace("sync_", "").replace("_", " ")} synced to Mini Database sheet` });
    } catch (e: any) {
      toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    playClickSound();
    setSyncing("sync_all");
    try {
      const { data, error } = await supabase.functions.invoke("mini-db-sync", { body: { action: "sync_all" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      setResults({ sync_all: data });
      playSuccessSound();
      toast({ title: "🎉 Full Sync Complete!", description: `All ${data.results?.length || 0} sheets synced to Mini Database` });
    } catch (e: any) {
      toast({ title: "Full Sync Failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Mini Database
          </h2>
          <p className="text-sm text-muted-foreground">Sync all website data to Google Sheets · Real-time auto-sync enabled</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
            <Zap className="w-3 h-3" /> Auto-Sync Active
          </Badge>
          <Button onClick={handleSyncAll} disabled={!!syncing} className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90">
            {syncing === "sync_all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync All Sheets
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SYNC_ACTIONS.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="relative overflow-hidden hover:shadow-lg transition-all group cursor-pointer border-white/60">
              <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.color} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  {results[s.key] && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
                <CardTitle className="text-sm font-bold mt-2">{s.label}</CardTitle>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!!syncing}
                  onClick={() => handleSync(s.key)}
                >
                  {syncing === s.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Sync Now
                </Button>
                {results[s.key] && (
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    {results[s.key].rows ? `${results[s.key].rows} rows synced` : "Synced ✓"}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {results.sync_all?.results && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-emerald-800">Last Full Sync Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {results.sync_all.results.map((r: any, i: number) => (
                <div key={i} className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="text-xs font-semibold text-foreground">{r.sheet || "Sheet"}</p>
                  <p className="text-lg font-bold text-emerald-600">{r.rows || 0}</p>
                  <p className="text-[10px] text-muted-foreground">rows</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-amber-50/50 border-amber-200">
        <CardContent className="py-3">
          <p className="text-xs text-amber-800">
            <strong>🔒 Delete Protection:</strong> Data deleted from admin panel will NOT be removed from this sheet — it acts as a permanent backup.
            Changes (inserts & updates) sync automatically in real-time via database triggers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMiniDatabase;
