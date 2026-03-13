import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle, Clock, Monitor } from "lucide-react";
import { format } from "date-fns";

const AdminOnlineAttendance = () => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newSlot, setNewSlot] = useState("6pm-9pm");
  const [newTiming, setNewTiming] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("admin-online-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_online_attendance_prompts" }, fetchPrompts)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_attendance" }, fetchAttendance)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = () => { fetchPrompts(); fetchAttendance(); fetchUsers(); };
  const fetchPrompts = async () => {
    const { data } = await supabase.from("workshop_online_attendance_prompts" as any).select("*").order("session_date", { ascending: false });
    if (data) setPrompts(data as any[]);
  };
  const fetchAttendance = async () => {
    const { data } = await supabase.from("workshop_attendance" as any).select("*").eq("status", "present");
    if (data) setAttendance(data as any[]);
  };
  const fetchUsers = async () => {
    const { data } = await supabase.from("workshop_users" as any).select("id, name, roll_number, slot, email").eq("is_enabled", true);
    if (data) setUsers(data as any[]);
  };

  const createPrompt = async () => {
    if (!newDate) return;
    await supabase.from("workshop_online_attendance_prompts" as any).insert({
      session_date: newDate,
      slot: newSlot,
      timing: newTiming || newSlot,
      is_active: false,
    } as any);
    toast({ title: "Prompt created! Activate it to show to users." });
    setShowAdd(false);
    setNewTiming("");
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from("workshop_online_attendance_prompts" as any).update({ is_active: !isActive } as any).eq("id", id);
    toast({ title: isActive ? "Prompt deactivated" : "Prompt activated! Users will see attendance popup." });
  };

  const deletePrompt = async (id: string) => {
    await supabase.from("workshop_online_attendance_prompts" as any).delete().eq("id", id);
    toast({ title: "Prompt deleted" });
  };

  const dateAttendance = attendance.filter(a => a.session_date === selectedDate);
  const attendedUserIds = new Set(dateAttendance.map((a: any) => a.user_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Online Attendance</h2>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create Prompt
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-body">Date</Label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-body">Slot</Label>
                <Select value={newSlot} onValueChange={setNewSlot}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12pm-3pm">12 PM - 3 PM</SelectItem>
                    <SelectItem value="3pm-6pm">3 PM - 6 PM</SelectItem>
                    <SelectItem value="6pm-9pm">6 PM - 9 PM</SelectItem>
                    <SelectItem value="all">All Slots</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-body">Display Timing</Label>
                <Input value={newTiming} onChange={e => setNewTiming(e.target.value)} placeholder="e.g. 6:00 PM - 9:00 PM" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createPrompt}>Create</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts List */}
      <div className="space-y-2">
        <h3 className="text-sm font-body font-semibold">Attendance Prompts</h3>
        {prompts.length === 0 && <p className="text-sm text-muted-foreground">No prompts created yet</p>}
        {prompts.map((p: any) => (
          <Card key={p.id} className="border">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-body font-semibold">
                    {new Date(p.session_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.timing || p.slot} · Slot: {p.slot}</p>
                </div>
                <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">
                  {p.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                <Button variant="ghost" size="icon" onClick={() => deletePrompt(p.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance View */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-body font-semibold">Online Attendance Records</h3>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44 text-sm" />
        </div>
        <div className="grid gap-2">
          {users.map((u: any) => {
            const isPresent = attendedUserIds.has(u.id);
            return (
              <div key={u.id} className={`flex items-center justify-between py-2 px-3 rounded-lg border text-sm ${isPresent ? "bg-primary/10 border-primary/30" : "bg-card border-border"}`}>
                <div className="flex items-center gap-2">
                  {isPresent ? <CheckCircle className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                  <span className="font-body font-medium">{u.name}</span>
                  {u.roll_number && <span className="text-xs text-muted-foreground">#{u.roll_number}</span>}
                  {u.slot && <Badge variant="outline" className="text-[9px]">{u.slot}</Badge>}
                </div>
                <Badge variant={isPresent ? "default" : "secondary"} className="text-[10px]">
                  {isPresent ? "Present" : "Absent"}
                </Badge>
              </div>
            );
          })}
          {users.length === 0 && <p className="text-sm text-muted-foreground">No users found</p>}
        </div>
        <p className="text-xs text-muted-foreground">
          {dateAttendance.length} / {users.length} students marked present for {selectedDate}
        </p>
      </div>
    </div>
  );
};

export default AdminOnlineAttendance;
