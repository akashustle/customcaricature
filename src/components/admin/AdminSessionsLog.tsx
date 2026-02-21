import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Monitor, Clock, MapPin, Activity, Globe, Smartphone, Laptop, ShieldOff, LogOut, Lock, KeyRound, Loader2, Ban } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

type BlockedIP = {
  id: string;
  ip_address: string;
  blocked_by: string;
  reason: string | null;
  created_at: string;
};

const AdminSessionsLog = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [blockIPInput, setBlockIPInput] = useState("");
  const [blockReason, setBlockReason] = useState("");
  
  // Password change for other admin
  const [targetUserId, setTargetUserId] = useState("");
  const [newPasswordForAdmin, setNewPasswordForAdmin] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchActions();
    fetchBlockedIPs();
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

  const fetchBlockedIPs = async () => {
    const { data } = await supabase.from("admin_blocked_ips").select("*").order("created_at", { ascending: false });
    if (data) setBlockedIPs(data as any);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const isMobile = (info: string | null) => info ? /Mobile/i.test(info) : false;

  const handleLogoutSession = async (sessionId: string, sessionUserId: string) => {
    await supabase.from("admin_sessions").update({ is_active: false } as any).eq("id", sessionId);
    toast({ title: "Session marked as ended" });
    
    // Log action
    if (user) {
      await supabase.from("admin_action_log").insert({
        user_id: user.id,
        admin_name: "Admin",
        action: "Force Logout Admin Session",
        details: `Session ${sessionId.slice(0, 8)} ended`,
      } as any);
    }
    fetchSessions();
  };

  const handleBlockIP = async () => {
    if (!blockIPInput.trim()) return;
    await supabase.from("admin_blocked_ips").insert({
      ip_address: blockIPInput.trim(),
      blocked_by: user?.id,
      reason: blockReason.trim() || null,
    } as any);
    toast({ title: `IP ${blockIPInput} blocked` });
    setBlockIPInput("");
    setBlockReason("");
    fetchBlockedIPs();
    
    if (user) {
      await supabase.from("admin_action_log").insert({
        user_id: user.id,
        admin_name: "Admin",
        action: "Blocked Admin IP",
        details: `IP: ${blockIPInput}`,
      } as any);
    }
  };

  const handleUnblockIP = async (id: string, ip: string) => {
    await supabase.from("admin_blocked_ips").delete().eq("id", id);
    toast({ title: `IP ${ip} unblocked` });
    fetchBlockedIPs();
  };

  const handleBlockSessionIP = async (session: AdminSession) => {
    if (!session.ip_address) { toast({ title: "No IP available", variant: "destructive" }); return; }
    await supabase.from("admin_blocked_ips").insert({
      ip_address: session.ip_address,
      blocked_by: user?.id,
      reason: `Blocked from session: ${session.admin_name}`,
    } as any);
    await supabase.from("admin_sessions").update({ is_active: false } as any).eq("id", session.id);
    toast({ title: `IP ${session.ip_address} blocked & session ended` });
    fetchBlockedIPs();
    fetchSessions();
  };

  const handleChangeAdminPassword = async () => {
    if (!targetUserId || !newPasswordForAdmin || newPasswordForAdmin.length < 6) {
      toast({ title: "Enter valid user ID and password (6+ chars)", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("change-admin-password", {
        body: { target_user_id: targetUserId, new_password: newPasswordForAdmin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Password changed successfully!" });
      setTargetUserId("");
      setNewPasswordForAdmin("");
      
      if (user) {
        await supabase.from("admin_action_log").insert({
          user_id: user.id,
          admin_name: "Admin",
          action: "Changed Admin Password",
          details: `Target user: ${targetUserId.slice(0, 8)}`,
        } as any);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setChangingPassword(false);
  };

  // Get unique admin user IDs from sessions for password change dropdown
  const uniqueAdmins = Array.from(new Map(sessions.map(s => [s.user_id, s])).values());

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Monitor className="w-5 h-5 text-primary" /> Admin Sessions & Security
      </h2>

      {/* Active Sessions with Block/Logout */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-green-600" /> Active Sessions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sessions.filter(s => s.is_active).length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">No active sessions</p>
          ) : sessions.filter(s => s.is_active).map(s => (
            <div key={s.id} className="bg-primary/5 rounded-lg p-3 border border-primary/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-sans font-semibold text-sm">{s.admin_name || "Admin"}</p>
                <div className="flex items-center gap-1">
                  <Badge className="bg-green-100 text-green-800 border-none text-[10px]">🟢 Active</Badge>
                  {s.user_id !== user?.id && (
                    <>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleLogoutSession(s.id, s.user_id)}>
                        <LogOut className="w-3 h-3 mr-1" />Logout
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive" onClick={() => handleBlockSessionIP(s)}>
                        <Ban className="w-3 h-3 mr-1" />Block IP
                      </Button>
                    </>
                  )}
                  {s.user_id === user?.id && (
                    <Badge variant="outline" className="text-[9px]">You</Badge>
                  )}
                </div>
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

      {/* IP Blocking */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><ShieldOff className="w-5 h-5 text-destructive" /> Block Admin IP</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={blockIPInput} onChange={e => setBlockIPInput(e.target.value)} placeholder="Enter IP address" className="flex-1" />
            <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason (optional)" className="flex-1" />
            <Button size="sm" onClick={handleBlockIP} disabled={!blockIPInput.trim()} className="font-sans"><Ban className="w-4 h-4 mr-1" />Block</Button>
          </div>
          {blockedIPs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-sans font-medium">Blocked IPs:</p>
              {blockedIPs.map(ip => (
                <div key={ip.id} className="flex items-center justify-between bg-destructive/5 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-sans font-mono">{ip.ip_address}</p>
                    {ip.reason && <p className="text-[10px] text-muted-foreground">{ip.reason}</p>}
                    <p className="text-[9px] text-muted-foreground">{formatDate(ip.created_at)}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleUnblockIP(ip.id, ip.ip_address)}>Unblock</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Admin Password */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Change Admin Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground font-sans">Select an admin from recent sessions and set a new password.</p>
          <div>
            <Label className="font-sans text-xs">Select Admin</Label>
            <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
              <option value="">Select admin...</option>
              {uniqueAdmins.map(s => (
                <option key={s.user_id} value={s.user_id}>{s.admin_name} ({s.ip_address || "No IP"}) {s.user_id === user?.id ? "(You)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="font-sans text-xs">New Password (min 6 chars)</Label>
            <Input type="password" value={newPasswordForAdmin} onChange={e => setNewPasswordForAdmin(e.target.value)} placeholder="New password" />
          </div>
          <Button onClick={handleChangeAdminPassword} disabled={changingPassword || !targetUserId || newPasswordForAdmin.length < 6} className="w-full font-sans">
            {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing...</> : <><Lock className="w-4 h-4 mr-2" />Change Password</>}
          </Button>
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
