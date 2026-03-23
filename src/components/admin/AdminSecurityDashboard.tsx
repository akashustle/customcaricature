import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, Activity, AlertTriangle, Monitor, Clock, CheckCircle, XCircle, Globe, Lock } from "lucide-react";

type SecurityAlert = {
  id: string; alert_type: string; severity: string; title: string;
  description: string | null; admin_id: string | null; ip_address: string | null;
  resolved: boolean; created_at: string;
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const AdminSecurityDashboard = () => {
  const [activeSessions, setActiveSessions] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [failedLogins24h, setFailedLogins24h] = useState(0);
  const [recentActions, setRecentActions] = useState(0);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("security-dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_sessions" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_security_alerts" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_failed_logins" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = async () => {
    const [sessionsRes, rolesRes, failedRes, actionsRes, alertsRes, recentSessionsRes] = await Promise.all([
      supabase.from("admin_sessions").select("id", { count: "exact" }).eq("is_active", true),
      supabase.from("user_roles").select("user_id"),
      supabase.from("admin_failed_logins" as any).select("*").gte("created_at", new Date(Date.now() - 86400000).toISOString()).order("created_at", { ascending: false }).limit(50),
      supabase.from("admin_activity_logs" as any).select("id", { count: "exact" }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      supabase.from("admin_security_alerts" as any).select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("admin_sessions").select("*").order("login_at", { ascending: false }).limit(10),
    ]);

    setActiveSessions(sessionsRes.count || 0);
    const uniqueAdmins = new Set((rolesRes.data || []).map((r: any) => r.user_id));
    setTotalAdmins(uniqueAdmins.size);
    setFailedLogins24h((failedRes.data as any[])?.length || 0);
    setFailedAttempts((failedRes.data as any[]) || []);
    setRecentActions(actionsRes.count || 0);
    setAlerts((alertsRes.data as any[]) || []);
    setRecentSessions((recentSessionsRes.data as any[]) || []);
  };

  const resolveAlert = async (alertId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_security_alerts" as any).update({
      resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString(),
    }).eq("id", alertId);
    fetchAll();
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" /> Security Dashboard
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold font-display">{activeSessions}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Active Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Monitor className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold font-display">{totalAdmins}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Total Admins</p>
          </CardContent>
        </Card>
        <Card className={failedLogins24h > 5 ? "border-destructive/50" : ""}>
          <CardContent className="p-4 text-center">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold font-display">{failedLogins24h}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Failed Logins (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold font-display">{recentActions}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Actions (24h)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Security Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground font-sans">All clear — no security alerts</p>
              </div>
            ) : alerts.map(alert => (
              <div key={alert.id} className={`p-2.5 rounded-lg border text-xs font-sans ${alert.resolved ? "opacity-50 bg-muted/20" : "bg-card"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[9px] border-none ${SEVERITY_COLORS[alert.severity]}`}>{alert.severity}</Badge>
                    <span className="font-semibold">{alert.title}</span>
                  </div>
                  {!alert.resolved && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => resolveAlert(alert.id)}>Resolve</Button>
                  )}
                </div>
                {alert.description && <p className="text-muted-foreground">{alert.description}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(alert.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Failed Login Attempts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-500" /> Failed Login Attempts (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {failedAttempts.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground font-sans">No failed login attempts</p>
              </div>
            ) : failedAttempts.map((attempt: any) => (
              <div key={attempt.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 text-xs font-sans">
                <div>
                  <p className="font-medium">{attempt.email}</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {attempt.ip_address && <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" />{attempt.ip_address}</span>}
                    <span>{attempt.reason}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatDate(attempt.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {recentSessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs font-sans">
                <div className="flex items-center gap-2">
                  {s.is_active ? (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                  <div>
                    <p className="font-medium">{s.admin_name || s.entered_name || "Admin"}</p>
                    <p className="text-muted-foreground">{s.device_info || "Unknown device"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">{s.ip_address || "N/A"}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(s.login_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurityDashboard;
