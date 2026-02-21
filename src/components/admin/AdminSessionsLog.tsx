import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Clock, MapPin, Activity, Globe, Smartphone, Laptop } from "lucide-react";

type AdminSession = {
  id: string;
  user_id: string;
  admin_name: string;
  device_info: string | null;
  ip_address: string | null;
  location_info: string | null;
  login_at: string;
  last_active_at: string;
  is_active: boolean;
};

type ActionLog = {
  id: string;
  admin_name: string;
  action: string;
  details: string | null;
  created_at: string;
};

const AdminSessionsLog = () => {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);

  useEffect(() => {
    fetchSessions();
    fetchActions();
    const ch = supabase.channel("admin-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_sessions" }, () => fetchSessions())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_action_log" }, () => fetchActions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchSessions = async () => {
    const { data } = await supabase.from("admin_sessions").select("*").order("login_at", { ascending: false }).limit(50);
    if (data) setSessions(data as any);
  };

  const fetchActions = async () => {
    const { data } = await supabase.from("admin_action_log").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setActions(data as any);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const isMobile = (info: string | null) => info ? /Mobile/i.test(info) : false;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Monitor className="w-5 h-5 text-primary" /> Admin Sessions & Activity
      </h2>

      {/* Active Sessions */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-green-600" /> Active Sessions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sessions.filter(s => s.is_active).length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">No active sessions</p>
          ) : sessions.filter(s => s.is_active).map(s => (
            <div key={s.id} className="bg-primary/5 rounded-lg p-3 border border-primary/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-sans font-semibold text-sm">{s.admin_name || "Admin"}</p>
                <Badge className="bg-green-100 text-green-800 border-none text-[10px]">🟢 Active</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {s.device_info && (
                  <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1">
                    {isMobile(s.device_info) ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />} {s.device_info}
                  </p>
                )}
                {s.ip_address && <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1"><Globe className="w-3 h-3" /> IP: {s.ip_address}</p>}
                {s.location_info && <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location_info}</p>}
                <p className="text-[10px] text-muted-foreground font-sans flex items-center gap-1"><Clock className="w-3 h-3" /> Login: {formatDate(s.login_at)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Login History</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {sessions.map(s => (
            <div key={s.id} className="bg-muted/30 rounded-lg p-3 text-sm font-sans space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-xs">{s.admin_name || "Admin"}</p>
                <Badge variant={s.is_active ? "default" : "outline"} className="text-[9px]">{s.is_active ? "🟢 Active" : "⚪ Ended"}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0.5">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {isMobile(s.device_info) ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                  {s.device_info || "Unknown device"}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.ip_address || "No IP"}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location_info || "Unknown"}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">{formatDate(s.login_at)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Log */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Activity Log</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">No activity yet</p>
          ) : actions.map(a => (
            <div key={a.id} className="bg-muted/20 rounded-lg p-2 border-l-2 border-primary/30">
              <div className="flex items-start justify-between">
                <p className="text-xs font-sans font-medium">{a.admin_name}: {a.action}</p>
                <p className="text-[9px] text-muted-foreground font-sans flex-shrink-0 ml-2">{formatDate(a.created_at)}</p>
              </div>
              {a.details && <p className="text-[11px] text-muted-foreground font-sans mt-0.5">{a.details}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSessionsLog;
