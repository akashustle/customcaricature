import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, UserCheck, ClipboardList, BarChart3, Trash2, Edit2, Save, X, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const ROLES = [
  { value: "sales_manager", label: "Sales Manager", color: "bg-soft-blue text-foreground" },
  { value: "operations_manager", label: "Operations Manager", color: "bg-soft-green text-foreground" },
  { value: "marketing_manager", label: "Marketing Manager", color: "bg-soft-pink text-foreground" },
  { value: "artist_coordinator", label: "Artist Coordinator", color: "bg-warm-peach text-foreground" },
];

const TASK_STATUS = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-warning" },
  { value: "in_progress", label: "In Progress", icon: AlertCircle, color: "text-info" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "text-success" },
];

type TeamMember = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  department: string | null;
  is_active: boolean;
  joined_at: string;
};

type TeamTask = {
  id: string;
  assigned_to: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

const AdminTeamManagement = () => {
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", mobile: "", role: "sales_manager" });
  const [newTask, setNewTask] = useState({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [membersRes, tasksRes] = await Promise.all([
      supabase.from("team_members").select("*").order("created_at", { ascending: false }),
      supabase.from("team_tasks").select("*").order("created_at", { ascending: false }),
    ]);
    if (membersRes.data) setMembers(membersRes.data as any);
    if (tasksRes.data) setTasks(tasksRes.data as any);
    setLoading(false);
  };

  const addMember = async () => {
    if (!newMember.name || !newMember.email) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    // Look up user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newMember.email)
      .maybeSingle();

    if (!profile) {
      toast({ title: "User not found", description: "This email must be a registered user.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("team_members").insert({
      user_id: profile.user_id,
      name: newMember.name,
      email: newMember.email,
      mobile: newMember.mobile || null,
      role: newMember.role,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Team member added!" });
    setShowAdd(false);
    setNewMember({ name: "", email: "", mobile: "", role: "sales_manager" });
    fetchAll();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("team_members").update({ is_active: !current } as any).eq("id", id);
    toast({ title: current ? "Member deactivated" : "Member activated" });
    fetchAll();
  };

  const deleteMember = async (id: string) => {
    await supabase.from("team_members").delete().eq("id", id);
    toast({ title: "Member removed" });
    fetchAll();
  };

  const addTask = async () => {
    if (!newTask.title || !newTask.assigned_to) {
      toast({ title: "Title and assignee required", variant: "destructive" });
      return;
    }
    await supabase.from("team_tasks").insert({
      title: newTask.title,
      description: newTask.description || null,
      assigned_to: newTask.assigned_to,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
    } as any);
    toast({ title: "Task created!" });
    setShowAddTask(false);
    setNewTask({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });
    fetchAll();
  };

  const updateTaskStatus = async (id: string, status: string) => {
    await supabase.from("team_tasks").update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    } as any).eq("id", id);
    toast({ title: "Task updated" });
    fetchAll();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("team_tasks").delete().eq("id", id);
    toast({ title: "Task deleted" });
    fetchAll();
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[0];
  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || "Unassigned";

  // Stats
  const activeMembers = members.filter(m => m.is_active).length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;

  if (loading) return <p className="text-center text-muted-foreground py-10" style={{ fontFamily: 'Inter, sans-serif' }}>Loading...</p>;

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Team Members", value: members.length, accent: "hsl(210 62% 48%)", icon: Users },
          { label: "Active", value: activeMembers, accent: "hsl(152 55% 40%)", icon: UserCheck },
          { label: "Pending Tasks", value: pendingTasks, accent: "hsl(38 88% 50%)", icon: Clock },
          { label: "Completed", value: completedTasks, accent: "hsl(152 55% 40%)", icon: CheckCircle },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="premium-stat-card"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.accent }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 rounded-full p-1">
          <TabsTrigger value="members" className="rounded-full text-xs gap-1.5 data-[state=active]:bg-background">
            <Users className="w-3.5 h-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-full text-xs gap-1.5 data-[state=active]:bg-background">
            <ClipboardList className="w-3.5 h-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-full text-xs gap-1.5 data-[state=active]:bg-background">
            <BarChart3 className="w-3.5 h-3.5" /> Performance
          </TabsTrigger>
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Team Members</h3>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> Add Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add Team Member</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label className="text-xs">Full Name</Label><Input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div>
                  <div><Label className="text-xs">Email (must be registered user)</Label><Input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} /></div>
                  <div><Label className="text-xs">Mobile</Label><Input value={newMember.mobile} onChange={e => setNewMember({...newMember, mobile: e.target.value.replace(/\D/g, "").slice(0, 10)})} /></div>
                  <div>
                    <Label className="text-xs">Role</Label>
                    <Select value={newMember.role} onValueChange={v => setNewMember({...newMember, role: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addMember} className="w-full rounded-full">Add Member</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {members.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">No team members yet. Add your first team member above.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {members.map((m) => {
                const roleInfo = getRoleInfo(m.role);
                const memberTasks = tasks.filter(t => t.assigned_to === m.id);
                const memberCompleted = memberTasks.filter(t => t.status === "completed").length;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-glass-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                          {m.mobile && <p className="text-xs text-muted-foreground">+91{m.mobile}</p>}
                          <div className="flex gap-2 mt-1.5">
                            <Badge className={`${roleInfo.color} text-[10px] border-none`}>{roleInfo.label}</Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {memberCompleted}/{memberTasks.length} tasks
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m.id, m.is_active)} />
                        <Button variant="ghost" size="sm" onClick={() => deleteMember(m.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Team Tasks</h3>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> New Task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Create Task</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label className="text-xs">Title</Label><Input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} /></div>
                  <div><Label className="text-xs">Description</Label><Textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} rows={3} /></div>
                  <div>
                    <Label className="text-xs">Assign To</Label>
                    <Select value={newTask.assigned_to} onValueChange={v => setNewTask({...newTask, assigned_to: v})}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {members.filter(m => m.is_active).map(m => <SelectItem key={m.id} value={m.id}>{m.name} — {getRoleInfo(m.role).label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Select value={newTask.priority} onValueChange={v => setNewTask({...newTask, priority: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Due Date</Label><Input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} /></div>
                  </div>
                  <Button onClick={addTask} className="w-full rounded-full">Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tasks.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">No tasks yet.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {tasks.map((t) => {
                const statusInfo = TASK_STATUS.find(s => s.value === t.status) || TASK_STATUS[0];
                const StatusIcon = statusInfo.icon;
                const priorityColors: Record<string, string> = {
                  low: "bg-muted text-muted-foreground",
                  medium: "bg-soft-blue text-foreground",
                  high: "bg-warm-peach text-foreground",
                  urgent: "bg-destructive/10 text-destructive",
                };
                return (
                  <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-glass-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <p className="font-semibold text-sm truncate">{t.title}</p>
                        </div>
                        {t.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.description}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge className={`${priorityColors[t.priority] || ""} text-[10px] border-none`}>{t.priority}</Badge>
                          <Badge variant="outline" className="text-[10px]">{getMemberName(t.assigned_to)}</Badge>
                          {t.due_date && (
                            <Badge variant="outline" className="text-[10px]">
                              Due: {new Date(t.due_date).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Select value={t.status} onValueChange={v => updateTaskStatus(t.id, v)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => deleteTask(t.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-4">
          <h3 className="text-lg font-bold">Team Performance</h3>
          {members.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">Add team members to see performance.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {members.map(m => {
                const memberTasks = tasks.filter(t => t.assigned_to === m.id);
                const completed = memberTasks.filter(t => t.status === "completed").length;
                const pending = memberTasks.filter(t => t.status === "pending").length;
                const inProg = memberTasks.filter(t => t.status === "in_progress").length;
                const rate = memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0;
                const roleInfo = getRoleInfo(m.role);

                return (
                  <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-glass-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.name}</p>
                        <Badge className={`${roleInfo.color} text-[10px] border-none`}>{roleInfo.label}</Badge>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xl font-bold text-primary">{rate}%</p>
                        <p className="text-[10px] text-muted-foreground">Completion</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-soft-green/50">
                        <p className="text-sm font-bold text-success">{completed}</p>
                        <p className="text-[10px] text-muted-foreground">Done</p>
                      </div>
                      <div className="p-2 rounded-lg bg-soft-blue/50">
                        <p className="text-sm font-bold text-info">{inProg}</p>
                        <p className="text-[10px] text-muted-foreground">Active</p>
                      </div>
                      <div className="p-2 rounded-lg bg-warm-peach/50">
                        <p className="text-sm font-bold text-warning">{pending}</p>
                        <p className="text-[10px] text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTeamManagement;
