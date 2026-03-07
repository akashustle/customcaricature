import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Monitor, Clock, MapPin, Activity, Globe, Smartphone, Laptop, ShieldOff, LogOut, Lock, KeyRound, Loader2, Ban, Users, Edit2, Trash2, Save, X, Eye } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AdminSession = {
  id: string; user_id: string; admin_name: string; device_info: string | null;
  ip_address: string | null; location_info: string | null; login_at: string;
  last_active_at: string; is_active: boolean;
};
type ActionLog = { id: string; admin_name: string; action: string; details: string | null; created_at: string; user_id: string; };
type BlockedIP = { id: string; ip_address: string; blocked_by: string; reason: string | null; created_at: string; };
type AdminUser = { user_id: string; name: string; email: string; mobile: string; role: string; sessionCount: number; lastLogin: string | null; isActive: boolean; };

const AdminSessionsLog = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [blockIPInput, setBlockIPInput] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [newPasswordForAdmin, setNewPasswordForAdmin] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editAdminData, setEditAdminData] = useState<{ name: string; mobile: string }>({ name: "", mobile: "" });
  const [viewHistoryAdminId, setViewHistoryAdminId] = useState<string | null>(null);
  const [sessionTab, setSessionTab] = useState("admins");

  useEffect(() => {
    fetchSessions(); fetchActions(); fetchBlockedIPs(); fetchAdminUsers();
    const ch = supabase.channel("admin-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_sessions" }, () => { fetchSessions(); fetchAdminUsers(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_action_log" }, () => fetchActions())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => fetchAdminUsers())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchSessions = async () => {
    const { data } = await supabase.from("admin_sessions").select("*").order("login_at", { ascending: false }).limit(50);
    if (data) setSessions(data as any);
  };
  const fetchActions = async () => {
    const { data } = await supabase.from("admin_action_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setActions(data as any);
  };
  const fetchBlockedIPs = async () => {
    const { data } = await supabase.from("admin_blocked_ips").select("*").order("created_at", { ascending: false });
    if (data) setBlockedIPs(data as any);
  };
  const fetchAdminUsers = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    if (!roles) return;
    const adminUserIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, mobile");
    const { data: allSessions } = await supabase.from("admin_sessions").select("user_id, login_at, is_active").order("login_at", { ascending: false });
    if (profiles) {
      const admins: AdminUser[] = adminUserIds.map(uid => {
        const prof = profiles.find((p: any) => p.user_id === uid);
        const userSessions = (allSessions || []).filter((s: any) => s.user_id === uid);
        const role = roles.find(r => r.user_id === uid)?.role || "admin";
        return {
          user_id: uid,
          name: prof?.full_name || "Unknown",
          email: prof?.email || "",
          mobile: prof?.mobile || "",
          role,
          sessionCount: userSessions.length,
          lastLogin: userSessions[0]?.login_at || null,
          isActive: userSessions.some((s: any) => s.is_active),
        };
      });
      setAdminUsers(admins);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
  const isMobile = (info: string | null) => info ? /Mobile/i.test(info) : false;

  const handleLogoutSession = async (sessionId: string) => {
    await supabase.from("admin_sessions").update({ is_active: false } as any).eq("id", sessionId);
    toast({ title: "Session marked as ended" });
    if (user) {
      await supabase.from("admin_action_log").insert({ user_id: user.id, admin_name: "Admin", action: "Force Logout Admin Session", details: `Session ${sessionId.slice(0, 8)} ended` } as any);
    }
    fetchSessions();
  };

  const handleBlockIP = async () => {
    if (!blockIPInput.trim()) return;
    await supabase.from("admin_blocked_ips").insert({ ip_address: blockIPInput.trim(), blocked_by: user?.id, reason: blockReason.trim() || null } as any);
    toast({ title: `IP ${blockIPInput} blocked` });
    setBlockIPInput(""); setBlockReason(""); fetchBlockedIPs();
    if (user) await supabase.from("admin_action_log").insert({ user_id: user.id, admin_name: "Admin", action: "Blocked Admin IP", details: `IP: ${blockIPInput}` } as any);
  };
  const handleUnblockIP = async (id: string, ip: string) => {
    await supabase.from("admin_blocked_ips").delete().eq("id", id);
    toast({ title: `IP ${ip} unblocked` }); fetchBlockedIPs();
  };
  const handleBlockSessionIP = async (session: AdminSession) => {
    if (!session.ip_address) { toast({ title: "No IP available", variant: "destructive" }); return; }
    await supabase.from("admin_blocked_ips").insert({ ip_address: session.ip_address, blocked_by: user?.id, reason: `Blocked from session: ${session.admin_name}` } as any);
    await supabase.from("admin_sessions").update({ is_active: false } as any).eq("id", session.id);
    toast({ title: `IP ${session.ip_address} blocked & session ended` }); fetchBlockedIPs(); fetchSessions();
  };

  const handleChangeAdminPassword = async () => {
    if (!targetUserId || !newPasswordForAdmin || newPasswordForAdmin.length < 6) {
      toast({ title: "Enter valid user ID and password (6+ chars)", variant: "destructive" }); return;
    }
    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("change-admin-password", { body: { target_user_id: targetUserId, new_password: newPasswordForAdmin } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Password changed successfully!" }); setTargetUserId(""); setNewPasswordForAdmin("");
      if (user) await supabase.from("admin_action_log").insert({ user_id: user.id, admin_name: "Admin", action: "Changed Admin Password", details: `Target user: ${targetUserId.slice(0, 8)}` } as any);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    setChangingPassword(false);
  };

  const handleDeleteAdmin = async (adminUserId: string, adminName: string) => {
    if (!confirm(`Remove admin role from ${adminName}? They will lose admin access.`)) return;
    await supabase.from("user_roles").delete().eq("user_id", adminUserId);
    await supabase.from("admin_permissions").delete().eq("user_id", adminUserId);
    await supabase.from("admin_sessions").update({ is_active: false } as any).eq("user_id", adminUserId);
    toast({ title: `${adminName} removed from admin` });
    if (user) await supabase.from("admin_action_log").insert({ user_id: user.id, admin_name: "Admin", action: "Removed Admin", details: `Removed ${adminName}` } as any);
    fetchAdminUsers();
  };

  const handleSaveAdminEdit = async (adminUserId: string) => {
    await supabase.from("profiles").update({ full_name: editAdminData.name, mobile: editAdminData.mobile } as any).eq("user_id", adminUserId);
    toast({ title: "Admin profile updated" }); setEditingAdminId(null); fetchAdminUsers();
  };

  const handleBlockAdmin = async (adminUserId: string, adminName: string) => {
    if (!confirm(`Block all sessions for ${adminName}?`)) return;
    await supabase.from("admin_sessions").update({ is_active: false } as any).eq("user_id", adminUserId);
    toast({ title: `All sessions ended for ${adminName}` });
    if (user) await supabase.from("admin_action_log").insert({ user_id: user.id, admin_name: "Admin", action: "Blocked Admin Sessions", details: `Blocked all sessions for ${adminName}` } as any);
    fetchSessions(); fetchAdminUsers();
  };

  const uniqueAdmins = Array.from(new Map(sessions.map(s => [s.user_id, s])).values());
  const adminHistoryActions = viewHistoryAdminId ? actions.filter(a => a.user_id === viewHistoryAdminId) : [];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Monitor className="w-5 h-5 text-primary" /> Admin Sessions & Security
      </h2>

      <Tabs value={sessionTab} onValueChange={setSessionTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="admins" className="flex-1 font-sans"><Users className="w-4 h-4 mr-1" />Admin List</TabsTrigger>
          <TabsTrigger value="sessions" className="flex-1 font-sans"><Globe className="w-4 h-4 mr-1" />Sessions</TabsTrigger>
          <TabsTrigger value="security" className="flex-1 font-sans"><ShieldOff className="w-4 h-4 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 font-sans"><Activity className="w-4 h-4 mr-1" />Activity</TabsTrigger>
        </TabsList>

        {/* Admin List Tab */}
        <TabsContent value="admins">
          <div className="space-y-3">
            <h3 className="font-display text-lg font-bold">All Admins ({adminUsers.length})</h3>
            {adminUsers.map(admin => (
              <Card key={admin.user_id} className={admin.isActive ? "border-primary/30" : ""}>
                <CardContent className="p-4 space-y-2">
                  {editingAdminId === admin.user_id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Name</Label><Input value={editAdminData.name} onChange={e => setEditAdminData({ ...editAdminData, name: e.target.value })} /></div>
                        <div><Label className="text-xs">Mobile</Label><Input value={editAdminData.mobile} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setEditAdminData({ ...editAdminData, mobile: d }); }} maxLength={10} /></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveAdminEdit(admin.user_id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingAdminId(null)}><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-sans font-semibold">{admin.name}</p>
                            {admin.isActive && <Badge className="bg-green-100 text-green-800 border-none text-[10px]">🟢 Online</Badge>}
                            {admin.user_id === user?.id && <Badge variant="outline" className="text-[9px]">You</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground font-sans">{admin.email}</p>
                          <p className="text-xs text-muted-foreground font-sans">📱 {admin.mobile || "N/A"}</p>
                          <p className="text-xs text-muted-foreground font-sans">Role: {admin.role} · {admin.sessionCount} sessions</p>
                          {admin.lastLogin && <p className="text-[10px] text-muted-foreground font-sans">Last login: {formatDate(admin.lastLogin)}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingAdminId(admin.user_id); setEditAdminData({ name: admin.name, mobile: admin.mobile }); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setViewHistoryAdminId(viewHistoryAdminId === admin.user_id ? null : admin.user_id)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {admin.user_id !== user?.id && (
                            <>
                              <Button variant="ghost" size="sm" className="text-orange-600" onClick={() => handleBlockAdmin(admin.user_id, admin.name)}>
                                <Ban className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Admin?</AlertDialogTitle>
                                    <AlertDialogDescription>This will remove admin access for {admin.name}. They will no longer be able to access the admin panel.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAdmin(admin.user_id, admin.name)}>Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Admin History inline */}
                      {viewHistoryAdminId === admin.user_id && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="text-xs font-sans font-semibold mb-2">📋 Activity History for {admin.name}:</p>
                          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                            {adminHistoryActions.length === 0 ? (
                              <p className="text-xs text-muted-foreground font-sans">No activity recorded</p>
                            ) : adminHistoryActions.map(a => (
                              <div key={a.id} className="bg-muted/20 rounded-lg p-2 border-l-2 border-primary/30">
                                <div className="flex items-start justify-between">
                                  <p className="text-xs font-sans font-medium">{a.action}</p>
                                  <p className="text-[9px] text-muted-foreground font-sans flex-shrink-0 ml-2">{formatDate(a.created_at)}</p>
                                </div>
                                {a.details && <p className="text-[11px] text-muted-foreground font-sans mt-0.5">{a.details}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions">
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
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleLogoutSession(s.id)}><LogOut className="w-3 h-3 mr-1" />Logout</Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive" onClick={() => handleBlockSessionIP(s)}><Ban className="w-3 h-3 mr-1" />Block IP</Button>
                        </>
                      )}
                      {s.user_id === user?.id && <Badge variant="outline" className="text-[9px]">You</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {s.device_info && <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1">{isMobile(s.device_info) ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />} {s.device_info}</p>}
                    {s.ip_address && <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1"><Globe className="w-3 h-3" /> IP: {s.ip_address}</p>}
                    {s.location_info && <p className="text-[11px] text-muted-foreground font-sans flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location_info}</p>}
                    <p className="text-[10px] text-muted-foreground font-sans flex items-center gap-1"><Clock className="w-3 h-3" /> Login: {formatDate(s.login_at)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {/* Login History */}
          <Card className="mt-4">
            <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Login History</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {sessions.map(s => (
                <div key={s.id} className="bg-muted/30 rounded-lg p-3 text-sm font-sans space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-xs">{s.admin_name || "Admin"}</p>
                    <Badge variant={s.is_active ? "default" : "outline"} className="text-[9px]">{s.is_active ? "🟢 Active" : "⚪ Ended"}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-0.5">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">{isMobile(s.device_info) ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}{s.device_info || "Unknown device"}</p>
                    <p className="text-[10px] text-muted-foreground">{s.ip_address || "No IP"}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location_info || "Unknown"}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatDate(s.login_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
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
          <Card className="mt-4">
            <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Change Admin Password</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground font-sans">Select an admin and set a new password.</p>
              <div>
                <Label className="font-sans text-xs">Select Admin</Label>
                <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">Select admin...</option>
                  {adminUsers.map(a => (
                    <option key={a.user_id} value={a.user_id}>{a.name} ({a.email}) {a.user_id === user?.id ? "(You)" : ""}</option>
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
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Full Activity Log</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSessionsLog;
